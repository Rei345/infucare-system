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
	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	settings, err := h.usecase.GetSettings(uint(unitIDFloat.(float64)))
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

	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	if err := h.usecase.UpdateSettings(uint(unitIDFloat.(float64)), req); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan ke Database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pengaturan berhasil dikunci dan dikirim ke selurun perangkat yang online!"})
}

func (h *NotificationHandler) TestWhatsApp(c *gin.Context) {
	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	err := h.usecase.TestWhatsApp(uint(unitIDFloat.(float64)))
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