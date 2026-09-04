package httpdelivery

import (
	"net/http"

	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	usecase *usecase.AuthUsecase
}

func NewAuthHandler(uc *usecase.AuthUsecase) *AuthHandler {
	return &AuthHandler{usecase: uc}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req domain.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request format"})
		return
	}

	res, err := h.usecase.Login(req)
	if err != nil {
		if err.Error() == "invalid credentials" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "username atau password salah"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "terjadi kesalahan pada server"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "login berhasil",
		"data":    res,
	})
}