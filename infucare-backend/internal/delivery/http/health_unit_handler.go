package httpdelivery

import (
	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"
	"net/http"

	"github.com/gin-gonic/gin"
)

type HealthUnitHandler struct {
	usecase *usecase.HealthUnitUsecase
}

func NewHealthUnitUsecase(uc *usecase.HealthUnitUsecase) *HealthUnitHandler {
	return &HealthUnitHandler{usecase: uc}
}

func (h *HealthUnitHandler) GetHealthUnits(c *gin.Context) {
	units, err := h.usecase.GetAllUnits()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data instansi kesehatan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Data instansi kesehatan berhasil diambil",
		"data": units,
	})
}

func (h *HealthUnitHandler) CreateHealthUnit(c *gin.Context) {
	var req domain.HealthUnitCreateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	unit, err := h.usecase.CreateUnit(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data instansi kesehatan"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Instansi kesehatan berhasil ditambahkan",
		"data": unit,
	})
}