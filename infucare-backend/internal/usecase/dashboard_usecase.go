package usecase

import (
	"fmt"
	"time"

	"infucare-backend/internal/domain"
	"gorm.io/gorm"
)

type DashboardUsecase struct {
	db *gorm.DB
}

func NewDashboardUsecase(db *gorm.DB) *DashboardUsecase {
	return &DashboardUsecase{db: db}
}

func (u *DashboardUsecase) GetActiveMonitoring(unitID uint) ([]domain.ActiveMonitoringResponse, error) {
	var notifConfig domain.NotificationConfig
	u.db.Where("unit_id = ?", unitID).First(&notifConfig)

	lowFluidThreshold := notifConfig.LowFluidThresholdPct
	if lowFluidThreshold == 0 { lowFluidThreshold = 15 }
	bloodSensorThreshold := notifConfig.BloodSensorThreshold
	if bloodSensorThreshold == 0 { bloodSensorThreshold = 515 }
	autoStopThresholdPct := notifConfig.AutoStopThresholdPct
	if autoStopThresholdPct == 0 { autoStopThresholdPct = 5 }

	var sessions []domain.InfusionSession
	err := u.db.Preload("Patient").
		Preload("FluidProfile").
		Preload("Device.DeviceSetting").
		Joins("JOIN patients ON patients.id = infusion_sessions.patient_id").
		Where("patients.unit_id = ? AND infusion_sessions.end_at IS NULL", unitID).
		Find(&sessions).Error

	if err != nil {
		return nil, err
	}

	var results []domain.ActiveMonitoringResponse
	loc, _ := time.LoadLocation("Asia/Jakarta")

	for _, s := range sessions {
		var lastTelemetry domain.TelemetryData
		u.db.Where("session_id = ?", s.ID).Order("created_at desc").First(&lastTelemetry)

		beratBersih := lastTelemetry.WeightGram
		if beratBersih < 0 { beratBersih = 0 }
		
		persentase := (beratBersih / 500.0) * 100
		if persentase > 100 { persentase = 100 }

		estTimeStr := "Menghitung..."
		if persentase <= 0 || beratBersih <= 0 {
			estTimeStr = "Habis Total!"
		} else if lastTelemetry.Tpm == 0 {
			estTimeStr = "Aliran Terhenti"
		} else if !s.EstimatedEndAt.IsZero() {
			jamHabis := s.EstimatedEndAt.In(loc).Format("15:04")
			if time.Now().After(s.EstimatedEndAt) {
				estTimeStr = fmt.Sprintf("Jam %s (Segera Habis!)", jamHabis)
			} else {
				menitTotal := int(time.Until(s.EstimatedEndAt).Minutes())
				if menitTotal > 60 {
					estTimeStr = fmt.Sprintf("Jam %s (%dJ %dM)", jamHabis, menitTotal/60, menitTotal%60)
				} else {
					estTimeStr = fmt.Sprintf("Jam %s (%d Mnt)", jamHabis, menitTotal)
				}
			}
		}

		status := "NORMAL"
		if lastTelemetry.BloodRawValue >= bloodSensorThreshold || persentase <= float64(autoStopThresholdPct) {
			status = "CRITICAL"
		} else if persentase <= float64(lowFluidThreshold) {
			status = "WARNING"
		}

		var totalBotolSesi int64
		u.db.Model(&domain.ActivityLog{}).
			Where("session_id = ? AND event_type = ?", s.ID, "BOTTLE_CHANGE").Count(&totalBotolSesi)
		if totalBotolSesi == 0 { totalBotolSesi = 1 }

		totalMl := ((float64(totalBotolSesi) - 1) * 500.0) + (500.0 - beratBersih)

		results = append(results, domain.ActiveMonitoringResponse{
			SessionID:      s.ID,
			PatientID:      s.PatientID,
			PatientName:    s.Patient.Name,
			RegistrationNo: s.Patient.RegistrationNo,
			DeviceSN:       s.DeviceSN,
			FluidID:        s.FluidID,
			FluidName:      s.FluidProfile.Name,
			TargetTpm:      s.TargetTpm,
			CurrentTpm:     lastTelemetry.Tpm,
			FluidLevelPct:  persentase,
			EstimatedEndAt: estTimeStr,
			Status:         status,
			TotalMl:        totalMl,
			TotalBotol:     totalBotolSesi,
		})
	}

	return results, nil
}

func (u *DashboardUsecase) GetTelemetryHistory(sessionID string) ([]domain.TelemetryData, error) {
	var history []domain.TelemetryData
	waktuMulai := time.Now().Add(-24 * time.Hour)
	
	err := u.db.Where("session_id = ? AND created_at >= ?", sessionID, waktuMulai).
		Order("created_at asc").Find(&history).Error
	
	return history, err
}

func (u *DashboardUsecase) GetAnalyticsSummary(unitID uint) (domain.AnalyticsSummaryResponse, error) {
	var totalPasien int64
	u.db.Table("infusion_sessions").
		Joins("JOIN patients ON patients.id = infusion_sessions.patient_id").
		Where("patients.unit_id = ? AND infusion_sessions.end_at IS NULL", unitID).
		Count(&totalPasien)

	var avgTpm float64
	u.db.Table("telemetry_data").
		Select("AVG(telemetry_data.tpm)").
		Joins("JOIN infusion_sessions ON infusion_sessions.id = telemetry_data.session_id").
		Joins("JOIN patients ON patients.id = infusion_sessions.patient_id").
		Where("patients.unit_id = ? AND infusion_sessions.end_at IS NULL", unitID).
		Scan(&avgTpm)

	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	var totalBotol int64
	u.db.Table("activity_logs").
		Joins("JOIN infusion_sessions ON infusion_sessions.id = activity_logs.session_id").
		Joins("JOIN patients ON patients.id = infusion_sessions.patient_id").
		Where("patients.unit_id = ? AND activity_logs.event_type = ? AND activity_logs.created_at >= ?", unitID, "BOTTLE_CHANGE", startOfDay).
		Count(&totalBotol)

	return domain.AnalyticsSummaryResponse{
		TotalPasien: totalPasien,
		AvgTpm:      int(avgTpm),
		TotalMl:     float64(totalBotol) * 500.0,
		TotalBotol:  totalBotol,
	}, nil
}