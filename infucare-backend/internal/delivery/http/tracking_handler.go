package httpdelivery

import (
	"net/http"

	"infucare-backend/internal/usecase"
	"infucare-backend/pkg/auth"

	"github.com/gin-gonic/gin"
)

type TrackingHandler struct {
	usecase *usecase.TrackingUsecase
}

func NewTrackingHandler(uc *usecase.TrackingUsecase) *TrackingHandler {
	return &TrackingHandler{usecase: uc}
}

func (h *TrackingHandler) GetGlobalHistoryLogs(c *gin.Context) {
	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	results, err := h.usecase.GetGlobalHistoryLogs(uint(unitIDFloat.(float64)))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil riwayat global"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Riwayat berhasil diambil",
		"data": results,
	})
}

func (h *TrackingHandler) GetPatientTracking(c *gin.Context) {
	patientID := c.Param("id")
	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	response, err := h.usecase.GetPatientTracking(patientID, uint(unitIDFloat.(float64)))
	if err != nil {
		if err.Error() == "patient not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pasien tidak ditemukan atau bukan milik unit Anda"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat data pelacakan pasien"})
		return
	}

	c.JSON(http.StatusOK, response)
}