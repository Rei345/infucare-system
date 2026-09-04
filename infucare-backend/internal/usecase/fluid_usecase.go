package usecase

import (
	"infucare-backend/internal/domain"
	"gorm.io/gorm"
)

type FluidUsecase struct {
	db *gorm.DB
}

func NewFluidUsecase(db *gorm.DB) *FluidUsecase {
	return &FluidUsecase{db: db}
}

// CreateFluid handles the business logic of adding a new medical fluid profiles.
func (u *FluidUsecase) CreateFluid(req domain.FluidCreateRequest) (domain.FluidProfile, error) {
	newFluid := domain.FluidProfile{
		Name: req.Name,
		Density: req.Density,
	}

	err := u.db.Create(&newFluid).Error
	return newFluid, err
}

// GetAllFluids retrieves all available medical fluid profiles.
func (u *FluidUsecase) GetAllFluids() ([]domain.FluidProfile, error) {
	var fluids []domain.FluidProfile
	err := u.db.Find(&fluids).Error
	return fluids, err
}