package auth

import (
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	UserStatusAnonymous = "anonymous"
	UserStatusPermanent = "permanent"
	UserStatusArchived  = "archived"
)

// GuestLoginRequest represents the payload for guest/anonymous login
type GuestLoginRequest struct {
	Username      string                 `json:"username" binding:"required"`
	Gender        string                 `json:"gender" binding:"required"`
	DOB           string                 `json:"dob" binding:"required"`
	IPAddress     string                 `json:"ip_address,omitempty"`
	DeviceDetails map[string]interface{} `json:"deviceDetails,omitempty"`
}

// PermanentRegisterRequest represents the payload for registering a permanent user
type PermanentRegisterRequest struct {
	Username      string                 `json:"username" binding:"required"`
	Email         string                 `json:"email" binding:"required"`
	Password      string                 `json:"password" binding:"required"`
	Gender        string                 `json:"gender" binding:"required"`
	DOB           string                 `json:"dob" binding:"required"`
	IPAddress     string                 `json:"ip_address,omitempty"`
	DeviceDetails map[string]interface{} `json:"deviceDetails,omitempty"`
}

// PermanentLoginRequest represents the payload for logging in as a permanent user
type PermanentLoginRequest struct {
	Identifier    string                 `json:"identifier" binding:"required"` // email or username
	Password      string                 `json:"password" binding:"required"`
	DeviceDetails map[string]interface{} `json:"deviceDetails,omitempty"`
}

// RegisterRequest represents the incoming registration payload from older clients (kept for compatibility)
type RegisterRequest struct {
	Username      string                 `json:"username" binding:"required"`
	Gender        string                 `json:"gender" binding:"required"`
	DOB           string                 `json:"dob" binding:"required"`
	Password      string                 `json:"password,omitempty"`
	UserStatus    string                 `json:"user_status,omitempty"`
	IPAddress     string                 `json:"ip_address,omitempty"`
	DeviceDetails map[string]interface{} `json:"deviceDetails,omitempty"`
}

// User represents the stored user record in the database
type User struct {
	ID            int64                  `json:"id"`
	Username      string                 `json:"username"`
	Email         string                 `json:"email,omitempty"`
	Gender        string                 `json:"gender"`
	DOB           string                 `json:"dob"`
	Password      string                 `json:"-"` // Don't expose password in JSON responses
	IPAddress     string                 `json:"ip_address,omitempty"`
	DeviceDetails map[string]interface{} `json:"deviceDetails,omitempty"`
	UserStatus    string                 `json:"user_status"`
	CreatedAt     time.Time              `json:"createdAt"`
	UpdatedAt     time.Time              `json:"updatedAt"`
}

type Token struct {
	ID                int64     `json:"id"`
	Username          string    `json:"username"`
	Token             string    `json:"token"`
	DeviceFingerprint string    `json:"deviceFingerprint"`
	Expired           bool      `json:"expired"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// HashPassword hashes a plain text password using bcrypt with DefaultCost (10)
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPasswordHash compares a bcrypt hashed password with its possible plaintext equivalent
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

