package httpdelivery

import (
	"fmt"
	"net/http"

	"infucare-backend/internal/usecase"
	"infucare-backend/pkg/auth"

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
	
	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	if err := h.usecase.LockActuator(unitID, deviceSN); err != nil {
		if err.Error() == "unauthorized device access" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Perangkat bukan milik unit Anda"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbaharui status perangkat di database"})
		return 
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Perintah penguncian aktuator dikirim ke %s", deviceSN)})
}

func (h *ControlHandler) UnlockActuator(c *gin.Context) {
	deviceSN := c.Param("sn")

	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	if err := h.usecase.UnlockActuator(unitID, deviceSN); err != nil {
		if err.Error() == "unauthorized device access" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Perangkat bukan milik unit Anda"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "gagal memperbaharui status perangkat di database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Perintah Pembukaan aktuator dikirim ke %s", deviceSN)})
}