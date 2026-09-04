package domain

// StartSessionRequest defines the input required to begin a ndw infusion session.
type StartSessionRequest struct {
	PatientID 	uint 	`json:"patient_id" binding:"required"`
	DeviceSN 	string 	`json:"device_sn" binding:"required"`
	FluidID 	uint 	`json:"fluid_id" binding:"required"`
	TargetTpm 	int 	`json:"target_tpm" binding:"required"`
	BottleCount int 	`json:"bottle_count" binding:"required"`
}

// UpdateTpmRequest defines the input to change drip rate mid-session.
type UpdateTpmRequest struct {
	TargetTpm int `json:"target_tpm" binding:"required"`
}