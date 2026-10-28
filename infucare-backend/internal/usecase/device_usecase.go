package usecase

import (
	"errors"
	"fmt"
	"log"
	"time"

	"infucare-backend/internal/domain"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"gorm.io/gorm"
)

type DeviceUsecase struct {
	db 			*gorm.DB
	mqttClient 	mqtt.Client
	deviceCache *DeviceCache
}

func NewDeviceUsecase(db *gorm.DB, mqttClient mqtt.Client, cache *DeviceCache) *DeviceUsecase {
	return &DeviceUsecase{
		db: 			db,
		mqttClient: 	mqttClient,
		deviceCache: 	cache,
	}
}

func (u *DeviceUsecase) Activate(unitID uint, req domain.ActivateDeviceRequest) (*domain.Device, error) {
	res := u.db.Model(&domain.Device{}).
			Where("sn = ? AND secret_key = ? AND unit_id IS NULL", req.SN, req.SecretKey).
			Updates(map[string]interface{}{
				"unit_id": unitID,
				"alias_name": req.AliasName,
				"status": "ONLINE",
			})

	if res.Error != nil {
		return nil, errors.New("failed to save device")
	}

	if res.RowsAffected == 0 {
		var existing domain.Device
		if err := u.db.Where("sn = ? AND secret_key = ?", req.SN, req.SecretKey).First(&existing).Error; err != nil {
			return nil, errors.New("invalid credentials")
		}
		return nil, errors.New("device already claimed")
	}
	
	var device domain.Device
	u.db.Where("sn = ?", req.SN).First(&device)

	return &device, nil
}

func (u *DeviceUsecase) FetchUnitDevices(unitID uint) ([]domain.DeviceResponse, error) {
	var devices []domain.Device
	if err := u.db.Preload("DeviceSetting").Where("unit_id = ?", unitID).Find(&devices).Error; err != nil {
		return nil, err
	}

	var results []domain.DeviceResponse

	for _, d := range devices {
		res := domain.DeviceResponse{
			SN: 			d.SN,
			AliasName: 		d.AliasName,
			DeviceSetting: 	d.DeviceSetting,
		}

		cacheItem, isCached := u.deviceCache.Get(d.SN)

		if isCached && time.Since(cacheItem.LastSeen) < 30*time.Second {
			res.Status = "ONLINE"
			if d.Status == "CRITICAL" { res.Status = "CRITICAL" }
			res.LastSeen = "Baru saja"
			res.LatestTelemetry = &domain.TelemetrySnapshot{
				BatteryPct: 	cacheItem.Payload.BatteryPct,
				SignalDbm: 		cacheItem.Payload.SignalDbm,
				InternalTemp: 	cacheItem.Payload.InternalTemp,
				UptimeSeconds: 	cacheItem.Payload.UptimeSeconds,
				BloodRawValue: 	cacheItem.Payload.BloodRawValue,
			}
		} else {
			res.Status = "OFFLINE"
			if isCached {
				res.LastSeen = cacheItem.LastSeen.Format("15:04:05")
				res.LatestTelemetry = &domain.TelemetrySnapshot{
					BatteryPct:    cacheItem.Payload.BatteryPct,
					SignalDbm:     cacheItem.Payload.SignalDbm,
					InternalTemp:  cacheItem.Payload.InternalTemp,
					UptimeSeconds: cacheItem.Payload.UptimeSeconds,
					BloodRawValue: cacheItem.Payload.BloodRawValue,
				}
			} else {
				res.LastSeen = "Belum pernah aktif"
			}
		}

		var activateSession domain.InfusionSession
		err := u.db.Preload("Patient").Where("device_sn = ? AND end_at IS NULL", d.SN).First(&activateSession).Error
		if err == nil {
			res.CurrentPatientID = &activateSession.PatientID
			res.CurrentPatientName = &activateSession.Patient.Name
		}

		results = append(results, res)
	}

	return results, nil
}

func (u *DeviceUsecase) UpdateAndSyncSettings(unitID uint, sn string, req domain.UpdateSettingsRequest) error {
	var device domain.Device
	if err := u.db.Where("sn = ? AND unit_id = ?", sn, unitID).First(&device).Error; err != nil {
		return errors.New("unauthorized device access")
	}

	u.db.Model(&device).Update("alias_name", req.AliasName)

	var settings domain.DeviceSetting
	if err := u.db.Where("device_sn = ?", sn).First(&settings).Error; err != nil {
		newSettings := domain.DeviceSetting{
			DeviceSN:      sn,
			SpeakerVolume: req.SpeakerVolume,
			AutoStopBlood: req.AutoStopBlood,
			AutoStopEmpty: req.AutoStopEmpty,
		}
		u.db.Create(&newSettings)
	} else {
		u.db.Model(&settings).Updates(map[string]interface{}{
			"speaker_volume":  req.SpeakerVolume,
			"auto_stop_blood": req.AutoStopBlood,
			"auto_stop_empty": req.AutoStopEmpty,
		})
	}

	mappedVolume := (req.SpeakerVolume * 30) / 100
	autoBloodInt, autoEmptyInt := 0, 0
	if req.AutoStopBlood { autoBloodInt = 1 }
	if req.AutoStopEmpty { autoEmptyInt = 1 }

	topic := fmt.Sprintf("infucare/command/%s", sn)

	go func() {
		log.Printf("[SYNC] Sinkronisasi parameter memori untuk perangkat %s dimulai...\n", sn)
		commands := []string{
			fmt.Sprintf("SET_VOL:%d", mappedVolume),
			fmt.Sprintf("SET_AUTO_BLOOD:%d", autoBloodInt),
			fmt.Sprintf("SET_AUTO_EMPTY:%d", autoEmptyInt),
		}

		for _, cmd := range commands {
			for i := 0; i < 3; i++ {
				if u.mqttClient != nil && u.mqttClient.IsConnected() {
					u.mqttClient.Publish(topic, 1, false, cmd)
				}
				time.Sleep(800 * time.Millisecond)
			}
		}
		log.Printf("[SYNC] Pengaturan berhasil ditanamkan ke ESP32 (%s)\n", sn)
	}()

	return nil
}

func (u *DeviceUsecase) UnlinkDevice(unitID uint, sn string) error {
	var device domain.Device
	if err := u.db.Where("sn = ? AND unit_id = ?", sn, unitID).First(&device).Error; err != nil {
		return errors.New("unauthorized device access")
	}

	return u.db.Model(&device).Updates(map[string]interface{}{
		"unit_id": nil,
		"alias_name": "",
		"status": "OFFLINE",
	}).Error
}