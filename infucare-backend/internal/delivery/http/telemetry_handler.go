package httpdelivery

import (
	"net/http"

	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type TelemetryHandler struct {
	usecase *usecase.TelemetryUsecase
}

func NewTelemetryHandler(uc *usecase.TelemetryUsecase) *TelemetryHandler {
	return &TelemetryHandler{usecase: uc}
}

func (h *TelemetryHandler) ReceiveTelemetryFromGateway(c *gin.Context) {
	var req domain.TelemetryDataRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	command, err := h.usecase.ProcessHTTPFallback(req)
	if err != nil {
		if err.Error() == "active session not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sesi pemantauan tidak aktif atau tidak ditemukan"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan telemetri"})
		return
	}

	c.String(http.StatusOK, command)
}