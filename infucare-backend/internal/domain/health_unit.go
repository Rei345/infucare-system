package domain

// HealthUnitCreateRequest defines the expected JSON payload for registering a new clinic.
type HealthUnitCreateRequest struct {
	Name 		string `json:"name" binding:"required"`
	Address 	string `json:"address"`
	UnitCode	string `json:"unit_code" binding:"required"`
}