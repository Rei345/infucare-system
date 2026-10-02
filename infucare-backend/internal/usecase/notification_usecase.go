package usecase

import (
	"errors"
	"fmt"
	"log"
	"time"

	"infucare-backend/internal/domain"
	"infucare-backend/pkg/whatsapp"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"gorm.io/gorm"
)

type NotificationUsecase struct {
	db         *gorm.DB
	mqttClient mqtt.Client
}

func NewNotificationUsecase(db *gorm.DB, mqttClient mqtt.Client) *NotificationUsecase {
	return &NotificationUsecase{
		db:         db,
		mqttClient: mqttClient,
	}
}

func (u *NotificationUsecase) GetSettings(unitID uint) (domain.NotificationSettingsPayload, error) {
	var configData domain.NotificationConfig

	err := u.db.Where("unit_id = ?", unitID).First(&configData).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		configData = domain.NotificationConfig{
			UnitID:               unitID,
			Provider:             "WA_WAZIBAPI",
			GlobalVolume:         50,
			GlobalMute:           false,
			MuteGatewayBuzzer:    false,
			LowFluidThresholdPct: 15,
			AutoStopThresholdPct: 5,
			BloodSensorThreshold: 515,
			IsActive:             true,
			NotifyBlood:          true,
			NotifyEmptyFluid:     true,
			NotifyLowFluid:       true,
			NotifyLowBattery:     true,
			NotifyOffline:        true,
			NotifyFailsafe:       true,
		}
		if createErr := u.db.Create(&configData).Error; createErr != nil {
			return domain.NotificationSettingsPayload{}, createErr
		}
	} else if err != nil {
		return domain.NotificationSettingsPayload{}, err
	}

	return domain.NotificationSettingsPayload{
		MasterMuteWa:         !configData.IsActive,
		GlobalMuteHardware:   configData.GlobalMute,
		MuteGatewayBuzzer:    configData.MuteGatewayBuzzer,
		GlobalVolume:         configData.GlobalVolume,
		WaNumber:             configData.TargetID,
		EmptyFluidPercentage: configData.LowFluidThresholdPct,
		AutoStopThresholdPct: configData.AutoStopThresholdPct,
		BloodSensorThreshold: configData.BloodSensorThreshold,
		AlertBlood:           configData.NotifyBlood,
		AlertEmpty:           configData.NotifyEmptyFluid,
		Alert15Min:           configData.NotifyLowFluid,
		AlertLowBattery:      configData.NotifyLowBattery,
		AlertOffline:         configData.NotifyOffline,
		AlertFailsafe:        configData.NotifyFailsafe,
	}, nil
}

func (u *NotificationUsecase) UpdateSettings(unitID uint, input domain.NotificationSettingsPayload) error {
	var count int64
	u.db.Model(&domain.NotificationConfig{}).Where("unit_id = ?", unitID).Count(&count)
	if count == 0 {
		u.db.Create(&domain.NotificationConfig{UnitID: unitID})
	}

	err := u.db.Model(&domain.NotificationConfig{}).Where("unit_id = ?", unitID).Updates(map[string]interface{}{
		"is_active":               !input.MasterMuteWa,
		"global_mute":             input.GlobalMuteHardware,
		"mute_gateway_buzzer":     input.MuteGatewayBuzzer,
		"global_volume":           input.GlobalVolume,
		"target_id":               input.WaNumber,
		"provider":                "WA_WAZIBAPI",
		"low_fluid_threshold_pct": input.EmptyFluidPercentage,
		"auto_stop_threshold_pct": input.AutoStopThresholdPct,
		"blood_sensor_threshold":  input.BloodSensorThreshold,
		"notify_blood":            input.AlertBlood,
		"notify_empty_fluid":      input.AlertEmpty,
		"notify_low_fluid":        input.Alert15Min,
		"notify_low_battery":      input.AlertLowBattery,
		"notify_offline":          input.AlertOffline,
		"notify_failsafe":         input.AlertFailsafe,
	}).Error

	if err != nil {
		return err
	}

	configPayload := fmt.Sprintf("CFG:%d:%d", input.EmptyFluidPercentage, input.AutoStopThresholdPct)
	bloodConfigPayload := fmt.Sprintf("SET_BLOOD_TH:%d", input.BloodSensorThreshold)

	var onlineDevices []domain.Device
	u.db.Where("unit_id = ? AND status = ?", unitID, "ONLINE").Find(&onlineDevices)

	gatewayCommand := "UNMUTE_BUZZER"
	if input.MuteGatewayBuzzer {
		gatewayCommand = "MUTE_BUZZER"
	}

	go func() {
		if u.mqttClient != nil && u.mqttClient.IsConnected() {
			u.mqttClient.Publish("infucare/gateway/control", 1, false, gatewayCommand)

			for _, device := range onlineDevices {
				topic := "infucare/command/" + device.SN

				for i := 0; i < 3; i++ {
					u.mqttClient.Publish(topic, 1, false, configPayload)
					time.Sleep(800 * time.Millisecond)
				}
				time.Sleep(500 * time.Millisecond)

				for i := 0; i < 3; i++ {
					u.mqttClient.Publish(topic, 1, false, bloodConfigPayload)
					time.Sleep(800 * time.Millisecond)
				}
			}
			log.Printf("[BROADCAST] Berhasil menyiarkan pengaturan ke %d perangkat aktif.\n", len(onlineDevices))
		}
	}()

	return nil
}

func (u *NotificationUsecase) TestWhatsApp(unitID uint) error {
	var configData domain.NotificationConfig
	if err := u.db.Where("unit_id = ?", unitID).First(&configData).Error; err != nil {
		return errors.New("config not found")
	}

	if configData.TargetID == "" {
		return errors.New("empty_number")
	}

	pesan := "🤖 *InfuCare System - TEST*\n\n" +
		"Halo! Ini adalah pesan uji coba otomatis dari Sistem Pemantauan InfuCare.\n\n" +
		"Koneksi WhatsApp Gateway Anda telah *BERHASIL* terhubung. ✅\n\n" +
		"_Pesan ini dikirim secara otomatis, mohon tidak dibalas._"

	return whatsapp.SendWhatsAppAlert(configData.TargetID, pesan)
}