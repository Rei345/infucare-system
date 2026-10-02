package httpdelivery

import (
	"net/http"

	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"
	"infucare-backend/pkg/auth"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	usecase *usecase.NotificationUsecase
}

func NewNotificationHandler(uc *usecase.NotificationUsecase) *NotificationHandler {
	return &NotificationHandler{usecase: uc}
}

func (h *NotificationHandler) GetSettings(c *gin.Context) {
	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID) 
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	settings, err := h.usecase.GetSettings(unitID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil pengaturan unit"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": settings})
}

func (h *NotificationHandler) UpdateSettings(c *gin.Context) {
	var req domain.NotificationSettingsPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format JSON tidak sesuai: " + err.Error()})
		return
	}

	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	if err := h.usecase.UpdateSettings(unitID, req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan ke Database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pengaturan berhasil dikunci dan dikirim ke selurun perangkat yang online!"})
}

func (h *NotificationHandler) TestWhatsApp(c *gin.Context) {
	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	err := h.usecase.TestWhatsApp(unitID)
	if err != nil {
		if err.Error() == "config not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Pengaturan tidak ditemukan"})
			return
		}

		if err.Error() == "empty_number" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor WhatsApp belum diisi di pengaturan"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal kirim WA: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pesan uji coba berhasiil meluncur ke WA!"})
}