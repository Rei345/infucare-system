package fuzzy

import (
	"math"
)

// FuzzBerat represents the fuzzy membership degrees for fluid weight.
type FuzzBerat struct {
	Sedikit float64
	Sedang  float64
	Banyak  float64
}

// FuzzTPM represents the fuzzy membership degrees for drops per minute.
type FuzzTPM struct {
	Lambat float64
	Sedang float64
	Cepat  float64
}

// HitungFuzzBerat fuzzifies the fluid weight input (0 - 500 grams).
func HitungFuzzBerat(x float64) FuzzBerat {
	var fb FuzzBerat

	if x <= 100 {
		fb.Sedikit = 1
	} else if x > 100 && x <= 200 {
		fb.Sedikit = (200 - x) / 100
	} else {
		fb.Sedikit = 0
	}

	if x <= 100 || x >= 400 {
		fb.Sedang = 0
	} else if x > 100 && x <= 250 {
		fb.Sedang = (x - 100) / 150
	} else if x > 250 && x < 400 {
		fb.Sedang = (400 - x) / 150
	}

	if x <= 300 {
		fb.Banyak = 0
	} else if x > 300 && x <= 400 {
		fb.Banyak = (x - 300) / 100
	} else {
		fb.Banyak = 1
	}

	return fb
}

// HitungFuzzTPM fuzzifies the drops per minute input (0 - 60 TPM).
func HitungFuzzTPM(y float64) FuzzTPM {
	var ft FuzzTPM

	if y <= 15 {
		ft.Lambat = 1
	} else if y > 15 && y <= 25 {
		ft.Lambat = (25 - y) / 10
	} else {
		ft.Lambat = 0
	}

	if y <= 15 || y >= 45 {
		ft.Sedang = 0
	} else if y > 15 && y <= 30 {
		ft.Sedang = (y - 15) / 15
	} else if y > 30 && y < 45 {
		ft.Sedang = (45 - y) / 15
	}

	if y <= 35 {
		ft.Cepat = 0
	} else if y > 35 && y <= 45 {
		ft.Cepat = (y - 35) / 10
	} else {
		ft.Cepat = 1
	}

	return ft
}

// GetZSingkat calculates the inverse of the descending curve for short duration.
func GetZSingkat(alpha float64) float64 {
	return 240 - (alpha * 120)
}

// GetZSedang calculates the inverse of the ascending curve for medium duration.
func GetZSedang(alpha float64) float64 {
	return 120 + (alpha * 180)
}

// GetZLama calculates the inverse of the ascending curve for long duration.
func GetZLama(alpha float64) float64 {
	return 360 + (alpha * 120)
}

// CalculateEstimatedTime infers the estimated remaining infusion time in minutes using Tsukamoto FIS.
func CalculateEstimatedTime(berat float64, tpm float64) float64 {
	if berat <= 0 {
		return 0
	}
	if tpm <= 0 {
		return 600 // Maximum fallback threshold (10 hours) for occlusion
	}

	fBerat := HitungFuzzBerat(berat)
	fTPM := HitungFuzzTPM(tpm)

	var totalAlphaZ float64 = 0
	var totalAlpha float64 = 0

	// R1: IF Berat Sedikit AND TPM Cepat THEN Waktu Singkat
	if alpha := math.Min(fBerat.Sedikit, fTPM.Cepat); alpha > 0 {
		totalAlphaZ += alpha * GetZSingkat(alpha)
		totalAlpha += alpha
	}
	// R2: IF Berat Sedikit AND TPM Sedang THEN Waktu Singkat
	if alpha := math.Min(fBerat.Sedikit, fTPM.Sedang); alpha > 0 {
		totalAlphaZ += alpha * GetZSingkat(alpha)
		totalAlpha += alpha
	}
	// R3: IF Berat Sedikit AND TPM Lambat THEN Waktu Sedang
	if alpha := math.Min(fBerat.Sedikit, fTPM.Lambat); alpha > 0 {
		totalAlphaZ += alpha * GetZSedang(alpha)
		totalAlpha += alpha
	}
	// R4: IF Berat Sedang AND TPM Cepat THEN Waktu Singkat
	if alpha := math.Min(fBerat.Sedang, fTPM.Cepat); alpha > 0 {
		totalAlphaZ += alpha * GetZSingkat(alpha)
		totalAlpha += alpha
	}
	// R5: IF Berat Sedang AND TPM Sedang THEN Waktu Sedang
	if alpha := math.Min(fBerat.Sedang, fTPM.Sedang); alpha > 0 {
		totalAlphaZ += alpha * GetZSedang(alpha)
		totalAlpha += alpha
	}
	// R6: IF Berat Sedang AND TPM Lambat THEN Waktu Lama
	if alpha := math.Min(fBerat.Sedang, fTPM.Lambat); alpha > 0 {
		totalAlphaZ += alpha * GetZLama(alpha)
		totalAlpha += alpha
	}
	// R7: IF Berat Banyak AND TPM Cepat THEN Waktu Sedang
	if alpha := math.Min(fBerat.Banyak, fTPM.Cepat); alpha > 0 {
		totalAlphaZ += alpha * GetZSedang(alpha)
		totalAlpha += alpha
	}
	// R8: IF Berat Banyak AND TPM Sedang THEN Waktu Lama
	if alpha := math.Min(fBerat.Banyak, fTPM.Sedang); alpha > 0 {
		totalAlphaZ += alpha * GetZLama(alpha)
		totalAlpha += alpha
	}
	// R9: IF Berat Banyak AND TPM Lambat THEN Waktu Lama
	if alpha := math.Min(fBerat.Banyak, fTPM.Lambat); alpha > 0 {
		totalAlphaZ += alpha * GetZLama(alpha)
		totalAlpha += alpha
	}

	if totalAlpha == 0 {
		return 0
	}

	// Center of Average Defuzzification
	return totalAlphaZ / totalAlpha
}