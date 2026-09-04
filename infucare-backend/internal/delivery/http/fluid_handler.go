package httpdelivery

import (
	"net/http"

	"infucare-backend/internal/domain"
	"infucare-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type FluidHandler struct {
	usecase *usecase.FluidUsecase
}

func NewFluidHandler(uc *usecase.FluidUsecase) *FluidHandler {
	return &FluidHandler{usecase: uc}
}

func (h *FluidHandler) CreateFluidProfile(c *gin.Context) {
	var req domain.FluidCreateRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	fluid, err := h.usecase.CreateFluid(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data cairan infus"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Cairan infus berhasil ditambahkan",
		"data": fluid,
	})
}

func (h *FluidHandler) GetFluidProfiles( c *gin.Context) {
	fluids, err := h.usecase.GetAllFluids()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error" : "Gagal mengambil data cairan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message" : "Data cairan berhasil diambil",
		"data": fluids,
	})
}