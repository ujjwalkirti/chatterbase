package services

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrTokenExpired = errors.New("token expired")

func GenerateToken(username, gender, dob, userStatus string) (string, error) {
	claims := jwt.MapClaims{
		"username":    username,
		"gender":      gender,
		"dob":         dob,
		"user_status": userStatus,
		"exp":         time.Now().Add(2 * time.Hour).Unix(),
	}
	secret := os.Getenv("ACCESS_TOKEN_SECRET")
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func VerifyToken(tokenStr string) (jwt.MapClaims, error) {
	secret := os.Getenv("ACCESS_TOKEN_SECRET")
	t, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, err
	}
	if claims, ok := t.Claims.(jwt.MapClaims); ok && t.Valid {
		return claims, nil
	}
	return nil, nil
}

func ParseToken(tokenStr string) (jwt.MapClaims, error) {
	secret := os.Getenv("ACCESS_TOKEN_SECRET")
	t, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims, ok := t.Claims.(jwt.MapClaims); ok {
		return claims, nil
	}
	return nil, nil
}
