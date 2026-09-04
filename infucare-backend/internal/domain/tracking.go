package domain

// HistoryLogResponse defines the standardized output for global activity logs.
type HistoryLogResponse struct {
	ID 			uint 	`json:"id"`
	Timestamp 	string 	`json:"timestamp"`
	PatientName string 	`json:"patient_name"`
	EventType 	string 	`json:"event_type"`
	Description string 	`json:"description"`
	Severity 	string 	`json:"severity"`
}

// PatientTrackingResponse encapsulates the detailed medical history of a single patient.
type PatientTrackingResponse struct {
	Patient 		PatientData 			`json:"patient"`
	CurrentSession 	*CurrentSessionData 	`json:"current_session"`
	History 		[]HistoricalSessionData `json:"history"`
}

type PatientData struct {
	ID 				uint 	`json:"id"`
	Name 			string 	`json:"name"`
	RegistrationNo 	string 	`json:"registration_no"`
	Status 			string 	`json:"status"`
}

type CurrentSessionData struct {
	ID          uint          `json:"id"`
	DeviceSN    string        `json:"device_sn"`
	FluidName   string        `json:"fluid_name"`
	Duration    string        `json:"duration"`
	TotalMl     int           `json:"total_ml"`
	BottlesUsed int64         `json:"bottles_used"`
	IsPaused    bool          `json:"is_paused"`
	FluidPct    int           `json:"fluid_pct"`
	Events      []EventDetail `json:"events"`
}

type HistoricalSessionData struct {
	ID 			uint 	`json:"id"`
	StartTime 	string 	`json:"start_time"`
	EndTime 	string 	`json:"end_time"`
	Duration 	string 	`json:"duration"`
	TotalML 	int64 	`json:"total_ml"`
	BottlesUsed int64 	`json:"bottles_used"`
}

type EventDetail struct {
	ID 			uint 	`json:"id"`
	Type 		string 	`json:"type"`
	Timestamp 	string 	`json:"timestamp"`
	TimeOnly 	string 	`json:"time_only"`
	Description string 	`json:"description"`
}