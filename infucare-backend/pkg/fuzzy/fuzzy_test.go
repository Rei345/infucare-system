package fuzzy

import (
	"math"
	"testing"
)

// 1. Menguji fungsi derajat keanggotaan Berat (HitungFuzzBerat)
func TestHitungFuzzBerat(t *testing.T) {
	tests := []struct {
		name 		string
		inputBerat 	float64
		wantSedikit float64
		wantSedang 	float64
		wantBanyak 	float64
	}{
		{
			name: "Berat <= 100g harus 100% Sedikit",
			inputBerat: 50,
			wantSedikit: 1.0,
			wantSedang: 0.0,
			wantBanyak: 0.0,
		},
		{
			name: "Berat 150g berada di transisi Sedikit (0.5) dan Sedang (0.33)",
			inputBerat: 150,
			wantSedikit: 0.5,
			wantSedang: 50.0 / 150.0,
			wantBanyak: 0.0,
		},
		{
			name: "Berat 250g harus 100% Sedang",
			inputBerat: 250,
			wantSedikit: 0.0,
			wantSedang: 1.0,
			wantBanyak: 0.0,
		},
		{
			name: "Berat >= 400g harus 100% Banyak",
			inputBerat: 450,
			wantSedikit: 0.0,
			wantSedang: 0.0,
			wantBanyak: 1.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := HitungFuzzBerat(tt.inputBerat)

			if math.Abs(got.Sedikit-tt.wantSedikit) > 0.001 {
				t.Errorf("Sedikit = %v, want %v", got.Sedikit, tt.wantSedikit)
			}
			if math.Abs(got.Sedang-tt.wantSedang) > 0.001 {
				t.Errorf("Sedang = %v, want %v", got.Sedang, tt.wantSedang)
			}
			if math.Abs(got.Banyak-tt.wantBanyak) > 0.001 {
				t.Errorf("Banyak = %v, want %v", got.Banyak, tt.wantBanyak)
			}
		})
	}
}

// 2. Menguji fungsi utama inferensi Tsukamoto
func TestCalculateEstimatedTime(t *testing.T) {
	tests := []struct {
		name 		string
		berat 		float64
		tpm 		float64
		wantMenit 	float64
	}{
		{
			name: "Edge Case: Cairan habis (Berat <= 0) harus return 0 menit",
			berat: 0,
			tpm: 30,
			wantMenit: 0,
		},
		{
			name: "Edge Case: Infus macet/oklusi (TPM <= 0) harus return fallback 600 menit",
			berat: 250,
			tpm: 0,
			wantMenit: 600,
		},
		{
			name: "Rule 1 Murni: Berat Sedikit (20g) & TPM Cepat (60) -> Waktu Singkat (120 menit)",
			berat: 20,
			tpm: 60,
			wantMenit: 120,
		},
		{
			name: "Rule 5 Murni: Berat Sedang (250g) & TPM Sedang (30) -> Waktu Sedang (300 menit)",
			berat: 250,
			tpm: 30,
			wantMenit: 300,
		},
		{
			name: "Rule 9 Murni: Berat Banyak (450g) & TPM Lambat (10) -> Waktu Lama (480 menit)",
			berat: 450,
			tpm: 10,
			wantMenit: 480,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := CalculateEstimatedTime(tt.berat, tt.tpm)
			if math.Abs(got-tt.wantMenit) > 0.001 {
				t.Errorf("CalculateEstimatedTime(%v, %v) = %.2f menit, want %.2f menit", 
					tt.berat, tt.tpm, got, tt.wantMenit)
			} else {
				t.Logf("[OK] Berat: %.0fg, ,TPM: %.0f -> Estimasi: %.2f menit (%.2f jam)", 
					tt.berat, tt.tpm, got, got/60.0)	
			}
		})
	}
}