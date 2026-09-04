package mqttdelivery

import (
	"encoding/json"
	"log"

	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"

	mqtt "github.com/eclipse/paho.mqtt.golang"
)

type MQTTHandler struct {
	usecase *usecase.TelemetryUsecase
}

func NewMQTTHandler(uc *usecase.TelemetryUsecase) *MQTTHandler {
	return &MQTTHandler{
		usecase: uc,
	}
}

func (h *MQTTHandler) EmergencyPubHandler(client mqtt.Client, msg mqtt.Message) {
	var payload map[string]interface{}
	if err := json.Unmarshal(msg.Payload(), &payload); err != nil {
		return
	}

	deviceSN, _ := payload["device_sn"].(string)
	status, _ := payload["status"].(string)

	// Lemparkan ke Usecase
	h.usecase.ProcessEmergency(deviceSN, status)
}

func (h *MQTTHandler) MessagePubHandler(client mqtt.Client, msg mqtt.Message) {
	var payload domain.TelemetryPayload
	if err := json.Unmarshal(msg.Payload(), &payload); err != nil {
		log.Printf("[MQTT] Error parsing JSON: %v\n", err)
		return
	}

	// Lemparkan ke Usecase
	h.usecase.ProcessTelemetry(payload)
}