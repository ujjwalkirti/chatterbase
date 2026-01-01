package controllers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"

	"github.com/ujjwalkirti/chatterbase-backend-go/config"
	"github.com/ujjwalkirti/chatterbase-backend-go/middlewares"
	"github.com/ujjwalkirti/chatterbase-backend-go/models"
)

func RegisterChatRoutes(rg *gin.RouterGroup) {
	chat := rg.Group("/chatroom")
	chat.GET("/", getAll)
	chat.POST("/create", create)
	chat.POST("/enter", middlewares.JWTAuthMiddleware(), enter)
	chat.GET("/:roomId/messages", middlewares.JWTAuthMiddleware(), getMessages)
}

func getAll(c *gin.Context) {
	_ = godotenv.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	rows, err := config.Pool.Query(ctx, "SELECT id, name, description, participant_count, participants FROM chatrooms ORDER BY participant_count DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Internal Server Error"})
		return
	}
	defer rows.Close()
	var rooms []models.Chatroom
	for rows.Next() {
		var r models.Chatroom
		var participants []string
		if err := rows.Scan(&r.ID, &r.Name, &r.Description, &r.ParticipantCount, &participants); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Internal Server Error"})
			return
		}
		r.Participants = participants
		rooms = append(rooms, r)
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Chat rooms fetched successfully", "data": rooms})
}

func create(c *gin.Context) {
	var body struct {
		ChatRoomDetails models.Chatroom `json:"chatRoomDetails"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid body"})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	body.ChatRoomDetails.ParticipantCount = 0
	participants := "{}"
	row := config.Pool.QueryRow(ctx, "INSERT INTO chatrooms (name, description, participant_count, participants) VALUES ($1,$2,$3,$4) RETURNING id", body.ChatRoomDetails.Name, body.ChatRoomDetails.Description, 0, participants)
	var id int64
	if err := row.Scan(&id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Internal Server Error"})
		return
	}
	obj := models.Chatroom{ID: id, Name: body.ChatRoomDetails.Name, Description: body.ChatRoomDetails.Description, ParticipantCount: 0, Participants: []string{}}
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Chat room created successfully", "data": obj})
}

func enter(c *gin.Context) {
	var body struct {
		ChatroomId string `json:"chatroomId"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid body", "error": err})
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	// parse id
	id, err := strconv.ParseInt(body.ChatroomId, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid chatroom ID"})
		return
	}
	// get current room
	row := config.Pool.QueryRow(ctx, "SELECT id, name, description, participant_count, participants FROM chatrooms WHERE id=$1", id)
	var room models.Chatroom
	var participants []string
	if err := row.Scan(&room.ID, &room.Name, &room.Description, &room.ParticipantCount, &participants); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Chat room not found"})
		return
	}
	room.Participants = participants
	// username from auth middleware
	user, _ := c.Get("user")
	claims := user.(jwt.MapClaims)
	username := ""
	if v, ok := claims["username"]; ok {
		username = v.(string)
	}
	// only add participant if not already in the list
	alreadyExists := false
	for _, p := range room.Participants {
		if p == username {
			alreadyExists = true
			break
		}
	}
	if !alreadyExists {
		room.ParticipantCount += 1
		room.Participants = append(room.Participants, username)

		// update
		_, _ = config.Pool.Exec(ctx, "UPDATE chatrooms SET participant_count=$1, participants=$2 WHERE id=$3", room.ParticipantCount, room.Participants, room.ID)
		// publish JOIN-GROUPS via redis for real-time listeners
		_ = config.RedisClient.Publish(context.Background(), "JOIN-GROUPS", room)
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Entered chat room successfully", "data": room})
	} else {
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Already joined the chat room successfully.", "data": room})
	}

}

func getMessages(c *gin.Context) {
	roomId := c.Param("roomId")
	if roomId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Room ID is required"})
		return
	}

	// Parse query params for pagination
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	messages, err := models.GetMessagesByRoom(ctx, roomId, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "Failed to fetch messages", "error": err.Error()})
		return
	}

	if messages == nil {
		messages = []models.Message{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Messages fetched successfully",
		"data":    messages,
	})
}
