package domain

// FluidCreateRequest defines the expected JSON payload for creating a new fluid.
type FluidCreateRequest struct {
	Name 	string 	`json:"name" binding:"required"`
	Density float64 `json:"density" binding:"required"`
}