package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/ujjwalkirti/chatterbase-backend-go/config"
)

// RegisterRoutes mounts all auth-related endpoints on the router group.
func RegisterRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	auth.POST("/guest-login", guestLogin)
	auth.POST("/guest-logout", guestLogout)
	auth.POST("/register-permanent", registerPermanent)
	auth.POST("/login-permanent", loginPermanent)
	auth.POST("/register", register)
	auth.POST("/heartbeat", guestHeartbeat)
	auth.POST("/verify", verify)
	auth.POST("/logout", logout)
}

// guestLogin handles zero-password anonymous login with Redis username locking
func guestLogin(c *gin.Context) {
	_ = godotenv.Load()
	var body GuestLoginRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid body"})
		return
	}

	body.Username = strings.TrimSpace(body.Username)
	if body.Username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Username is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1. Check if username is taken by a permanent user
	var existingPermID int64
	err := config.Pool.QueryRow(ctx, "SELECT id FROM users WHERE username = $1 AND user_status = $2", body.Username, UserStatusPermanent).Scan(&existingPermID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Username is taken by a permanent account"})
		return
	}

	// 2. Check if username is currently locked by an active guest in Redis
	active, err := IsGuestActive(ctx, body.Username)
	if err == nil && active {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Username is currently in use"})
		return
	}

	// 3. Serialize deviceDetails if present
	var deviceJSON []byte
	if body.DeviceDetails != nil {
		deviceJSON, _ = json.Marshal(body.DeviceDetails)
	}

	// 4. Create anonymous user record
	var userID int64
	err = config.Pool.QueryRow(ctx,
		"INSERT INTO users (username, dob, gender, ip_address, device_details, user_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
		body.Username, body.DOB, body.Gender, body.IPAddress, deviceJSON, UserStatusAnonymous,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create guest user"})
		return
	}

	// 5. Acquire Redis lock with default TTL
	acquired, err := AcquireGuestUsername(ctx, body.Username, userID, DefaultGuestSessionTTL)
	if err != nil || !acquired {
		// Rollback/archive user if lock acquisition failed
		_ = ReleaseGuestUsername(ctx, body.Username, userID)
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Username is currently in use"})
		return
	}

	// 6. Generate JWT token
	tok, err := GenerateToken(body.Username, body.Gender, body.DOB, UserStatusAnonymous)
	if err != nil {
		_ = ReleaseGuestUsername(ctx, body.Username, userID)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to generate token"})
		return
	}

	_, _ = config.Pool.Exec(ctx, "INSERT INTO tokens (username, token, device_fingerprint) VALUES ($1, $2, $3)", body.Username, tok, "")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Guest login successful",
		"data": gin.H{
			"token": tok,
			"user": gin.H{
				"id":          userID,
				"username":    body.Username,
				"dob":         body.DOB,
				"gender":      body.Gender,
				"user_status": UserStatusAnonymous,
			},
		},
	})
}

// guestLogout releases the active Redis username lock and archives the user in PostgreSQL
func guestLogout(c *gin.Context) {
	var body struct {
		Token string `json:"token"`
	}
	_ = c.ShouldBindJSON(&body)

	tokenStr := body.Token
	if tokenStr == "" {
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}

	if tokenStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Token is required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var t Token
	row := config.Pool.QueryRow(ctx, "SELECT id, username FROM tokens WHERE token = $1 AND expired = false", tokenStr)
	if err := row.Scan(&t.ID, &t.Username); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid token"})
		return
	}

	// Release Redis lock and set user_status = 'archived' in PostgreSQL
	_ = ReleaseGuestUsername(ctx, t.Username, 0)
	_, _ = config.Pool.Exec(ctx, "UPDATE tokens SET expired = true WHERE id = $1", t.ID)

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Guest logged out successfully"})
}

// registerPermanent creates a persistent authenticated user account
func registerPermanent(c *gin.Context) {
	_ = godotenv.Load()
	var body PermanentRegisterRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid body"})
		return
	}

	body.Username = strings.TrimSpace(body.Username)
	body.Email = strings.TrimSpace(strings.ToLower(body.Email))

	if body.Username == "" || body.Email == "" || len(body.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Username, valid email, and password (min 6 characters) are required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Check permanent username collision
	var existingID int64
	err := config.Pool.QueryRow(ctx, "SELECT id FROM users WHERE username = $1 AND user_status = $2", body.Username, UserStatusPermanent).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Username already exists"})
		return
	}

	// Check email collision
	err = config.Pool.QueryRow(ctx, "SELECT id FROM users WHERE email = $1 AND user_status = $2", body.Email, UserStatusPermanent).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Email already exists"})
		return
	}

	// Check if username is currently active guest in Redis
	active, err := IsGuestActive(ctx, body.Username)
	if err == nil && active {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Username is currently in use by an active guest"})
		return
	}

	hashedPassword, err := HashPassword(body.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to hash password"})
		return
	}

	var deviceJSON []byte
	if body.DeviceDetails != nil {
		deviceJSON, _ = json.Marshal(body.DeviceDetails)
	}

	var userID int64
	err = config.Pool.QueryRow(ctx,
		"INSERT INTO users (username, email, dob, gender, password, ip_address, device_details, user_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
		body.Username, body.Email, body.DOB, body.Gender, hashedPassword, body.IPAddress, deviceJSON, UserStatusPermanent,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create user"})
		return
	}

	tok, err := GenerateToken(body.Username, body.Gender, body.DOB, UserStatusPermanent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to generate token"})
		return
	}

	_, _ = config.Pool.Exec(ctx, "INSERT INTO tokens (username, token, device_fingerprint) VALUES ($1, $2, $3)", body.Username, tok, "")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User registered successfully",
		"data": gin.H{
			"token": tok,
			"user": gin.H{
				"id":          userID,
				"username":    body.Username,
				"email":       body.Email,
				"dob":         body.DOB,
				"gender":      body.Gender,
				"user_status": UserStatusPermanent,
			},
		},
	})
}

// loginPermanent authenticates permanent users via username/email and password
func loginPermanent(c *gin.Context) {
	_ = godotenv.Load()
	var body PermanentLoginRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid body"})
		return
	}

	identifier := strings.TrimSpace(body.Identifier)
	if identifier == "" || body.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Identifier and password are required"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var u User
	err := config.Pool.QueryRow(ctx,
		"SELECT id, username, email, dob, gender, password, user_status FROM users WHERE (LOWER(email) = LOWER($1) OR username = $1) AND user_status = $2",
		identifier, UserStatusPermanent,
	).Scan(&u.ID, &u.Username, &u.Email, &u.DOB, &u.Gender, &u.Password, &u.UserStatus)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid credentials"})
		return
	}

	if !CheckPasswordHash(body.Password, u.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid credentials"})
		return
	}

	tok, err := GenerateToken(u.Username, u.Gender, u.DOB, UserStatusPermanent)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to generate token"})
		return
	}

	_, _ = config.Pool.Exec(ctx, "INSERT INTO tokens (username, token, device_fingerprint) VALUES ($1, $2, $3)", u.Username, tok, "")

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Login successful",
		"data": gin.H{
			"token": tok,
			"user": gin.H{
				"id":          u.ID,
				"username":    u.Username,
				"email":       u.Email,
				"dob":         u.DOB,
				"gender":      u.Gender,
				"user_status": u.UserStatus,
			},
		},
	})
}

// register handles legacy/generic registration calls (backward compatibility)
func register(c *gin.Context) {
	_ = godotenv.Load()
	var body RegisterRequest
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid body"})
		return
	}
	if body.UserStatus == "" {
		if body.Password != "" {
			body.UserStatus = UserStatusPermanent
		} else {
			body.UserStatus = UserStatusAnonymous
		}
	}
	if body.UserStatus != UserStatusPermanent && body.UserStatus != UserStatusAnonymous {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Invalid user status",
		})
		return
	}

	if body.UserStatus == UserStatusPermanent {
		// Delegate to permanent registration
		permReq := PermanentRegisterRequest{
			Username:      body.Username,
			Email:         body.Username + "@chatterbase.local",
			Password:      body.Password,
			Gender:        body.Gender,
			DOB:           body.DOB,
			IPAddress:     body.IPAddress,
			DeviceDetails: body.DeviceDetails,
		}
		if body.Password == "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Password is required for permanent users"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		var existingID int64
		err := config.Pool.QueryRow(ctx, "SELECT id FROM users WHERE username=$1 AND user_status=$2", body.Username, UserStatusPermanent).Scan(&existingID)
		if err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "User already exists"})
			return
		}

		hashedPassword, err := HashPassword(body.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to hash password"})
			return
		}

		var deviceJSON []byte
		if permReq.DeviceDetails != nil {
			deviceJSON, _ = json.Marshal(permReq.DeviceDetails)
		}

		var userID int64
		_ = config.Pool.QueryRow(ctx,
			"INSERT INTO users (username, email, dob, gender, password, ip_address, device_details, user_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",
			permReq.Username, permReq.Email, permReq.DOB, permReq.Gender, hashedPassword, permReq.IPAddress, deviceJSON, UserStatusPermanent,
		).Scan(&userID)

		tok, _ := GenerateToken(body.Username, body.Gender, body.DOB, UserStatusPermanent)
		_, _ = config.Pool.Exec(ctx, "INSERT INTO tokens (username, token, device_fingerprint) VALUES ($1,$2,$3)", body.Username, tok, "")
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "User registered successfully", "data": gin.H{"token": tok}})
		return
	}

	// Otherwise anonymous
	guestReq := GuestLoginRequest{
		Username:      body.Username,
		Gender:        body.Gender,
		DOB:           body.DOB,
		IPAddress:     body.IPAddress,
		DeviceDetails: body.DeviceDetails,
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var existingID int64
	err := config.Pool.QueryRow(ctx, "SELECT id FROM users WHERE username=$1 AND user_status=$2", body.Username, UserStatusPermanent).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "User already exists"})
		return
	}

	// Check if username is currently locked by an active guest in Redis
	active, err := IsGuestActive(ctx, guestReq.Username)
	if err == nil && active {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Username is currently in use"})
		return
	}

	var deviceJSON []byte
	if guestReq.DeviceDetails != nil {
		deviceJSON, _ = json.Marshal(guestReq.DeviceDetails)
	}

	var userID int64
	err = config.Pool.QueryRow(ctx,
		"INSERT INTO users (username, dob, gender, ip_address, device_details, user_status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
		guestReq.Username, guestReq.DOB, guestReq.Gender, guestReq.IPAddress, deviceJSON, UserStatusAnonymous,
	).Scan(&userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to create guest user"})
		return
	}

	acquired, err := AcquireGuestUsername(ctx, guestReq.Username, userID, DefaultGuestSessionTTL)
	if err != nil || !acquired {
		_ = ReleaseGuestUsername(ctx, guestReq.Username, userID)
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Username is currently in use"})
		return
	}

	tok, err := GenerateToken(body.Username, body.Gender, body.DOB, UserStatusAnonymous)
	if err != nil {
		_ = ReleaseGuestUsername(ctx, guestReq.Username, userID)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to generate token"})
		return
	}
	_, _ = config.Pool.Exec(ctx, "INSERT INTO tokens (username, token, device_fingerprint) VALUES ($1,$2,$3)", body.Username, tok, "")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User registered successfully",
		"data": gin.H{
			"token": tok,
			"user": gin.H{
				"id":          userID,
				"username":    body.Username,
				"dob":         body.DOB,
				"gender":      body.Gender,
				"user_status": UserStatusAnonymous,
			},
		},
	})
}

// verify checks whether a provided JWT token is valid and not expired.
func verify(c *gin.Context) {
	var body struct {
		Token string `json:"token"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid body"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tokens := config.Pool
	var t Token
	row := tokens.QueryRow(ctx, "SELECT id, username FROM tokens WHERE token=$1 AND expired=false", body.Token)
	if err := row.Scan(&t.ID, &t.Username); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid token"})
		return
	}

	claims, err := VerifyToken(body.Token)
	if err != nil {
		if err == ErrTokenExpired {
			if parsed, perr := ParseToken(body.Token); perr == nil {
				if un, ok := parsed["username"].(string); ok && un != "" {
					config.Pool.Exec(ctx, "UPDATE tokens SET expired=true WHERE token=$1", body.Token)
					_ = ReleaseGuestUsername(ctx, un, 0)
				}
			}
		}

		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Token is valid", "data": claims})
}

// logout handles general logout for both guest and permanent users
func logout(c *gin.Context) {
	var body struct {
		Token string `json:"token"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid body"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tokens := config.Pool
	var t Token
	row := tokens.QueryRow(ctx, "SELECT id, username FROM tokens WHERE token=$1 AND expired=false", body.Token)
	if err := row.Scan(&t.ID, &t.Username); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid token"})
		return
	}

	// Mark token expired
	_, _ = tokens.Exec(ctx, "UPDATE tokens SET expired=true WHERE id=$1", t.ID)

	// If claims show anonymous (or active in redis), release and archive
	if claims, err := ParseToken(body.Token); err == nil && claims != nil {
		if status, ok := claims["user_status"].(string); ok && status == UserStatusAnonymous {
			_ = ReleaseGuestUsername(ctx, t.Username, 0)
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "User logged out successfully"})
}

// guestHeartbeat renews the active Redis lock TTL for an active guest session
func guestHeartbeat(c *gin.Context) {
	var body struct {
		Token string `json:"token"`
	}
	_ = c.ShouldBindJSON(&body)
	tokenStr := body.Token
	if tokenStr == "" {
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}
	if tokenStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Token is required"})
		return
	}

	claims, err := VerifyToken(tokenStr)
	if err != nil || claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid token"})
		return
	}

	username, _ := claims["username"].(string)
	userStatus, _ := claims["user_status"].(string)
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Username missing from token"})
		return
	}

	if userStatus == UserStatusAnonymous {
		renewed, err := RenewGuestHeartbeat(c.Request.Context(), username, DefaultGuestSessionTTL)
		if err != nil || !renewed {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Guest session expired or not found"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Heartbeat acknowledged"})
}

