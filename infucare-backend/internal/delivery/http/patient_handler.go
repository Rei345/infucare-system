package httpdelivery

import (
	"net/http"

	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"
	"infucare-backend/pkg/auth"


	"github.com/gin-gonic/gin"
)

type PatientHandler struct {
	usecase *usecase.PatientUsecase
}

func NewPatientHandler(uc *usecase.PatientUsecase) *PatientHandler {
	return &PatientHandler{usecase: uc}
}

func (h *PatientHandler) CreatePatient(c *gin.Context) {
	var req domain.PatientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid: Nama dan NIK wajib diisi"})
		return
	}

	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	patient, err := h.usecase.CreatePatient(unitID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Pasien berhasil didaftarkan",
		"data": patient,
	})
}

func (h *PatientHandler) GetPatients(c *gin.Context) {
	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	patients, err := h.usecase.GetPatients(unitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data pasien"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": patients})
}

func (h *PatientHandler) UpdatePatient(c *gin.Context) {
	patientID := c.Param("id")
	var req domain.PatientRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid: Nama dan NIK wajib diisi"})
		return
	}

	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	patient, err := h.usecase.UpdatePatient(unitID, patientID, req)
	if err != nil {
		if err.Error() == "patient not found or access denied" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pasien tidak ditemukan atau bukan milik unit Anda"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data pasien berhasil diperbaharui",
		"data": patient,
	})
}

func (h *PatientHandler) DeletePatient(c *gin.Context) {
	patientID := c.Param("id")
	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	if err := h.usecase.DeletePatient(unitID, patientID); err != nil {
		if err.Error() == "patient not found or access denied" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pasien tidak ditemukan atau bukan milik unit anda"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus pasien, coba lagi nanti."})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data pasien beserta seluruh riwayat rekam medisnya berhasil dihapus permanen.",
	})
}