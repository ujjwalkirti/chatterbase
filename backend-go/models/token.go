package models

import "time"

type Token struct {
	ID                int64     `json:"id"`
	Username          string    `json:"username"`
	Token             string    `json:"token"`
	DeviceFingerprint string    `json:"deviceFingerprint"`
	Expired           bool      `json:"expired"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}
