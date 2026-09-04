package httpdelivery

import (
	"fmt"
	"net/http"

	"infucare-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type ControlHandler struct {
	usecase *usecase.ControlUsecase
}

// NewControlHandler registers the routes for device control.
func NewControlHandler(uc *usecase.ControlUsecase) *ControlHandler {
	return &ControlHandler{usecase: uc}
}

func (h *ControlHandler) LockActuator(c *gin.Context) {
	deviceSN := c.Param("sn")

	if err := h.usecase.LockActuator(deviceSN); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbaharui status perangkat di database"})
		return 
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Perintah penguncian aktuator dikirim ke %s", deviceSN)})
}

func (h *ControlHandler) UnlockActuator(c *gin.Context) {
	deviceSN := c.Param("sn")

	if err := h.usecase.UnlockActuator(deviceSN); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbaharui status perangkat di database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Perintah Pembukaan aktuator dikirim ke %s", deviceSN)})
}

func (h *ControlHandler) MuteGatewayBuzzer(c *gin.Context) {
	if err := h.usecase.MuteGateway(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal membungkam buzzer gateway"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Perintah mute berhasil dikirim ke gateway"})
}

func (h *ControlHandler) UnmuteGatewayBuzzer(c *gin.Context) {
	if err := h.usecase.UnmuteGateway(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal mengaktifkan kembali buzzer gateway"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Perintah unmute berhasil dikirim ke gateway"})
}