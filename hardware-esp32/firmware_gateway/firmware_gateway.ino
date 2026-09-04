#include <WiFi.h>
#include <PubSubClient.h>
#include <LoRa.h>
#include <SPI.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ================= 1. KONFIGURASI JARINGAN =================
const char* ssid        = "YOUR_WIFI_SSID";
const char* password    = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "YOUR_MQTT_BROKER_IP";
const int mqtt_port     = 1883;
const char* mqtt_user   = "YOUR_MQTT_USER";
const char* mqtt_password = "YOUR_MQTT_PASSWORD";

// ================= 2. DEFINISI PIN & PERANGKAT =================
#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_SS 5
#define LORA_RST 14
#define LORA_DIO0 2

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

#define BUZZER_PIN 25

// ================= 3. INISIALISASI OBJEK & VARIABEL GLOBAL =================
WiFiClient espClient;
PubSubClient mqttClient(espClient);

int gatewayAlarmLevel = 0;
bool buzzerMuted      = false; 
unsigned long buzzerTimer = 0;
bool buzzerState      = false;
unsigned long alarmStartTime = 0;

const int MAX_NODES = 10;
String activeSNs[MAX_NODES];
unsigned long lastSeen[MAX_NODES];
int totalActiveNodes = 0;

unsigned long lastOledUpdate = 0;
unsigned long lastPacketRx   = 0;

// ================= 4. FUNGSI PEMBANTU =================
String getValue(String data, char separator, int index) {
  int found = 0;
  int strIndex[] = {0, -1};
  int maxIndex = data.length() - 1;
  for (int i = 0; i <= maxIndex && found <= index; i++) {
    if (data.charAt(i) == separator || i == maxIndex) {
      found++;
      strIndex[0] = strIndex[1] + 1;
      strIndex[1] = (i == maxIndex) ? i + 1 : i;
    }
  }
  return found > index ? data.substring(strIndex[0], strIndex[1]) : "";
}

void updateActiveNodesCounter(String sn) {
  bool found = false;
  for (int i = 0; i < MAX_NODES; i++) {
    if (activeSNs[i] == sn) {
      lastSeen[i] = millis(); 
      found = true;
      break;
    }
  }

  if (!found) {
    for (int i = 0; i < MAX_NODES; i++) {
      if (activeSNs[i] == "") {
        activeSNs[i] = sn;
        lastSeen[i] = millis();
        break;
      }
    }
  }
}

void checkNodeTimeouts() {
  int count = 0;
  unsigned long currentMillis = millis();
  
  for (int i = 0; i < MAX_NODES; i++) {
    if (activeSNs[i] != "") {
      if (currentMillis - lastSeen[i] > 30000) {
        Serial.println("[TIMEOUT] Node " + activeSNs[i] + " kehilangan koneksi LoRa (Offline)!");

        StaticJsonDocument<128> doc;
        doc["device_sn"] = activeSNs[i];
        doc["status"] = "DEVICE_OFFLINE";
        char buffer[128];
        serializeJson(doc, buffer);
        
        String emergencyTopic = "infucare/emergency/" + activeSNs[i];
        mqttClient.publish(emergencyTopic.c_str(), buffer);

        activeSNs[i] = "";
      } else {
        count++;
      }
    }
  }
  totalActiveNodes = count;
}

// ================= 5. KONEKSI & CALLBACK MQTT =================
void setup_wifi() {
  Serial.println();
  Serial.print("[WIFI] Mencari jaringan: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print("."); 
  }
  
  Serial.println("\n[WIFI] BERHASIL TERSAMBUNG!");
  Serial.print("[WIFI] Alamat IP: ");
  Serial.println(WiFi.localIP());
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String incomingMsg;
  for (int i = 0; i < length; i++) {
    incomingMsg += (char)payload[i];
  }
  String topicStr = String(topic);

  // A. KONTROL GATEWAY LOKAL
  if (topicStr == "infucare/gateway/control") {
    if (incomingMsg == "MUTE_BUZZER") {
      buzzerMuted = true;
      digitalWrite(BUZZER_PIN, LOW); 
    } else if (incomingMsg == "UNMUTE_BUZZER") {
      buzzerMuted = false;
    } else if (incomingMsg == "ALARM_ON") {
      gatewayAlarmLevel = 2; 
      alarmStartTime = millis(); 
    } else if (incomingMsg == "ALARM_OFF") {
      gatewayAlarmLevel = 0; 
      digitalWrite(BUZZER_PIN, LOW); 
    }
  }
  // B. KONTROL ALAT PASIEN, Teruskan via LoRa
  else if (topicStr.startsWith("infucare/command/")) {
    LoRa.beginPacket();
    LoRa.print(incomingMsg);
    LoRa.endPacket();
    Serial.printf("[GTW TX] Forward Perintah Web ke Node: %s\n", incomingMsg.c_str());
  }
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Menghubungkan ke broker...");
    String clientId = "InfuCare_Gateway_" + String(random(0xffff), HEX);

    String willTopic = "infucare/gateway/status";
    String willMessage = "{\"gateway_id\":\"" + clientId + "\", \"status\":\"OFFLINE\"}";

    if (mqttClient.connect(clientId.c_str(), mqtt_user, mqtt_password, willTopic.c_str(), 1, false, willMessage.c_str())) {
      Serial.println(" BERHASIL!");
      
      mqttClient.publish("infucare/gateway/status", "{\"status\":\"ONLINE\"}");

      mqttClient.subscribe("infucare/command/+");
      mqttClient.subscribe("infucare/gateway/control");
    } else {
      Serial.print(" GAGAL, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" Coba lagi dalam 3 detik.");
      delay(3000);
    }
  }
}

// ================= 6. SETUP =================
void setup() {
  Serial.begin(115200);

  Serial.println("\n\n===============================");
  Serial.println("[SYSTEM] Booting Gateway Dimulai!");
  Serial.println("===============================\n");

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(21, 22);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setCursor(0, 20);
  display.println("Booting Gateway...");
  display.display();

  setup_wifi();
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(mqttCallback);

  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  if (!LoRa.begin(433E6)) {
    display.clearDisplay();
    display.setCursor(0, 20);
    display.println("ERROR: LoRa GAGAL!");
    display.display();
    while (1);
  }
  LoRa.enableCrc();
  
  digitalWrite(BUZZER_PIN, HIGH);
  delay(100);
  digitalWrite(BUZZER_PIN, LOW);
}

// ================= 7. LOOP UTAMA =================
void loop() {
  if (WiFi.status() != WL_CONNECTED) setup_wifi();
  if (!mqttClient.connected()) reconnectMQTT();
  mqttClient.loop();

  // --- A. BACA PAKET LORA MASUK DARI NODE ---
  int packetSize = LoRa.parsePacket();
  if (packetSize) {
    lastPacketRx = millis(); 
    String incomingCSV = "";
    while (LoRa.available()) {
      incomingCSV += (char)LoRa.read();
    }
    int rssi = LoRa.packetRssi(); 

    // 1. INTERSEPSI PAKET DARURAT DARAH (KRITIS)
    if (incomingCSV.indexOf("EMERGENCY_BLOOD") >= 0) {
      String sn = getValue(incomingCSV, ',', 0);
      Serial.println("[BAHAYA] Menerima Paket Darurat Darah: " + sn);
      
      gatewayAlarmLevel = 2; 
      alarmStartTime = millis(); 
      
      StaticJsonDocument<128> emgDoc;
      emgDoc["device_sn"] = sn;
      emgDoc["status"] = "EMERGENCY_BLOOD";
      char emgBuffer[128];
      serializeJson(emgDoc, emgBuffer);
      mqttClient.publish(("infucare/emergency/" + sn).c_str(), emgBuffer);
      return;
    }
    
    // 1B. INTERSEPSI PAKET CAIRAN MENIPIS (WARNING)
    if (incomingCSV.indexOf("WARNING_EMPTY") >= 0) {
      String sn = getValue(incomingCSV, ',', 0);
      Serial.println("[PERHATIAN] Cairan menipis pada Node: " + sn);
      
      if (gatewayAlarmLevel < 2) {
        gatewayAlarmLevel = 1; 
        alarmStartTime = millis();
      }
      return; 
    }

    String sn      = getValue(incomingCSV, ',', 0);
    float berat    = getValue(incomingCSV, ',', 1).toFloat();
    int tpm        = getValue(incomingCSV, ',', 2).toInt();
    int greenFreq  = getValue(incomingCSV, ',', 3).toInt(); 
    int baterai    = getValue(incomingCSV, ',', 4).toInt();
    float suhuNode = getValue(incomingCSV, ',', 5).toFloat();
    int sesiAktif  = getValue(incomingCSV, ',', 6).toInt();

    if (sn.length() > 0) {
      updateActiveNodesCounter(sn);

      StaticJsonDocument<256> doc;
      doc["device_sn"]       = sn;
      doc["weight_gram"]     = berat;
      doc["tpm"]             = tpm;
      doc["blood_raw_value"] = greenFreq; 
      doc["battery_pct"]     = baterai;
      doc["signal_dbm"]      = rssi;
      doc["internal_temp"]   = suhuNode; 
      doc["session_active"]  = (sesiAktif == 1);                 
      doc["uptime_seconds"]  = millis() / 1000;

      char jsonBuffer[256];
      serializeJson(doc, jsonBuffer);
      String topic = "infucare/telemetry/" + sn;
      mqttClient.publish(topic.c_str(), jsonBuffer);

      Serial.printf("[GTW RX] Telemetri diteruskan ke Web: %s\n", sn.c_str());
      Serial.println("Data: " + String(jsonBuffer));
    }
  }

  // --- B. PENGECEKAN TIMEOUT LORA (NODE OFFLINE) ---
  checkNodeTimeouts();

  // --- C. MANAJEMEN BUZZER GATEWAY (DUAL-TONE) ---
  if (gatewayAlarmLevel > 0 && !buzzerMuted) {
    
    // NADA LEVEL 2: KRITIS DARAH 
    if (gatewayAlarmLevel == 2) {
      if (millis() - buzzerTimer > 300) { 
        buzzerState = !buzzerState;
        if (buzzerState) tone(BUZZER_PIN, 1200); 
        else tone(BUZZER_PIN, 800);
        buzzerTimer = millis();
      }
    } 
    // NADA LEVEL 1: CAIRAN MENIPIS (Beep Santai)
    else if (gatewayAlarmLevel == 1) {
      if (millis() - buzzerTimer > 1000) { 
        buzzerState = !buzzerState;
        if (buzzerState) tone(BUZZER_PIN, 800);
        else noTone(BUZZER_PIN); 
        buzzerTimer = millis();
      }
    }

    // LOGIKA AUTO-OFF 
    if (millis() - alarmStartTime > 30000) {
      gatewayAlarmLevel = 0;
      noTone(BUZZER_PIN);
      digitalWrite(BUZZER_PIN, LOW);
      Serial.println("[INFO] Alarm Gateway dihentikan otomatis (Timeout).");
    }

  } else {
    noTone(BUZZER_PIN);
    digitalWrite(BUZZER_PIN, LOW); 
  }

  // --- D. UPDATE UI OLED ---
  if (millis() - lastOledUpdate > 1000) {
    lastOledUpdate = millis();
    
    String rxStatus = (millis() - lastPacketRx < 2000) ? "[Rx]" : "    ";
    
    display.clearDisplay();
    display.setCursor(0, 0);  
    display.printf("WiFi: %d dBm %s\n", WiFi.RSSI(), rxStatus.c_str());
    
    display.setCursor(0, 15); 
    display.printf("Svr : %s\n", mqtt_server);
    
    display.setCursor(0, 30); 
    display.printf("Node Aktif: %d / %d\n", totalActiveNodes, MAX_NODES);
    
    display.setCursor(0, 45); 
    String almText = (gatewayAlarmLevel > 0) ? "BAHAYA!" : "AMAN";
    String buzText = buzzerMuted ? "MUTE" : "ON";
    display.printf("Alm : %s (%s)\n", almText.c_str(), buzText.c_str());
    
    display.display();
  }
}