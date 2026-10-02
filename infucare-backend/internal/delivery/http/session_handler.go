package httpdelivery

import (
	"net/http"

	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"
	"infucare-backend/pkg/auth"

	"github.com/gin-gonic/gin"
)

type SessionHandler struct {
	usecase *usecase.SessionUsecase
}

func NewSessionHandler(uc *usecase.SessionUsecase) *SessionHandler {
	return &SessionHandler{usecase: uc}
}

func (h *SessionHandler) StartSession(c *gin.Context) {
	var req domain.StartSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data input tidak valid atau kurang lengkap"})
		return
	}

	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	session, err := h.usecase.StartSession(unitID, req)
	if err != nil {
		if err.Error() == "patient not found in unit" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Pasien bukan milik unit Anda"})
			return
		}

		if err.Error() == "device is currently in use" {
			c.JSON(http.StatusConflict, gin.H{"error": "Perangkat ini sedang digunakan pada pasien lain!"})
			return
		}

		if err.Error() == "device not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Perangkat keras tidak ditemukan"})
			return
		}

		if err.Error() == "device is offline or unreachable" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Perangkat sedang mati atau hilang sinyal. Pastikan alat menyala."})
			return
		}
		
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai sesi infus"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Sesi infus berhasil dimulai",
		"data": session,
	})
}

func (h *SessionHandler) TareSession(c *gin.Context) {
	sessionID := c.Param("id")

	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	session, err := h.usecase.TareSession(unitID, sessionID)
	if err != nil {
		if err.Error() == "unauthorized session access" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Sesi bukan milik unit Anda"})
			return
		}

		if err.Error() == "session not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sesi tidak ditemukan"})
			return
		}

		if err.Error() == "session already ended" {
			c.JSON(http.StatusBadRequest, gin.H{"error" : "Sesi infus ni sudah berakhir"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbaharui data tare"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Kalibrasi tare berhasil, botol telah ditambahkan",
		"data": session,
	})
}

func (h *SessionHandler) UpdateSessionTpm(c *gin.Context) {
	sessionID := c.Param("id")
	var req domain.UpdateTpmRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data input target TPM tidak valid"})
		return
	}

	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	err := h.usecase.UpdateTpm(unitID, sessionID, req.TargetTpm)
	if err != nil {
		if err.Error() == "unauthorized session access" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Sesi bukan milik unit Anda"})
			return
		}

		if err.Error() == "active session not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sesi aktif tidak ditemukan"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan TPM ke database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Target TPM berhasil diperbaharui dan dikirim ke alat",
		"target_tpm": req.TargetTpm,
	})
}

func (h *SessionHandler) EndSession(c *gin.Context) {
	sessionID := c.Param("id")

	unitIDRaw, exists := c.Get(auth.ContextKeyUnitID)
	if !exists || unitIDRaw == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Identitas instansi (Unit ID) tidak valid dalam sesi"})
		return
	}

	unitID := uint(unitIDRaw.(float64))

	err := h.usecase.EndSession(unitID, sessionID)
	if err != nil {
		if err.Error() == "unauthorized session access" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Sesi bukan milik unit Anda"})
			return
		}

		if err.Error() == "active session not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sesi aktif tidak ditemukan"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengakhiri sesi di database"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Sesi infus diakhiri. Aktuator telah diperintahkan untuk membuka kuncina selang.",
	})
}