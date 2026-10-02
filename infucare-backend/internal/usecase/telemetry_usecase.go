package usecase

import (
	"errors"
	"fmt"
	"log"
	"time"

	"infucare-backend/internal/domain"
	"infucare-backend/pkg/fuzzy"
	"infucare-backend/pkg/whatsapp"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type TelemetryUsecase struct {
	db          *gorm.DB
	mqttClient  mqtt.Client
	deviceCache map[string]domain.DeviceCacheItem
}

func NewTelemetryUsecase(db *gorm.DB, mqttClient mqtt.Client, cache map[string]domain.DeviceCacheItem) *TelemetryUsecase {
	return &TelemetryUsecase{
		db:          db,
		mqttClient:  mqttClient,
		deviceCache: cache,
	}
}

func (u *TelemetryUsecase) ProcessEmergency(deviceSN string, status string) {
	var activeSession domain.InfusionSession
	errSession := u.db.Where("device_sn = ? AND end_at IS NULL", deviceSN).First(&activeSession).Error

	patientName := "Tidak Diketahui"
	var unitID uint

	if errSession == nil {
		var patient domain.Patient
		if u.db.Where("id = ?", activeSession.PatientID).First(&patient).Error == nil  {
			patientName = patient.Name
			unitID = patient.UnitID
		}
	} else {
		var device domain.Device
		if u.db.Where("sn = ?", deviceSN).First(&device).Error == nil && device.UnitID != nil {
			unitID = *device.UnitID
		}
	}
	
	var notifConfig domain.NotificationConfig
	if unitID != 0 {
		u.db.Where("unit_id = ?", unitID).First(&notifConfig)
	}

	if status == "EMERGENCY_BLOOD" {
		log.Printf("[BAHAYA] Terdeteksi Darah Naik pada Node: %s", deviceSN)
		
		if errSession == nil {
			u.db.Create(&domain.ActivityLog{
				SessionID:   activeSession.ID,
				EventType:   "ALERT_BLOOD",
				Description: "Pendeteksian Darah (Backflow). Sensor menyentuh ambang batas kritis. Motor servo berhasil mengunci selang secara lokal.",
				CreatedAt:   time.Now(),
			})
		}
		
		u.db.Model(&domain.Device{}).Where("sn = ?", deviceSN).Update("status", "CRITICAL")
		
		if cache, ok := u.deviceCache[deviceSN]; ok {
			cache.Payload.BloodRawValue = 999 
			u.deviceCache[deviceSN] = cache
		}

		if notifConfig.IsActive && notifConfig.NotifyBlood && notifConfig.TargetID != "" {
			pesanWA := fmt.Sprintf("🚨 *DARURAT MEDIS (DARAH NAIK)* 🚨\n\nPasien *%s* (Kamar/Alat: %s) terdeteksi mengalami backflow darah.\n\nSistem telah membunyikan alarm dan mengunci aliran infus secara otomatis.\nSegera periksa pasien!", patientName, deviceSN)
			go whatsapp.SendWhatsAppAlert(notifConfig.TargetID, pesanWA) 
		}
	}

	if status == "DEVICE_OFFLINE" {
		u.db.Model(&domain.Device{}).Where("sn = ?", deviceSN).Update("status", "OFFLINE")

		if errSession == nil {
			u.db.Create(&domain.ActivityLog{
				SessionID:   activeSession.ID,
				EventType:   "DEVICE_OFFLINE",
				Description: "Perangkat kehilangan sinyal radio LoRa / Offline dari Gateway.",
				CreatedAt:   time.Now(),
			})
		}

		if notifConfig.IsActive && notifConfig.NotifyOffline && notifConfig.TargetID != "" {
			pesanWA := fmt.Sprintf("🔌 *ALAT TERPUTUS (OFFLINE)* 🔌\n\nKoneksi radio LoRa dari alat pasien *%s* (%s) ke Gateway terputus lebih dari 30 detik. Harap periksa apakah alat dimatikan atau kehabisan baterai.", patientName, deviceSN)
			go whatsapp.SendWhatsAppAlert(notifConfig.TargetID, pesanWA)
		}
	}
}

func (u *TelemetryUsecase) ProcessTelemetry(payload domain.TelemetryPayload) {
	cacheItem, exists := u.deviceCache[payload.DeviceSN]
	lastSavedTime := time.Time{}
	lastSavedTPM := 0
	
	if exists {
		lastSavedTime = cacheItem.LastSavedTime
		lastSavedTPM = cacheItem.LastSavedTPM
	}

	u.deviceCache[payload.DeviceSN] = domain.DeviceCacheItem{
		Payload:       payload,
		LastSeen:      time.Now(),
		LastSavedTime: lastSavedTime, 
		LastSavedTPM:  lastSavedTPM, 
	}
	
	u.db.Model(&domain.Device{}).Where("sn = ?", payload.DeviceSN).Update("status", "ONLINE")

	var activeSession domain.InfusionSession
	errSession := u.db.Session(&gorm.Session{Logger: logger.Default.LogMode(logger.Silent)}).
		Preload("Device.DeviceSetting").
		Where("device_sn = ? AND end_at IS NULL", payload.DeviceSN).
		First(&activeSession).Error
		
	if errSession != nil {
		return 
	}

	var patient domain.Patient
	patientName := "Tidak Diketahui"
	if u.db.Where("id = ?", activeSession.PatientID).First(&patient).Error == nil {
		patientName = patient.Name
	}

	var globalConfig domain.NotificationConfig
	if err := u.db.Where("unit_id = ?", patient.UnitID).First(&globalConfig).Error; err != nil {
		u.db.First(&globalConfig) 
	}

	offsetKosong := activeSession.Device.DeviceSetting.LoadcellOffset
	if offsetKosong == 0 {
		offsetKosong = 145.0 
	}
	
	beratBersih := payload.WeightGram - offsetKosong
	if beratBersih < 0 {
		beratBersih = 0
	}

	estimasiMenit := fuzzy.CalculateEstimatedTime(beratBersih, float64(payload.Tpm)) 
	waktuSelesaiFuzzy := time.Now().Add(time.Duration(estimasiMenit) * time.Minute)
	u.db.Model(&activeSession).Update("estimated_end_at", waktuSelesaiFuzzy)

	persenSisaCairan := int((beratBersih / 500.0) * 100)
	if persenSisaCairan < 0 { persenSisaCairan = 0 }
	if persenSisaCairan > 100 { persenSisaCairan = 100 }

	if persenSisaCairan <= globalConfig.LowFluidThresholdPct && persenSisaCairan > globalConfig.AutoStopThresholdPct {
		if globalConfig.IsActive && globalConfig.NotifyLowFluid && globalConfig.TargetID != "" {			
			var recentWarningCount int64
			u.db.Model(&domain.ActivityLog{}).
				Where("session_id = ? AND event_type = ? AND created_at > ?", 
					activeSession.ID, "WARNING_EMPTY", time.Now().Add(-10*time.Minute)).
				Count(&recentWarningCount)

			if recentWarningCount == 0 {
				pesanWA := fmt.Sprintf("⚠️ *PERINGATAN CAIRAN MENIPIS* ⚠️\n\nCairan infus untuk pasien *%s* telah turun menyentuh batas peringatan (*%d%%*)!\n\nMohon bersiap untuk mengganti botol infus pasien.", patientName, globalConfig.LowFluidThresholdPct)
				go whatsapp.SendWhatsAppAlert(globalConfig.TargetID, pesanWA) 
				
				u.db.Create(&domain.ActivityLog{
					SessionID:   activeSession.ID,
					EventType:   "WARNING_EMPTY", 
					Description: fmt.Sprintf("Peringatan cairan menipis. Cairan aktual (%d%%) telah turun melewati batas yang diatur (%d%%).", persenSisaCairan, globalConfig.LowFluidThresholdPct),
					CreatedAt:   time.Now(),
				})
			}
		}
	}

	if activeSession.Device.DeviceSetting.AutoStopEmpty && persenSisaCairan <= globalConfig.AutoStopThresholdPct {
		var recentLogCount int64
		u.db.Model(&domain.ActivityLog{}).
			Where("session_id = ? AND event_type = ? AND created_at > ?", activeSession.ID, "SYSTEM_FAILSAFE", time.Now().Add(-1*time.Minute)).
			Count(&recentLogCount)

		if recentLogCount == 0 {
			perintahKunci := "SERVO_LOCK" 
			topicDownlink := "infucare/command/" + payload.DeviceSN
			
			go func(){
				log.Printf("[FAILSAFE] Cairan menyentuh batas kritis (Sisa %d%%). Mengirim perintah kunci...", persenSisaCairan)
				for i := 0; i < 3; i++ {
					if u.mqttClient != nil && u.mqttClient.IsConnected() {
						u.mqttClient.Publish(topicDownlink, 1, false, perintahKunci)
					}
					time.Sleep(800 * time.Millisecond)
				}
			}()

			u.db.Create(&domain.ActivityLog{
				SessionID:   activeSession.ID,
				EventType:   "SYSTEM_FAILSAFE",
				Description: fmt.Sprintf("Motor servo otomatis mengunci selang. Cairan menyentuh ambang batas kritis %d%%.", globalConfig.AutoStopThresholdPct),
				CreatedAt:   time.Now(),
			})

			if globalConfig.IsActive && globalConfig.TargetID != "" {
				var pesanWA string
				if globalConfig.NotifyEmptyFluid {
					pesanWA += fmt.Sprintf("🚨 *CAIRAN INFUS TERDETEKSI HABIS* 🚨\nSisa cairan infus untuk pasien *%s* telah menyentuh batas kritis (*%d%%*)!\n\n", patientName, globalConfig.AutoStopThresholdPct)
				}
				if globalConfig.NotifyFailsafe {
					pesanWA += "🛡️ *INFO FAILSAFE (AKTIF):*\nMotor servo tiang infus telah otomatis menjepit selang dengan rapat untuk mencegah udara masuk ke vena pasien.\n\nSegera ganti botol infus di kamar!"
				}
				if pesanWA != "" {
					go whatsapp.SendWhatsAppAlert(globalConfig.TargetID, pesanWA)
				}
			}
		}
	}

	if payload.BatteryPct <= 15 && payload.BatteryPct > 0 {
		if globalConfig.IsActive && globalConfig.NotifyLowBattery && globalConfig.TargetID != "" {
			pesanWA := fmt.Sprintf("🔋 *BATERAI ALAT LEMAH* 🔋\n\nDaya baterai pada tiang infus pasien *%s* tersisa kritis (*%d%%*).\nHarap segera sambungkan ke pengisi daya / colokan listrik.", patientName, payload.BatteryPct)
			go whatsapp.SendWhatsAppAlert(globalConfig.TargetID, pesanWA)
		}
	}

	shouldSaveToDB := false
	if !exists || lastSavedTime.IsZero() {
		shouldSaveToDB = true
	} else {
		selisihTPM := payload.Tpm - lastSavedTPM
		if selisihTPM < 0 { selisihTPM = -selisihTPM }
		if time.Since(lastSavedTime) >= 3*time.Minute || selisihTPM >= 5 {
			shouldSaveToDB = true
		}
	}

	if shouldSaveToDB {
		telemetry := domain.TelemetryData{
			SessionID:     activeSession.ID,
			WeightGram:    beratBersih,
			Tpm:           payload.Tpm,
			BloodRawValue: payload.BloodRawValue,
			BatteryPct:    payload.BatteryPct,
			SignalDbm:     payload.SignalDbm,
			InternalTemp:  payload.InternalTemp,
			UptimeSeconds: payload.UptimeSeconds,
			CreatedAt:     time.Now(),
		}

		if err := u.db.Create(&telemetry).Error; err == nil {
			u.deviceCache[payload.DeviceSN] = domain.DeviceCacheItem{
				Payload:       payload,
				LastSeen:      time.Now(),
				LastSavedTime: time.Now(),    
				LastSavedTPM:  payload.Tpm,    
			}
		}
	}
}

func (u *TelemetryUsecase) StartDataCleanerCron() {
	go func() {
		for {
			threshold := time.Now().AddDate(0, 0, -7)
			res := u.db.Where("created_at < ?", threshold).Delete(&domain.TelemetryData{})
			if res.Error == nil && res.RowsAffected > 0 {
				log.Printf("[AUTO-CLEANER] %d baris data telemetri lawas dihapus.\n", res.RowsAffected)
			}
			time.Sleep(24 * time.Hour)
		}
	}()
}

// ProcessHTTPFallback handles telemetry data sent via HTTP and evaluates emergency logic.
func (u *TelemetryUsecase) ProcessHTTPFallback(req domain.TelemetryDataRequest) (string, error) {
	var session domain.InfusionSession
	if err := u.db.Preload("Patient").Where("id = ? AND end_at IS NULL", req.SessionID).First(&session).Error; err != nil {
		return "", errors.New("active session not found")
	}

	telemetry := domain.TelemetryData{
		SessionID: 		req.SessionID,
		WeightGram: 	req.WeightGram,
		Tpm: 			req.Tpm,
		BloodRawValue: 	req.BloodRawValue,
		BatteryPct: 	req.BatteryPct,
		SignalDbm: 		req.SignalDbm,
		InternalTemp: 	req.InternalTemp,
		UptimeSeconds: 	req.UptimeSeconds,
		CreatedAt: 		time.Now(),
	}

	if err := u.db.Create(&telemetry).Error; err != nil {
		return "", err
	}

	commandToHardware := "OK"

	var notifConfig domain.NotificationConfig
	u.db.Where("unit_id = ?", session.Patient.UnitID).First(&notifConfig)

	ambangBatasDarah := notifConfig.BloodSensorThreshold
	if ambangBatasDarah == 0 {
		ambangBatasDarah = 515
	}

	var pesanDarurat string
	var eventType string

	if req.BloodRawValue >= ambangBatasDarah && req.BloodRawValue > 10 {
		if notifConfig.NotifyFailsafe {
			commandToHardware = "SERVO_LOCK"
		}

		if notifConfig.NotifyBlood {
			pesanDarurat = fmt.Sprintf("🚨 *KRITIS: REFLUKS DARAH*\n\nPasien: *%s*\nBed/NIK: %s\n\nDarah terdeteksi naik ke selang infus (Pembacaan: %d Hz)!", session.Patient.Name, session.Patient.RegistrationNo, req.BloodRawValue)
			eventType = "ALERT_BLOOD"
		}
	}

	if pesanDarurat != "" && notifConfig.IsActive && notifConfig.TargetID != "" {
		var lastLog domain.ActivityLog
		errLog := u.db.Where("session_id = ? AND event_type = ? AND created_at > ?",
			session.ID, eventType, time.Now().Add(-5*time.Minute)).
			Order("created_at desc").First(&lastLog).Error

		if errLog != nil {
			go func ()  {
				if errWa := whatsapp.SendWhatsAppAlert(notifConfig.TargetID, pesanDarurat); errWa == nil {
					u.db.Create(&domain.ActivityLog{
						SessionID: session.ID,
						EventType: eventType,
						Description: fmt.Sprintf("Peringatan kritis! Terdeteksi darah naik pada selang sebesar %d Hz.", req.BloodRawValue),
						CreatedAt: time.Now(),
					})
				}
			}()
		}
	}

	return commandToHardware, nil
}