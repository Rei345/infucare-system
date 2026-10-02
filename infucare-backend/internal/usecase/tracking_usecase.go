package usecase

import (
	"errors"
	"fmt"
	"time"

	"infucare-backend/internal/domain"
	"gorm.io/gorm"
)

type TrackingUsecase struct {
	db *gorm.DB
}

func NewTrackingUsecase(db *gorm.DB) *TrackingUsecase {
	return &TrackingUsecase{db: db}
}

func (u *TrackingUsecase) GetGlobalHistoryLogs(unitID uint) ([]domain.HistoryLogResponse, error) {
	var results []domain.HistoryLogResponse

	query := `
			SELECT 
				a.id, 
				a.created_at, 
				COALESCE(p.name, 'Sistem / Tidak Diketahui') as patient_name, 
				a.event_type, 
				a.description
			FROM activity_logs a
			JOIN infusion_sessions s ON a.session_id = s.id
			JOIN patients p ON s.patient_id = p.id
			WHERE p.unit_id = ?
			ORDER BY a.created_at DESC
	`

	type result struct {
		ID 			uint
		CreatedAt 	time.Time
		PatientName string
		EventType 	string
		Description string
	}

	var rawResult []result
	if err := u.db.Raw(query, unitID).Scan(&rawResult).Error; err != nil {
		return nil, err
	}

	for _, r := range rawResult {
		severity := "info"
		switch r.EventType {
		case "BLOOD_DETECTED", "ALERT_BLOOD", "SYSTEM_FAILSAFE":
			severity = "critical"
		case "FLOW_PAUSE", "DEVICE_OFFLINE", "WARNING_EMPTY":
			severity = "warning"
		case "SESSION_START", "BOTTLE_CHANGE", "SESSION_END":
			severity = "success"
		}

		desc := r.Description
		if desc == "" {
			switch r.EventType {
			case "SESSION_START": desc = "Sesi pemantauan dimulai"
			case "BOTTLE_CHANGE": desc = "Penggantian botol infus baru terdeteksi"
			case "BLOOD_DETECTED", "ALERT_BLOOD": desc = "Peringatan kritis! Terdeteksi darah naik pada selang"
			case "SYSTEM_FAILSAFE": desc = "Aliran ditutup otomatis oleh klem servo (Failsafe Aktif)"
			case "FLOW_PAUSE": desc = "Aliran dijeda / mampet (Berat aman, tetesan 0 TPM)"
			case "DEVICE_OFFLINE": desc = "Perangkat kehilangan sinyal / offline"
			case "SESSION_END": desc = "Sesi pemantauan selesai"
			case "TARGET_TPM_CHANGED": desc = "Target tetesan TPM diubah melalui aplikasi Web"
			default: desc = "Aktivitas: " + r.EventType
			}
		}

		timeStr := r.CreatedAt.Format("02 Jan 2006 15:04:05")
		if r.CreatedAt.Year() == 1 {
			timeStr = "Waktu Tidak Tercatat"
		}

		results = append(results, domain.HistoryLogResponse{
			ID: 			r.ID,
			Timestamp: 		timeStr,
			PatientName:	r.PatientName,
			EventType: 		r.EventType,
			Description: 	desc,
			Severity: 		severity,
		})
	}

	if results == nil {
		results = []domain.HistoryLogResponse{}
	}

	return results, nil
}

func (u *TrackingUsecase) GetPatientTracking(patientID string, unitID uint) (domain.PatientTrackingResponse, error) {
	var patient domain.Patient
	if err := u.db.Where("id = ? AND unit_id = ?", patientID, unitID).First(&patient).Error; err != nil {
		return domain.PatientTrackingResponse{}, errors.New("patient not found")
	}

	var notifConfig domain.NotificationConfig
	u.db.Where("unit_id = ?", unitID).First(&notifConfig)

	bloodSensorThreshold := notifConfig.BloodSensorThreshold
	if bloodSensorThreshold == 0 { 
		bloodSensorThreshold = 515 
	}
	
	AutoStopThresholdPct := notifConfig.AutoStopThresholdPct
	if AutoStopThresholdPct == 0 { 
		AutoStopThresholdPct = 5 
	}
	
	lowFluidThreshold := notifConfig.LowFluidThresholdPct
	if lowFluidThreshold == 0 { 
		lowFluidThreshold = 15 
	}

	var activeSession domain.InfusionSession
	hasActiveSession := true
	if err := u.db.Preload("Device.DeviceSetting").Preload("FluidProfile").
	Where("patient_id = ? AND end_at IS NULL", patientID).First(&activeSession).Error; err != nil {
		hasActiveSession = false
	}

	var CurrentSessionData *domain.CurrentSessionData
	statusPasien := "NORMAL"

	if hasActiveSession {
		durasi := time.Since(activeSession.StartAt)
		jam := int(durasi.Hours())
		menit := int(durasi.Minutes()) % 60
		durasiStr := fmt.Sprintf("%d jam %d Menit", jam, menit)

		var activeLogs []domain.ActivityLog
		u.db.Where("session_id = ?", activeSession.ID).Order("created_at desc").Find(&activeLogs)

		var botolDigunakan int64
		u.db.Model(&domain.ActivityLog{}).Where("session_id = ? AND event_type = ?", activeSession.ID, "BOTTLE_CHANGE").Count(&botolDigunakan)
		if botolDigunakan == 0 { 
			botolDigunakan = 1 
		}

		var lastTelemetry domain.TelemetryData
		errTelemetry := u.db.Where("session_id = ?", activeSession.ID).Order("created_at desc").First(&lastTelemetry).Error

		var sisaCairan float64
		var persentaseSisa int
		isPaused := false

		if errTelemetry != nil || lastTelemetry.ID == 0 {
			sisaCairan = 500.0
			persentaseSisa = 100
			statusPasien = "NORMAL"
		} else {
			sisaCairan = lastTelemetry.WeightGram
			if sisaCairan < 0 {
				sisaCairan = 0
			}
			if sisaCairan > 500 {
				sisaCairan = 500
			}

			persentaseSisa = int((sisaCairan / 500.0) * 100)
			isPaused = (lastTelemetry.Tpm == 0)

			if lastTelemetry.BloodRawValue >= bloodSensorThreshold || persentaseSisa <= AutoStopThresholdPct {
				statusPasien = "CRITICAL"
			} else if persentaseSisa <= lowFluidThreshold {
				statusPasien = "WARNING"
			}
		}

		totalML := ((float64(botolDigunakan) - 1) * 500.0) + (500.0 - sisaCairan)
		
		CurrentSessionData = &domain.CurrentSessionData{
			ID: activeSession.ID,
			DeviceSN: activeSession.DeviceSN,
			FluidName: activeSession.FluidProfile.Name,
			Duration: durasiStr,
			TotalMl: int(totalML),
			BottlesUsed: botolDigunakan,
			IsPaused: isPaused,
			FluidPct: persentaseSisa,
			Events: u.formatLogstoEvents(activeLogs),
		}
	}

	var historySessions []domain.InfusionSession
	u.db.Preload("Device").Preload("FluidProfile").
		Where("patient_id = ? AND end_at IS NOT NULL", patientID).
		Order("start_at desc").Find(&historySessions)

	var historyData []domain.HistoricalSessionData
	for _, hs := range historySessions {
		var durasi time.Duration
		endTimeStr := "Selesai"

		if hs.EndAt != nil {
			durasi = hs.EndAt.Sub(hs.StartAt)
			endTimeStr = hs.EndAt.Format("15:04")
		} else {
			durasi = time.Since(hs.StartAt)
		}

		var botolSelesai int64
		u.db.Model(&domain.ActivityLog{}).Where("session_id = ? AND event_type = ?", hs.ID, "BOTTLE_CHANGE").Count(&botolSelesai)
		if botolSelesai == 0 {
			botolSelesai = 1
		}

		historyData = append(historyData, domain.HistoricalSessionData{
			ID: hs.ID,
			StartTime: hs.StartAt.Format("02 Jan 2006 15:04"),
			EndTime: endTimeStr,
			Duration: fmt.Sprintf("%d Jam %d Menit", int(durasi.Hours()), int(durasi.Minutes()) % 60),
			TotalML: botolSelesai * 500,
			BottlesUsed: botolSelesai,
		})
	} 

	if historyData == nil {
		historyData = []domain.HistoricalSessionData{}
	}

	return domain.PatientTrackingResponse{
		Patient: domain.PatientData{
			ID: patient.ID,
			Name: patient.Name,
			RegistrationNo: patient.RegistrationNo,
			Status: statusPasien,
		},
		CurrentSession: CurrentSessionData,
		History: historyData,
	}, nil
}

func (u *TrackingUsecase) formatLogstoEvents(logs []domain.ActivityLog) []domain.EventDetail {
	var events []domain.EventDetail
	for _, l := range logs {
		desc := l.Description
		if desc == "" {
			switch l.EventType {
				case "SESSION_START": desc = "Pemantauan infus dipasang dan dimulai."
				case "BOTTLE_CHANGE": desc = "Penggantian botol infus baru terdeteksi."
				case "BLOOD_DETECTED", "ALERT_BLOOD": desc = "Peringatan! Terdeteksi darah naik pada selang."
				case "SYSTEM_FAILSAFE": desc = "Sistem mengunci aliran secara otomatis untuk mencegah insiden medis."
				case "FLOW_PAUSE": desc = "Aliran infus dihentikan (Klem tertutup)."
				case "DEVICE_OFFLINE": desc = "Alat pemantau kehilangan koneksi dengan Gateway."
				case "SESSION_END": desc = "Sesi pemantauan infus telah diakhiri."
				case "TARGET_TPM_CHANGED": desc = "Target laju aliran (TPM) disesuaikan ulang dari Web."
				default: desc = "Aktivitas terdeteksi: " + l.EventType
			}
		}
		events = append(events, domain.EventDetail{
			ID: l.ID,
			Type: l.EventType,
			Timestamp: l.CreatedAt.Format("02 Jan 2006 15:04:05"),
			TimeOnly: l.CreatedAt.Format("15:04:05"),
			Description: desc,
		})
	}

	if events == nil {
		events = []domain.EventDetail{}
	}
	return events
}