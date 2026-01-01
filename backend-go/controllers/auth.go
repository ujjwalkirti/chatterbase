package controllers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"

	"github.com/your-username/chatterbase-backend-go/config"
	"github.com/your-username/chatterbase-backend-go/models"
	"github.com/your-username/chatterbase-backend-go/services"
)

func RegisterRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	auth.POST("/register", register)
	auth.POST("/verify", verify)
	auth.POST("/logout", logout)
}

func register(c *gin.Context) {
	_ = godotenv.Load()
	var body struct {
		Username      string                 `json:"username"`
		DOB           string                 `json:"dob"`
		Gender        string                 `json:"gender"`
		IPAddress     string                 `json:"ip_address"`
		DeviceDetails map[string]interface{} `json:"deviceDetails"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid body"})
		return
	}
	if body.Username == "" || body.DOB == "" || body.Gender == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "User details not provided"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// check if user exists
	var userID int64
	err := config.Pool.QueryRow(ctx, "SELECT id FROM users WHERE username=$1", body.Username).Scan(&userID)
	if err == nil {
		// user exists, check for token
		var tokenID int64
		err := config.Pool.QueryRow(ctx, "SELECT id FROM tokens WHERE username=$1 AND expired=false LIMIT 1", body.Username).Scan(&tokenID)
		if err == nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "User already exists"})
			return
		}
		// issue token
		tok, _ := services.GenerateToken(body.Username, body.Gender, body.DOB, "active")
		_, _ = config.Pool.Exec(ctx, "INSERT INTO tokens (username, token, device_fingerprint) VALUES ($1,$2,$3)", body.Username, tok, "")
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "User logged in successfully", "data": gin.H{"token": tok}})
		return
	}

	// create user
	_, _ = config.Pool.Exec(ctx, "INSERT INTO users (username, dob, gender, ip_address, user_status) VALUES ($1,$2,$3,$4,$5)", body.Username, body.DOB, body.Gender, body.IPAddress, "active")
	tok, _ := services.GenerateToken(body.Username, body.Gender, body.DOB, "active")
	_, _ = config.Pool.Exec(ctx, "INSERT INTO tokens (username, token, device_fingerprint) VALUES ($1,$2,$3)", body.Username, tok, "")
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "User registered successfully", "data": gin.H{"token": tok}})
}

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
	tokens := config.Client.Database("chatterbase").Collection("tokens")
	var t models.Token
	if err := tokens.FindOne(ctx, bson.M{"token": body.Token, "expired": false}).Decode(&t); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid token"})
		return
	}
	claims, err := services.VerifyToken(body.Token)
	if err != nil {
		// expired or invalid
		// If token expired, mirror Node behaviour: delete user and mark token expired
		if err == services.ErrTokenExpired {
			// attempt to decode username from token
			if parsed, perr := services.ParseToken(body.Token); perr == nil {
				username := parsed["username"].(string)
				config.Pool.Exec(ctx, "UPDATE tokens SET expired=true WHERE token=$1", body.Token)
				config.Pool.Exec(ctx, "DELETE FROM users WHERE username=$1", username)
			}
		}
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Token is valid", "data": claims})
}

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
	var t models.Token
	row := tokens.QueryRow(ctx, "SELECT id, username FROM tokens WHERE token=$1 AND expired=false", body.Token)
	if err := row.Scan(&t.ID, &t.Username); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid token"})
		return
	}
	// mark expired and delete user
	_, _ = tokens.Exec(ctx, "UPDATE tokens SET expired=true WHERE id=$1", t.ID)
	_, _ = tokens.Exec(ctx, "DELETE FROM users WHERE username=$1", t.Username)
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "User logged out successfully"})
}
