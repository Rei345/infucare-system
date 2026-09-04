package domain

// ActiveMonitoringResponse shapes the data sent to the real-time dashboard cards.
type ActiveMonitoringResponse struct {
	SessionID      uint    `json:"session_id"`
	PatientID      uint    `json:"patient_id"`
	PatientName    string  `json:"patient_name"`
	RegistrationNo string  `json:"registration_no"`
	DeviceSN       string  `json:"device_sn"`
	FluidID        uint    `json:"fluid_id"`
	FluidName      string  `json:"fluid_name"`
	TargetTpm      int     `json:"target_tpm"`
	CurrentTpm     int     `json:"current_tpm"`
	FluidLevelPct  float64 `json:"fluid_level_pct"`
	EstimatedEndAt string  `json:"estimated_end_at"`
	Status         string  `json:"status"`
	TotalMl        float64 `json:"total_ml"`
	TotalBotol     int64   `json:"total_botol"`
}

// AnalyticsSummaryResponse shapes the top-level aggregate metrics.
type AnalyticsSummaryResponse struct {
	TotalPasien int64   `json:"total_pasien"`
	AvgTpm      int     `json:"avg_tpm"`
	TotalMl     float64 `json:"total_ml"`
	TotalBotol  int64   `json:"total_botol"`
}