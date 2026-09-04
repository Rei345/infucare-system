package httpdelivery

import (
	"net/http"

	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"

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

	session, err := h.usecase.StartSession(req)
	if err != nil {
		if err.Error() == "device is currently in use" {
			c.JSON(http.StatusConflict, gin.H{"error": "Perangkat ini sedang digunakan pada aktif lain!"})
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

	session, err := h.usecase.TareSession(sessionID)
	if err != nil {
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

	err := h.usecase.UpdateTpm(sessionID, req.TargetTpm)
	if err != nil {
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

	err := h.usecase.EndSession(sessionID)
	if err != nil {
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