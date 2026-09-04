package domain

// PatientRequest defines the expected JSON payload for creating or updating a patient.
type PatientRequest struct {
	Name 			string `json:"name" binding:"required"`
	RegistrationNo 	string `json:"registration_no" binding:"required"`
	Address 		string `json:"address"`
}