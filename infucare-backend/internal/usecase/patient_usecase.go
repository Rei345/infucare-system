package usecase

import (
	"errors"
	"infucare-backend/internal/domain"
	"gorm.io/gorm"
)

type PatientUsecase struct {
	db *gorm.DB
}

func NewPatientUsecase(db *gorm.DB) *PatientUsecase {
	return &PatientUsecase{db: db}
}

// CreatePatient registers a new patient to a specific health unit.
func (u *PatientUsecase) CreatePatient(UnitID uint, req domain.PatientRequest) (*domain.Patient, error) {
	newPatient := domain.Patient{
		UnitID: UnitID,
		Name: req.Name,
		RegistrationNo: req.RegistrationNo,
		Address: req.Address,
	}

	if err := u.db.Create(&newPatient).Error; err != nil {
		return nil, errors.New("failed to create patient, ensure RegistrationNo is unique")
	}

	return &newPatient, nil
}

// GetPatients retrieves all patients belonging to a specific health unit.
func (u *PatientUsecase) GetPatients(UnitID uint) ([]domain.Patient, error) {
	var patients []domain.Patient
	err := u.db.Where("unit_id = ?", UnitID).Find(&patients).Error
	return patients, err
}

// UpdatePatient modifies an existing patient's details.
func (u *PatientUsecase) UpdatePatient(unitID uint, patientID string, req domain.PatientRequest) (*domain.Patient, error) {
	var patient domain.Patient

	if err := u.db.Where("id = ? AND unit_id = ?", patientID, unitID).First(&patient).Error; err != nil {
		return nil, errors.New("patient not found or access denied")
	}

	err := u.db.Model(&patient).Updates(map[string]interface{}{
		"name": req.Name,
		"registration_no": req.RegistrationNo,
		"address": req.Address,
	}).Error

	if err != nil {
		return nil, errors.New("failed to update patient, ensure RegistrationNo is unique")
	}

	return &patient, nil
}

// DeletePatient securely removes a patient and all their associated medical history using a Database Transaction.
func (u *PatientUsecase) DeletePatient(unitID uint, patientID string) error {
	var patient domain.Patient

	if err := u.db.Where("id = ? AND unit_id = ?", patientID, unitID).First(&patient).Error; err != nil {
		return errors.New("patient not found or access denied")
	}

	return u.db.Transaction(func (tx *gorm.DB) error {
		var sessionIDs []uint
		tx.Model(&domain.InfusionSession{}).Where("patien_id = ?", patient.ID).Pluck("id", &sessionIDs)

		if len(sessionIDs) > 0 {
			if err := tx.Where("session_id IN ?", sessionIDs).Delete(&domain.TelemetryData{}).Error; err != nil {
				return err
			}
			if err := tx.Where("session_id IN ?", sessionIDs).Delete(&domain.ActivityLog{}).Error; err != nil {
				return err
			}
		}

		if err := tx.Where("patient_id = ?", patient.ID).Delete(&domain.InfusionSession{}).Error; err != nil {
			return err
		}

		if err := tx.Delete(&patient).Error; err != nil {
			return err
		}

		return nil
	})
}