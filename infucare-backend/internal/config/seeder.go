package config

import (
	"log"

	"infucare-backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func SeedDatabase(db *gorm.DB) error {
	var unitCount int64
	if err := db.Model(&domain.HealthUnit{}).Count(&unitCount).Error; err != nil {
		return err
	}

	if unitCount == 0 {
		unit := domain.HealthUnit{
			Name:     "POSKESDES Lumban Jaean",
			Address:  "Desa Lumban Jaean",
			UnitCode: "POS-001", 
		}
		if err := db.Create(&unit).Error; err != nil {
			return err
		}
		log.Println("[SEEDER] Health Unit default berhasil dibuat.")
	}

	var userCount int64
	if err := db.Model(&domain.User{}).Count(&userCount).Error; err != nil {
		return err
	}

	if userCount == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		user := domain.User{
			UnitID:   1,
			Username: "bidan_desa",
			Password: string(hashedPassword),
			Role:     "BIDAN",
			Name:     "Bidan Utama",
		}

		if err := db.Create(&user).Error; err != nil {
			return err
		}
		log.Println("[SEEDER] Akun Bidan default berhasil dibuat.")
	}

	return nil
}