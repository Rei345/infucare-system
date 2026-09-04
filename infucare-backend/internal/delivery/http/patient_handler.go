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

	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	patient, err := h.usecase.CreatePatient(uint(unitIDFloat.(float64)), req)
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
	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	patients, err := h.usecase.GetPatients(uint(unitIDFloat.(float64)))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data pasien"})
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

	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	patient, err := h.usecase.UpdatePatient(uint(unitIDFloat.(float64)), patientID, req)
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
	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	if err := h.usecase.DeletePatient(uint(unitIDFloat.(float64)), patientID); err != nil {
		if err.Error() == "patient not found or access denied" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pasien tidak ditemukan atau bukan milik unit anda"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus pasien, coba lagi nanti."})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data pasien beserta seluruh riwayat rekam medisnya berhasil dihapus permanen.",
	})
}