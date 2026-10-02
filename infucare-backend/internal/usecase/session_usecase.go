package usecase

import (
	"errors"
	"fmt"
	"time"

	"infucare-backend/internal/domain"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"gorm.io/gorm"
)

type SessionUsecase struct {
	db *gorm.DB
	mqttClient mqtt.Client
}

func NewSessionUsecase(db *gorm.DB, mqttClient mqtt.Client) *SessionUsecase {
	return &SessionUsecase{
		db: db,
		mqttClient: mqttClient,
	}
}

func (u *SessionUsecase) StartSession(unitID uint, req domain.StartSessionRequest) (*domain.InfusionSession, error) {
	var patient domain.Patient
	if err := u.db.Where("id = ? AND unit_id = ?", req.PatientID, unitID).First(&patient).Error; err != nil {
		return nil, errors.New("patient not found in unit")
	}
	
	var existingSession domain.InfusionSession
	if err := u.db.Where("device_sn = ? AND end_at IS NULL", req.DeviceSN).First(&existingSession).Error; err == nil {
		return nil, errors.New("device is currently in use")
	}

	var device domain.Device
	if err := u.db.Where("sn = ? AND unit_id = ?", req.DeviceSN, unitID).First(&device).Error; err != nil {
		return nil, errors.New("device not found")
	}

	if device.Status != "ONLINE" && device.Status != "STANDBY" {
		return nil, errors.New("device is offline or unreachable")
	}

	newSession := domain.InfusionSession{
		PatientID: req.PatientID,
		DeviceSN: req.DeviceSN,
		FluidID: req.FluidID,
		TargetTpm: req.TargetTpm,
		BottleCount: req.BottleCount,
		TotalAccumulatedMl: 0,
		ControlMode: "AUTO",
		StartAt: time.Now(),
	}

	err := u.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&newSession).Error; err != nil {
			return err
		}

		logEntry := domain.ActivityLog{
			SessionID: newSession.ID,
			EventType: "SESSION_START",
			Description: fmt.Sprintf("Sesi pemantauan infus dimulai dengan target %d TPM.", req.TargetTpm),
			CreatedAt: time.Now(),
		}
		return tx.Create(&logEntry).Error
	})

	if err != nil {
		return nil, err
	}

	topic := fmt.Sprintf("infucare/command/%s", req.DeviceSN)
	payloadTpm := fmt.Sprintf("SET_TARGET_TPM:%d", req.TargetTpm)

	go func ()  {
		if u.mqttClient != nil && u.mqttClient.IsConnected() {
			for i := 0; i < 3; i++ {
				u.mqttClient.Publish(topic, 1, false, "TARE_RESET")
				time.Sleep(1000 * time.Millisecond)
			}
			time.Sleep(500 * time.Millisecond)

			for i := 0; i < 3; i++ {
				u.mqttClient.Publish(topic, 1, false, payloadTpm)
				time.Sleep(1000 * time.Millisecond)
			}
		}
	}()
	return &newSession, nil
}

func (u *SessionUsecase) TareSession(unitID uint, sessionID string) (*domain.InfusionSession, error) {
	var session domain.InfusionSession
	errCheck := u.db.Joins("JOIN patients ON patients.id = infusion_sessions.patient_id").
		Where("infusion_sessions.id = ? AND patients.unit_id = ?", sessionID, unitID).
		First(&session).Error

	if errCheck != nil {
		return nil, errors.New("unauthorized session access")
	}

	err := u.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&session, sessionID).Error; err != nil {
			return errors.New("session not found")
		}

		if session.EndAt != nil {
			return errors.New("session already ended")
		}

		session.BottleCount += 1
		if err := tx.Save(&session).Error; err != nil {
			return err
		}

		logEntry := domain.ActivityLog{
			SessionID: session.ID,
			EventType: "BOTTLE_CHANGE",
			Description: fmt.Sprintf("Botol infus diganti (Tare). Total botol saat ini: %d.", session.BottleCount),
			CreatedAt: time.Now(),
		}
		return tx.Create(&logEntry).Error
	})

	if err != nil {
		return nil, err
	}

	topic := fmt.Sprintf("infucare/command/%s", session.DeviceSN)
	go func ()  {
		if u.mqttClient != nil && u.mqttClient.IsConnected() {
			for i := 0; i < 3; i++ {
				u.mqttClient.Publish(topic, 1, false, "TARE_RESET")
				time.Sleep(1000 * time.Millisecond)
			}
		}
	}()

	return &session, nil
}

func (u *SessionUsecase) UpdateTpm(unitID uint, sessionID string, targetTPM int) error {
	var session domain.InfusionSession
	errCheck := u.db.Joins("JOIN patients ON patients.id = infusion_sessions.patient_id").
		Where("infusion_sessions.id = ? AND patients.unit_id = ?", sessionID, unitID).
		First(&session).Error

	if errCheck != nil {
		return errors.New("unauthorized session access")
	}

	if err := u.db.Where("id = ? AND end_at IS NULL", sessionID).First(&session).Error; err != nil {
		return errors.New("active session not found")
	}

	err := u.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&session).Update("target_tpm", targetTPM).Error; err != nil {
			return err
		}

		logEntry := domain.ActivityLog{
			SessionID: session.ID,
			EventType: "TARGET_TPM_CHANGED",
			Description: fmt.Sprintf("Target tetesan infus diubah menjadi %d TPM.", targetTPM),
			CreatedAt: time.Now(),
		}
		return tx.Create(&logEntry).Error
	})

	if err != nil {
		return err
	}

	topic := fmt.Sprintf("infucare/command/%s", session.DeviceSN)
	payload := fmt.Sprintf("SET_TARGET_TPM:%d", targetTPM)

	go func ()  {
		if u.mqttClient != nil && u.mqttClient.IsConnected() {
			for i := 0; i < 3; i++ {
				u.mqttClient.Publish(topic, 1, false, payload)
				time.Sleep(1000 * time.Millisecond)
			}
		}
	}()
	return nil
}

func (u *SessionUsecase) EndSession(unitID uint, sessionID string) error {
	var session domain.InfusionSession
	errCheck := u.db.Joins("JOIN patients ON patients.id = infusion_sessions.patient_id").
			Where("infusion_sessions.id = ? AND patients.unit_id = ?", sessionID, unitID).
			First(&session).Error
	
	if errCheck != nil {
		return errors.New("unauthorized session access")
	}

	if err := u.db.Where("id = ? AND end_at IS NULL", sessionID).First(&session).Error; err != nil {
		return errors.New("active session not found")
	}

	now := time.Now()
	session.EndAt = &now

	err := u.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&session).Error; err != nil {
			return err
		}

		logEntry := domain.ActivityLog{
			SessionID: session.ID,
			EventType: "SESSION_END",
			Description: "Sesi pemantauan infus telah diakhiri secara manual oleh petugas.",
			CreatedAt: time.Now(),
		}
		return tx.Create(&logEntry).Error
	})

	if err != nil {
		return err
	}

	topic := fmt.Sprintf("infucare/command/%s", session.DeviceSN)
	go func ()  {
		if u.mqttClient != nil && u.mqttClient.IsConnected(){
			for i := 0; i < 3; i++ {
				u.mqttClient.Publish(topic, 1, false, "END_SESSION")
				time.Sleep(1000 * time.Millisecond)
			}
		}
	}()

	return nil
}