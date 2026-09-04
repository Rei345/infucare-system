package usecase

import (
	"infucare-backend/internal/domain"
	"gorm.io/gorm"
)

type HealthUnitUsecase struct {
	db *gorm.DB
}

func NewHealthUnitUsecase(db *gorm.DB) *HealthUnitUsecase {
	return &HealthUnitUsecase{db: db}
}

// GetAllUnits retrieves all registered healthcare facilities.
func (u *HealthUnitUsecase) GetAllUnits() ([]domain.HealthUnit, error) {
	var units []domain.HealthUnit
	err := u.db.Find(&units).Error
	return units, err
}

// CreateUnit registers a new healthcare facility into the system.
func (u *HealthUnitUsecase) CreateUnit(req domain.HealthUnitCreateRequest) (domain.HealthUnit, error) {
	newUnit := domain.HealthUnit{
		Name: req.Name,
		Address: req.Address,
		UnitCode: req.UnitCode,
	}

	err := u.db.Create(&newUnit).Error
	return newUnit, err
}