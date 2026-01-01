package models

type User struct {
	ID         int64  `json:"id"`
	Username   string `json:"username"`
	DOB        string `json:"dob"`
	Gender     string `json:"gender"`
	IPAddress  string `json:"ip_address"`
	UserStatus string `json:"user_status"`
}
