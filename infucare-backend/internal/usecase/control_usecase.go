package usecase

import (
	"fmt"
	"time"

	"infucare-backend/internal/domain"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"gorm.io/gorm"
)

type ControlUsecase struct {
	db *gorm.DB
	mqttClient mqtt.Client
}

func NewControlUsecase(db *gorm.DB, mqttClient mqtt.Client) *ControlUsecase {
	return &ControlUsecase{
		db: 		db,
		mqttClient: mqttClient,
	}
}

// LockActuator sends a command to the servo motor to clamp the IV tube.
func (u *ControlUsecase) LockActuator(deviceSn string) error {
	topic := fmt.Sprintf("infucare/command/%s", deviceSn)

	go func() {
		for i := 0; i < 3; i++ {
			if u.mqttClient != nil && u.mqttClient.IsConnected() {
				u.mqttClient.Publish(topic, 1, false, "SERVO_LOCK")
			}
			time.Sleep(1000 * time.Millisecond)
		}
	}()

	return u.db.Model(&domain.Device{}).Where("sn = ?", deviceSn).Update("status", "CRITICAL").Error
}

// UnlockActuator sends a command to the servo motor to release the IV tube.
func (u *ControlUsecase) UnlockActuator(deviceSn string) error {
	topic := fmt.Sprintf("infucare/command/%s", deviceSn)

	go func() {
		for i := 0; i < 3; i++ {
			if u.mqttClient != nil && u.mqttClient.IsConnected() {
				u.mqttClient.Publish(topic, 1, false, "SERVO_UNLOCK")
			}
			time.Sleep(1000 * time.Millisecond)
		}
	}()

	return u.db.Model(&domain.Device{}).Where("sn = ?", deviceSn).Update("status", "ONLINE").Error
}

// MuteGateway silences the buzzer on the main central gateway.
func (u *ControlUsecase) MuteGateway() error {
	topic := "infucare/gateway/control"
	if u.mqttClient == nil || !u.mqttClient.IsConnected() {
		return fmt.Errorf("MQTT broker is disconnected")
	}

	token := u.mqttClient.Publish(topic, 1, false, "MUTE_BUZZER")
	token.Wait()
	return token.Error()
}

// UnmuteGateway reactivates the buzzer on the main central gateway.
func (u *ControlUsecase) UnmuteGateway() error {
	topic := "infucare/gateway/control"
	if u.mqttClient == nil || !u.mqttClient.IsConnected() {
		return fmt.Errorf("MQTT broker is disconnected")
	}

	token := u.mqttClient.Publish(topic, 1, false, "UNMUTE_BUZZER")
	token.Wait()
	return token.Error()
}