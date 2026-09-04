package httpdelivery

import (
	"net/http"

	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"
	"infucare-backend/pkg/auth"

	"github.com/gin-gonic/gin"
)

type DeviceHandler struct {
	usecase *usecase.DeviceUsecase
}

func NewDeviceHandler(uc *usecase.DeviceUsecase) *DeviceHandler {
	return &DeviceHandler{usecase: uc}
}

func (h *DeviceHandler) ActivateDevice(c *gin.Context) {
	var req domain.ActivateDeviceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	unitIDFloat, exists := c.Get(auth.ContextKeyUserID)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return
	}

	device, err := h.usecase.Activate(uint(unitIDFloat.(float64)), req)
	if err != nil {
		if err.Error() == "invalid credentials" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Nomor Seri atau Kunci Rahasia Alat tidak terdaftar!"})
			return
		}
		if err.Error() == "device already claimed" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Perangkat sudah digunakan oleh instansi lain"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengaktivasi perangkat"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Perangkat keras berhasil diaktivasi dan terhubung ke sistem!",
		"data":    device,
	})
}

func (h *DeviceHandler) GetDevices(c *gin.Context) {
	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)
	
	devices, err := h.usecase.FetchUnitDevices(uint(unitIDFloat.(float64)))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data perangkat"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data perangkat berhasil diambil",
		"data":    devices,
	})
}

func (h *DeviceHandler) UpdateDeviceSettings(c *gin.Context) {
	sn := c.Param("sn")
	var req domain.UpdateSettingsRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data JSON tidak sesuai: " + err.Error()})
		return
	}

	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	err := h.usecase.UpdateAndSyncSettings(uint(unitIDFloat.(float64)), sn, req)
	if err != nil {
		if err.Error() == "forbidden access" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak berhak mengubah konfigurasi alat ini"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui konfigurasi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Parameter berhasil diperbarui dan sedang disinkronkan ke memori alat!"})
}

func (h *DeviceHandler) UnlinkDevice(c *gin.Context) {
	sn := c.Param("sn")
	unitIDFloat, _ := c.Get(auth.ContextKeyUserID)

	if err := h.usecase.UnlinkDevice(uint(unitIDFloat.(float64)), sn); err != nil {
		if err.Error() == "device not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Perangkat tidak ditemukan di unit Anda"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal melepaskan perangkat"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Perangkat berhasil dilepaskan dari unit Anda."})
}