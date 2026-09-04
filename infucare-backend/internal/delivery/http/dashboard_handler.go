package httpdelivery

import (
	"net/http"

	"infucare-backend/internal/usecase"
	"infucare-backend/pkg/auth"

	"github.com/gin-gonic/gin"
)

type DashboardHandler struct {
	usecase *usecase.DashboardUsecase
}

func NewDashboardHandler(uc *usecase.DashboardUsecase) *DashboardHandler {
	return &DashboardHandler{usecase: uc}
}

func (h *DashboardHandler) GetActiveMonitoring(c *gin.Context) {
	unitIDFloat, exists := c.Get(auth.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid atau kedaluwarsa"})
		return
	}
	unitID := uint(unitIDFloat.(float64))

	data, err := h.usecase.GetActiveMonitoring(unitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data monitoring aktif"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data monitoring aktif berhasil diambil",
		"data":    data,
	})
}

func (h *DashboardHandler) GetTelemetryHistory(c *gin.Context) {
	sessionID := c.Param("id")

	data, err := h.usecase.GetTelemetryHistory(sessionID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil riwayat telemetri"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Riwayat grafik berhasil diambil",
		"data":    data,
	})
}

func (h *DashboardHandler) GetAnalyticsSummary(c *gin.Context) {
	unitIDFloat, exists := c.Get(auth.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}
	unitID := uint(unitIDFloat.(float64))

	data, err := h.usecase.GetAnalyticsSummary(unitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil ringkasan analitik"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": data,
	})
}