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
	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

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

	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	data, err := h.usecase.GetTelemetryHistory(unitID, sessionID)
	if err != nil {
		if err.Error() == "unauthorized session access" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Perangkat bukan milik unit Anda"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil riwayat telemetri"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Riwayat grafik berhasil diambil",
		"data":    data,
	})
}

func (h *DashboardHandler) GetAnalyticsSummary(c *gin.Context) {
	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}
	unitID := uint(unitIDRaw.(float64))

	data, err := h.usecase.GetAnalyticsSummary(unitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil ringkasan analitik"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": data,
	})
}