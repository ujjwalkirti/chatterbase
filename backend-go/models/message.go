package models

import (
	"context"
	"time"

	"github.com/ujjwalkirti/chatterbase-backend-go/config"
)

type Message struct {
	ID        int64     `json:"id"`
	RoomID    string    `json:"roomId"`
	SenderID  string    `json:"senderId"`
	Message   string    `json:"message"`
	Type      string    `json:"type"` // "user" or "system"
	CreatedAt time.Time `json:"timestamp"`
}

// SaveMessage saves a new message to the database
func SaveMessage(ctx context.Context, roomID, senderID, message, msgType string) (*Message, error) {
	query := `
		INSERT INTO messages (room_id, sender_id, message, type, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, room_id, sender_id, message, type, created_at
	`

	now := time.Now()
	var msg Message
	err := config.Pool.QueryRow(ctx, query, roomID, senderID, message, msgType, now).Scan(
		&msg.ID,
		&msg.RoomID,
		&msg.SenderID,
		&msg.Message,
		&msg.Type,
		&msg.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &msg, nil
}

// GetMessagesByRoom retrieves all messages for a specific room
func GetMessagesByRoom(ctx context.Context, roomID string, limit, offset int) ([]Message, error) {
	query := `
		SELECT id, room_id, sender_id, message, type, created_at
		FROM messages
		WHERE room_id = $1
		ORDER BY created_at ASC
		LIMIT $2 OFFSET $3
	`

	if limit <= 0 {
		limit = 50 // default limit
	}

	rows, err := config.Pool.Query(ctx, query, roomID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.ID, &msg.RoomID, &msg.SenderID, &msg.Message, &msg.Type, &msg.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	return messages, nil
}

// GetRecentMessages retrieves the most recent messages for a room
func GetRecentMessages(ctx context.Context, roomID string, count int) ([]Message, error) {
	query := `
		SELECT id, room_id, sender_id, message, type, created_at
		FROM messages
		WHERE room_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	if count <= 0 {
		count = 50
	}

	rows, err := config.Pool.Query(ctx, query, roomID, count)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []Message
	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.ID, &msg.RoomID, &msg.SenderID, &msg.Message, &msg.Type, &msg.CreatedAt); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}
