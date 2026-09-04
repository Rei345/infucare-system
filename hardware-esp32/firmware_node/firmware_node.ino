#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "HX711.h"
#include <HardwareSerial.h>
#include <DFRobotDFPlayerMini.h>
#include <SPI.h>
#include <LoRa.h>
#include <ESP32Servo.h>
#include <Preferences.h> 

// ================= 1. DEFINISI PIN & KOMPONEN =================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

#define LOADCELL_DOUT_PIN 32
#define LOADCELL_SCK_PIN 33
HX711 scale;
float calibration_factor = -377.0; 

#define S2 25 
#define S3 26
#define SENSOR_OUT 27

#define BATT_PIN 34
#define DROP_SENSOR_PIN 35 

HardwareSerial mySoftwareSerial(2); 
DFRobotDFPlayerMini myDFPlayer;

#define LORA_SCK 18
#define LORA_MISO 19
#define LORA_MOSI 23
#define LORA_SS 5
#define LORA_RST 14
#define LORA_DIO0 2

#define SERVO_PIN 15
Servo infusServo;

// ================= 2. VARIABEL GLOBAL =================
String deviceSN = "ESP32-INF-001";

Preferences preferences;
int batasAlarmCairan = 20; 
int batasKunciServo = 10;
int volumeSpeaker = 20;       
bool autoStopBlood = true;    
bool autoStopEmpty = true;    
int batasSensorDarah = 515; 

unsigned long timerKirim = 0;
int persentaseBaterai = -1; 
String statusAktuator = "TERBUKA"; 

volatile int dropCount = 0;       
int dropArray[6] = {0, 0, 0, 0, 0, 0};  
int windowIndex = 0;
int activeWindows = 0;
unsigned long tpmTimer = 0;
int currentTPM = 0;
int targetTPM = 0; 

float beratTotalAwal = 0.0;
float beratBotolKosong = 0.0;
bool sesiInfusDimulai = false; 
float beratCairan = 0.0;
int persenCairan = 0;

bool alarmDarahAktif = false;
bool alarmHabisAktif = false;
bool alarmBateraiAktif = false;

int sudutServoAktual = 0; 
unsigned long timerKalibrasi = 0;
unsigned long timerSensorBerat = 0;
unsigned long timerSensorBaterai = 0;
bool menungguBotol = false;
unsigned long waktuTungguBotol = 0;

bool muteSensorDarah = false;
unsigned long timerMuteDarah = 0;
const unsigned long DURASI_MUTE = 20000;
int greenFrequency = 0;

String pesanMasuk = "";
bool adaPesanBaru = false;

// ================= 3. FUNGSI INTERRUPT & PERHITUNGAN =================
void IRAM_ATTR dropDetected() {
  static unsigned long lastInterruptTime = 0;
  unsigned long interruptTime = millis();
  if (interruptTime - lastInterruptTime > 320) { 
    dropCount++;
    lastInterruptTime = interruptTime;
  }
}

int hitungPersentaseNatural(float tegangan) {
  int persen = 0;
  if (tegangan >= 4.0) persen = 90 + ((tegangan - 4.0) / (4.2 - 4.0) * 10);
  else if (tegangan >= 3.7) persen = 50 + ((tegangan - 3.7) / (4.0 - 3.7) * 40);
  else if (tegangan >= 3.5) persen = 15 + ((tegangan - 3.5) / (3.7 - 3.5) * 35);
  else persen = 0 + ((tegangan - 3.3) / (3.5 - 3.3) * 15);

  if (persen > 100) persen = 100;
  if (persen < 0) persen = 0;
  return persen;
}

float getTeganganBaterai() {
  long totalADC = 0;
  for (int i = 0; i < 10; i++) {
    totalADC += analogRead(BATT_PIN);
    delayMicroseconds(50);
  }
  return (((float)totalADC / 10.0) / 4095.0) * 3.3 * 2.0; 
}

void onReceiveCallback(int packetSize) {
  if (packetSize == 0) return;
  
  pesanMasuk = "";
  while (LoRa.available()) {
    pesanMasuk += (char)LoRa.read();
  }
  adaPesanBaru = true;
}

// ================= 4. FUNGSI KENDALI MEKANIK & SENSOR =================
void kunciSelang() {
  if (statusAktuator == "MENGUNCI") return; 
  
  sudutServoAktual = 95; 
  int sudutFisik = 180 - sudutServoAktual; 
  
  infusServo.write(sudutFisik);
  statusAktuator = "MENGUNCI";
  Serial.printf("[SYSTEM] Servo Menekuk Selang (Tertutup). Logis: %d | Fisik: %d\n", sudutServoAktual, sudutFisik);
}

void bukaSelang() {
  if (statusAktuator == "TERBUKA") return;
  
  sudutServoAktual = 0; 
  int sudutFisik = 180 - sudutServoAktual; 
  
  infusServo.write(sudutFisik);
  statusAktuator = "TERBUKA";
  Serial.printf("[SYSTEM] Servo Membuka Selang (Lurus). Logis: %d | Fisik: %d\n", sudutServoAktual, sudutFisik);
}

void inisialisasiBotolBaru() {
  beratTotalAwal = scale.get_units(10); 
  beratBotolKosong = beratTotalAwal - 465.0; 
  if (beratBotolKosong < 0) beratBotolKosong = 0;
  
  sesiInfusDimulai = true;
  alarmHabisAktif = false; 
  
  dropCount = 0;
  for(int i = 0; i < 6; i++) dropArray[i] = 0;
  windowIndex = 0;
  activeWindows = 0;
  currentTPM = 0;
  tpmTimer = millis();
  
  bukaSelang();
  Serial.println("[SYSTEM] Botol Baru Terdeteksi. Sesi Infus Otomatis Dimulai!");
}

int bacaWarnaStabil(int statusS2, int statusS3) {
  digitalWrite(S2, statusS2);
  digitalWrite(S3, statusS3);
  delay(10); 
  
  long totalFrekuensi = 0;
  int jumlahValid = 0;
  
  for (int i = 0; i < 15; i++) {
    int freq = pulseIn(SENSOR_OUT, LOW, 20000);
    if (freq > 0) {
      totalFrekuensi += freq;
      jumlahValid++;
    }
  }
  
  if (jumlahValid > 0) return totalFrekuensi / jumlahValid;
  return 0;
}

// ================= 5. SETUP =================
void setup() {
  Serial.begin(115200);

  preferences.begin("infucare", false);
  volumeSpeaker    = preferences.getInt("vol_spk", 20);
  autoStopBlood    = preferences.getBool("auto_blood", true);
  autoStopEmpty    = preferences.getBool("auto_empty", true);
  batasAlarmCairan = preferences.getInt("alarm_pct", 20);
  batasKunciServo  = preferences.getInt("kunci_pct", 10);
  batasSensorDarah = preferences.getInt("blood_th", 515);

  Serial.printf("\n[SYSTEM] Memori Dimuat: Alarm %d%% | Kunci %d%% | Darah %d Hz\n", batasAlarmCairan, batasKunciServo, batasSensorDarah);

  Wire.begin(21, 22);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setCursor(0, 10);
  display.println("Sistem Infus Aktif");
  display.display();
  
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  LoRa.begin(433E6);
  LoRa.onReceive(onReceiveCallback);
  LoRa.receive();
  LoRa.enableCrc(); 

  mySoftwareSerial.begin(9600, SERIAL_8N1, 16, 17);
  if (myDFPlayer.begin(mySoftwareSerial)) {
    myDFPlayer.volume(volumeSpeaker);
    myDFPlayer.play(1); 
  }

  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(calibration_factor);
  long savedOffset = preferences.getLong("hx_offset", 0);
  if (savedOffset == 0) {
    scale.tare(); 
    preferences.putLong("hx_offset", scale.get_offset());
    Serial.println("[SYSTEM] Kalibrasi Nol (TARE) awal disimpan ke memori!");
  } else {
    scale.set_offset(savedOffset);
    Serial.println("[SYSTEM] Titik Nol (TARE) berhasil dimuat dari memori!");
  } 
  
  pinMode(S2, OUTPUT);
  pinMode(S3, OUTPUT);
  pinMode(SENSOR_OUT, INPUT);

  pinMode(DROP_SENSOR_PIN, INPUT);
  attachInterrupt(digitalPinToInterrupt(DROP_SENSOR_PIN), dropDetected, FALLING);

  infusServo.setPeriodHertz(50); 
  infusServo.attach(SERVO_PIN, 500, 2400); 
  bukaSelang(); 
}

// ================= 6. LOOP UTAMA =================
void loop() {
  // --- A. BACA SENSOR BERAT ---
  if (millis() - timerSensorBerat > 2000) {
    float beratKasar = scale.get_units(10); 
    
    if (!sesiInfusDimulai && !menungguBotol && beratKasar > 100.0) { 
        menungguBotol = true;
        waktuTungguBotol = millis(); 
    }

    if (menungguBotol && (millis() - waktuTungguBotol > 3000)) {
        inisialisasiBotolBaru();
        menungguBotol = false;
    }

    if (beratKasar < 20.0) { 
        sesiInfusDimulai = false; 
        persenCairan = 0;
        beratCairan = 0.0;
        alarmHabisAktif = false;
    } else {
        beratCairan = beratKasar - beratBotolKosong;
        if (beratCairan < 0) beratCairan = 0.0;
        if (beratCairan > 500.0) beratCairan = 500.0; 
        persenCairan = (int)((beratCairan / 500.0) * 100);
    }
    timerSensorBerat = millis();
  }

  // --- B. DETEKSI SENSOR WARNA ---
  if (muteSensorDarah) {
    if (millis() - timerMuteDarah > DURASI_MUTE) {
      muteSensorDarah = false; 
      Serial.println("[INFO] Waktu Flushing Selesai. Sensor Darah AKTIF.");
    } else {
      static unsigned long timerInfoMute = 0;
      if (millis() - timerInfoMute > 2000) {
        int sisaDetik = (DURASI_MUTE - (millis() - timerMuteDarah)) / 1000;
        Serial.printf("[COOLDOWN] Proses bilas. Aktif dlm %d s...\n", sisaDetik);
        timerInfoMute = millis();
      }
    }
  }

  static unsigned long timerSensorWarna = 0;
  if (sesiInfusDimulai && !muteSensorDarah && (millis() - timerSensorWarna > 500)) {
    
    greenFrequency = bacaWarnaStabil(HIGH, HIGH);
    static int konfirmasiDarah = 0;

    if (greenFrequency >= batasSensorDarah) {
      konfirmasiDarah++;
      Serial.printf("[DEBUG DARAH] %d Hz >= %d Hz! Cek: %d/3\n", greenFrequency, batasSensorDarah, konfirmasiDarah);
      
      if (konfirmasiDarah >= 3) {
        if (!alarmDarahAktif) { 
          myDFPlayer.play(3); 
          if (autoStopBlood) kunciSelang(); 
          
          LoRa.beginPacket();
          LoRa.print(deviceSN + ",EMERGENCY_BLOOD,1"); 
          LoRa.endPacket();
          LoRa.receive(); 
          
          alarmDarahAktif = true; 
          Serial.println("[ALARM] Valid! Audio, Servo, & Paket LoRa Dikirim.");
        }
      }
    } else {
      if (konfirmasiDarah > 0) {
         Serial.println("[DEBUG DARAH] Cairan Kembali Bening. Reset.");
      }
      konfirmasiDarah = 0; 
      alarmDarahAktif = false; 
      
      static unsigned long timerMonitorSensor = 0;
      if (millis() - timerMonitorSensor > 3000) {
        Serial.printf("[INFO SENSOR] Aman. %d Hz (Batas: %d Hz)\n", greenFrequency, batasSensorDarah);
        timerMonitorSensor = millis();
      }
    }
    
    timerSensorWarna = millis();
  }

  // --- C. BACA BATERAI (Setiap 3 Detik) ---
  if (millis() - timerSensorBaterai > 3000) {
    float vBat = getTeganganBaterai();
    int persenSekarang = hitungPersentaseNatural(vBat);
    if (persentaseBaterai == -1) persentaseBaterai = persenSekarang;
    if (persenSekarang < persentaseBaterai) persentaseBaterai = persenSekarang; 
    else if (persenSekarang > persentaseBaterai + 5) persentaseBaterai = persenSekarang; 

    if (persentaseBaterai <= 15 && persentaseBaterai > 0) {
      if (!alarmBateraiAktif) {
        myDFPlayer.play(5); 
        alarmBateraiAktif = true;
      }
    } else if (persentaseBaterai > 20) {
      alarmBateraiAktif = false; 
    }
    timerSensorBaterai = millis();
  }

  // --- D. LOGIKA WINDOWING TPM (Setiap 5 Detik) ---
  if (millis() - tpmTimer > 5000) {
    dropArray[windowIndex] = dropCount; 
    dropCount = 0;                                     
    windowIndex = (windowIndex + 1) % 6; 
    
    if (sesiInfusDimulai) {
        if (activeWindows < 6) activeWindows++;
    } else {
        activeWindows = 0;
        currentTPM = 0;
    }

    if (activeWindows > 0) {
        int totalDrops = 0;
        for (int i = 0; i < 6; i++) {
            totalDrops += dropArray[i];
        }

        if (activeWindows == 1)      currentTPM = totalDrops * 12;      
        else if (activeWindows == 2) currentTPM = totalDrops * 6;     
        else if (activeWindows == 3) currentTPM = totalDrops * 4;       
        else if (activeWindows == 4) currentTPM = totalDrops * 3;       
        else if (activeWindows == 5) currentTPM = (totalDrops * 60) / 25; 
        else                         currentTPM = totalDrops * 2;      
    }

    tpmTimer = millis();
  }

  // --- E. UPDATE TAMPILAN OLED ---
  display.clearDisplay();
  display.setCursor(0, 0);  display.printf("Baterai : %d %%\n", persentaseBaterai);
  display.setCursor(0, 15); display.printf("Vol Sisa: %d%% (%d ML)\n", persenCairan, (int)beratCairan);
  display.setCursor(0, 30); display.printf("TPM     : %d Tetes/Mnt\n", currentTPM);
  display.setCursor(0, 45); display.printf("Status  : %s\n", statusAktuator.c_str());
  display.display();

  // --- F. TERIMA PERINTAH DARI SERVER/WEB (DOWNLINK) ---
  if (adaPesanBaru) {
    String command = pesanMasuk; 
    adaPesanBaru = false;     
    
    command.trim();
    
    static String lastCommand = "";
    static unsigned long lastCommandTime = 0;

    if (command == lastCommand && (millis() - lastCommandTime < 2500)) {
       Serial.println("[LORA RX] Perintah redundan (spam) diabaikan: " + command);
    } else {
      lastCommand = command;
      lastCommandTime = millis();

      Serial.println("\n[LORA RX] Pesan Masuk (Via Interrupt): " + command);
      timerKirim = millis(); 
      
      if (command == "SERVO_LOCK") {
        kunciSelang();
        myDFPlayer.play(4);
      } 
      else if (command == "SERVO_UNLOCK") {
        bukaSelang();
        muteSensorDarah = true; 
        timerMuteDarah = millis();
        alarmDarahAktif = false;
      } 
      else if (command == "TARE_RESET") {
        inisialisasiBotolBaru();
      } 
      else if (command == "END_SESSION") {
        bukaSelang();
        sesiInfusDimulai = false;
        targetTPM = 0; 
        Serial.println("[SYSTEM] Sesi Diakhiri Jarak Jauh. Selang Dibuka.");
      }
      else if (command.startsWith("CFG:")) {
        int firstColon = command.indexOf(':');
        int secondColon = command.indexOf(':', firstColon + 1);
        if (firstColon != -1 && secondColon != -1) {
          batasAlarmCairan = command.substring(firstColon + 1, secondColon).toInt();
          batasKunciServo = command.substring(secondColon + 1).toInt();
          preferences.putInt("alarm_pct", batasAlarmCairan);
          preferences.putInt("kunci_pct", batasKunciServo);
          Serial.printf("[MEMORI] Konfigurasi Disimpan! Alarm: %d%%, Kunci: %d%%\n", batasAlarmCairan, batasKunciServo);
        }
      }
      else if (command.startsWith("SET_VOL:")) {
        int volBaru = command.substring(8).toInt();
        if (volBaru >= 0 && volBaru <= 30) { 
          volumeSpeaker = volBaru;
          myDFPlayer.volume(volumeSpeaker);
          preferences.putInt("vol_spk", volumeSpeaker);
          Serial.println("[MEMORI] Volume DFPlayer Diperbarui: " + String(volBaru));
        }
      } 
      else if (command.startsWith("SET_AUTO_BLOOD:")) {
        autoStopBlood = (command.substring(15).toInt() == 1);
        preferences.putBool("auto_blood", autoStopBlood);
      } 
      else if (command.startsWith("SET_AUTO_EMPTY:")) {
        autoStopEmpty = (command.substring(15).toInt() == 1);
        preferences.putBool("auto_empty", autoStopEmpty);
      } 
      else if (command.startsWith("SET_TARGET_TPM:")) {
        targetTPM = command.substring(15).toInt();
      }
      else if (command.startsWith("SET_BLOOD_TH:")) {
        String valueStr = command.substring(13); 
        batasSensorDarah = valueStr.toInt();
        preferences.putInt("blood_th", batasSensorDarah);
        Serial.printf("[MEMORI] Kalibrasi Darah Disimpan Lokal: %d Hz\n", batasSensorDarah);
      }
    }
    
    LoRa.receive(); 
  }

  // --- G. AUTO-CORRECTION TPM ---
  if (targetTPM > 0 && sesiInfusDimulai && statusAktuator != "MENGUNCI") {    
    if (millis() - timerKalibrasi > 6000) { 
      int errorTPM = targetTPM - currentTPM; 
      
      int toleransi = 3; 
      if (targetTPM >= 40) toleransi = 4;
      if (abs(errorTPM) > toleransi) { 
        
        int langkahDerajat = 1; 
        if (abs(errorTPM) >= 25) langkahDerajat = 3;
        else if (abs(errorTPM) >= 12) langkahDerajat = 2;

        if (errorTPM > 0) sudutServoAktual -= langkahDerajat; 
        else sudutServoAktual += langkahDerajat; 

        if (sudutServoAktual < 0) sudutServoAktual = 0;
        if (sudutServoAktual > 95) sudutServoAktual = 95;

        int sudutFisik = 180 - sudutServoAktual; 
        infusServo.write(sudutFisik);
      }
      timerKalibrasi = millis(); 
    }
  }

  // --- H. FAILSAFE LOKAL (PENGAMAN SAAT OFFLINE) ---
  if (sesiInfusDimulai && statusAktuator != "MENGUNCI") {
    
    if (autoStopEmpty && persenCairan <= batasKunciServo) {
      kunciSelang();
      myDFPlayer.play(4); 
    }
    else if (persenCairan <= batasAlarmCairan) {
      if (!alarmHabisAktif) {
        myDFPlayer.play(2);
        alarmHabisAktif = true;
        
        LoRa.beginPacket();
        LoRa.print(deviceSN + ",WARNING_EMPTY,1");
        LoRa.endPacket();
        LoRa.receive();
      }
    }
    else if (persenCairan > batasAlarmCairan + 5) {
      alarmHabisAktif = false;
    }
  }

  // --- I. KIRIM UPLINK KE GATEWAY --- 
  if (millis() - timerKirim > 5000) { 
    float suhuNode = temperatureRead();
    int statusSesiKirim = (sesiInfusDimulai && statusAktuator != "MENGUNCI") ? 1 : 0;
    float beratKasar = scale.get_units(10);
    String payload = deviceSN + "," + 
                     String(beratKasar, 1) + "," + 
                     String(currentTPM) + "," + 
                     String(greenFrequency) + "," + 
                     String(persentaseBaterai) + "," + 
                     String(suhuNode, 1) + "," +
                     String(statusSesiKirim);
                     
    LoRa.beginPacket();
    LoRa.print(payload);
    LoRa.endPacket();
    LoRa.receive();
    
    timerKirim = millis();
  }
}