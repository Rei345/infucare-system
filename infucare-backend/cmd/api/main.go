package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"infucare-backend/internal/config"
	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"

	httpdelivery "infucare-backend/internal/delivery/http"
	mqttdelivery "infucare-backend/internal/delivery/mqtt"

	"github.com/joho/godotenv"
	paho "github.com/eclipse/paho.mqtt.golang"
)

func main() {
	// 1. Load Environment Variables
	if err := godotenv.Load(); err != nil {
		log.Println("Peringatan: File .env tidak ditemukan, menggunakan variabel environment sistem.")
	}

	// 2. Setup Koneksi Database
	db, err := config.DatabaseConnection()
	if err != nil {
		log.Fatal("Gagal terhubung ke database: ", err)
	}

	// 3. Auto-Migrate Database Models
	err = db.AutoMigrate(
		&domain.HealthUnit{},
		&domain.User{},
		&domain.Patient{},
		&domain.Device{},
		&domain.DeviceSetting{},
		&domain.FluidProfile{},
		&domain.InfusionSession{},
		&domain.TelemetryData{},
		&domain.ActivityLog{},
		&domain.NotificationConfig{},
	)

	if err != nil {
		log.Fatal("Gagal melakukan migrasi tabel:", err)
	}

	// 4. Jalankan Seeder
	if err := config.SeedDatabase(db); err != nil {
		log.Fatal("Gagal menjalankan seeder default: ", err)
	}

	// 5. Inisialisasi Shared Memori Cache
	deviceCache := make(map[string]domain.DeviceCacheItem)

	// 6. Inisialisasi MQTT Client (Paho)
	mqttOpts := paho.NewClientOptions()
	mqttOpts.AddBroker(fmt.Sprintf("tcp://%s:%s", os.Getenv("MQTT_BROKER"), os.Getenv("MQTT_PORT")))
	mqttOpts.SetClientID(fmt.Sprintf("infucare_backend_%d", time.Now().Unix()))
	mqttOpts.SetUsername(os.Getenv("MQTT_USER"))
	mqttOpts.SetPassword(os.Getenv("MQTT_PASSWORD"))
	mqttOpts.OnConnectionLost = func (c paho.Client, err error)  {
		log.Printf("[MQTT] Koneksi terputus: %v", err)
	}

	mqttClient := paho.NewClient(mqttOpts)
	if token := mqttClient.Connect(); token.Wait() && token.Error() != nil {
		log.Println("[MQTT] Peringatan: Gagal terhubung ke Broker saat startup: ", token.Error())
	} else {
		log.Println("[MQTT] Berhasil terhubung ke Broker IoT")
	}

	// 7. Inisialisasi Usecase
	authUC := usecase.NewAuthUsecase(db)
	dashboardUC := usecase.NewDashboardUsecase(db)
	healthUnitUC := usecase.NewHealthUnitUsecase(db)
	fluidUC := usecase.NewFluidUsecase(db)
	patientUC := usecase.NewPatientUsecase(db)
	trackingUC := usecase.NewTrackingUsecase(db)
	telemetryUC := usecase.NewTelemetryUsecase(db, mqttClient, deviceCache)
	deviceUC := usecase.NewDeviceUsecase(db, mqttClient, deviceCache)
	controlUC := usecase.NewControlUsecase(db, mqttClient)
	notificationUC := usecase.NewNotificationUsecase(db, mqttClient)
	sessionUC := usecase.NewSessionUsecase(db, mqttClient)

	// 8. Inisialisasi MQTT Delivery
	mqttHandler := mqttdelivery.NewMQTTHandler(telemetryUC)
	if mqttClient.IsConnected() {
		topic := os.Getenv("MQTT_TOPIC")
		emergencyTopic := "infucare/emergency/+"

		mqttClient.Subscribe(topic, 1, mqttHandler.MessagePubHandler)
		mqttClient.Subscribe(emergencyTopic, 1, mqttHandler.EmergencyPubHandler)
		log.Printf("[MQTT] Mendengarkan topik: %s", topic)
	}

	// 9. Aktifkan cron job/perbersih log lama
	telemetryUC.StartDataCleanerCron()

	// 10. Inisialisasi HTTP Delivery
	authH := httpdelivery.NewAuthHandler(authUC)
	dashboardH := httpdelivery.NewDashboardHandler(dashboardUC)
	healthUnitH := httpdelivery.NewHealthUnitUsecase(healthUnitUC)
	fluidH := httpdelivery.NewFluidHandler(fluidUC)
	patientH := httpdelivery.NewPatientHandler(patientUC)
	trackingH := httpdelivery.NewTrackingHandler(trackingUC)
	telemetryH := httpdelivery.NewTelemetryHandler(telemetryUC)
	deviceH := httpdelivery.NewDeviceHandler(deviceUC)
	controlH := httpdelivery.NewControlHandler(controlUC)
	notificationH := httpdelivery.NewNotificationHandler(notificationUC)
	sessionH := httpdelivery.NewSessionHandler(sessionUC)

	// 11. Setup Router Gin
	r := httpdelivery.SetupRouter(
		authH, dashboardH, healthUnitH, fluidH, patientH, trackingH,
		telemetryH, deviceH, controlH, notificationH, sessionH,
	)

	// 6. Jalankan Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server InfuCare Siap Menerima Pasien di Port %s", port)
	r.Run(":" + port)
}