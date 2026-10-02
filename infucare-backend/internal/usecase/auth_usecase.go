package usecase

import (
	"errors"
	"os"
	"time"

	"infucare-backend/internal/domain"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthUsecase struct {
	db *gorm.DB
}

func NewAuthUsecase(db *gorm.DB) *AuthUsecase {
	return &AuthUsecase{db: db}
}

// Login validates credentials and generates a JWT token.
func (u *AuthUsecase) Login(req domain.LoginRequest) (domain.LoginResponse, error) {
	var user domain.User

	if err := u.db.Where("username = ?", req.Username).First(&user).Error; err != nil {
		return domain.LoginResponse{}, errors.New("invalid credentials")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return domain.LoginResponse{}, errors.New("invalid credentials")
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return domain.LoginResponse{}, errors.New("internal server error")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  user.ID,
		"unit_id":  user.UnitID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return domain.LoginResponse{}, errors.New("failed to generate token")
	}

	return domain.LoginResponse{
		Token: tokenString,
		User: domain.UserResponse{
			ID:       user.ID,
			UnitID:   user.UnitID,
			Name:     user.Name,
			Username: user.Username,
			Role:     user.Role,
		},
	}, nil
}