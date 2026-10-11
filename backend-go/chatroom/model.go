package chatroom

import (
	"context"
	"time"

	"github.com/ujjwalkirti/chatterbase-backend-go/config"
)

type Chatroom struct {
	ID               int64    `json:"id"`
	Name             string   `json:"name"`
	Description      string   `json:"description"`
	ParticipantCount int      `json:"participantCount"`
	Participants     []string `json:"participants"`
}

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
		ORDER BY created_at ASC, id ASC
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
		ORDER BY created_at DESC, id DESC
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

// GetSessionMessages retrieves messages with session-based windowing (Approach A):
// 1. If sessionStart is zero or within 60s of now (fresh login), returns up to contextLimit recent messages.
// 2. Otherwise (returning user):
//    - Queries up to contextLimit messages strictly before sessionStart (context messages).
//    - Queries all messages at or after sessionStart up to maxSessionLimit.
//    - Merges and deduplicates them in ascending chronological order.
func GetSessionMessages(ctx context.Context, roomID string, sessionStart time.Time, contextLimit, maxSessionLimit int) ([]Message, error) {
	if contextLimit <= 0 {
		contextLimit = 20
	}
	if maxSessionLimit <= 0 {
		maxSessionLimit = 100
	}

	// Case 1: Fresh login (session started within 60s or clock skew into future or zero)
	if sessionStart.IsZero() || time.Since(sessionStart) < 60*time.Second {
		return GetRecentMessages(ctx, roomID, contextLimit)
	}

	// Case 2: Returning user
	// A: Context messages strictly before sessionStart (latest N before sessionStart)
	contextQuery := `
		SELECT id, room_id, sender_id, message, type, created_at
		FROM messages
		WHERE room_id = $1 AND created_at < $2
		ORDER BY created_at DESC, id DESC
		LIMIT $3
	`
	rows, err := config.Pool.Query(ctx, contextQuery, roomID, sessionStart, contextLimit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contextMsgs []Message
	for rows.Next() {
		var msg Message
		if err := rows.Scan(&msg.ID, &msg.RoomID, &msg.SenderID, &msg.Message, &msg.Type, &msg.CreatedAt); err != nil {
			return nil, err
		}
		contextMsgs = append(contextMsgs, msg)
	}
	rows.Close()

	// Reverse context messages to chronological ASC order
	for i, j := 0, len(contextMsgs)-1; i < j; i, j = i+1, j-1 {
		contextMsgs[i], contextMsgs[j] = contextMsgs[j], contextMsgs[i]
	}

	// B: Session messages at or after sessionStart
	sessionQuery := `
		SELECT id, room_id, sender_id, message, type, created_at
		FROM messages
		WHERE room_id = $1 AND created_at >= $2
		ORDER BY created_at ASC, id ASC
		LIMIT $3
	`
	sessionRows, err := config.Pool.Query(ctx, sessionQuery, roomID, sessionStart, maxSessionLimit)
	if err != nil {
		return nil, err
	}
	defer sessionRows.Close()

	var sessionMsgs []Message
	for sessionRows.Next() {
		var msg Message
		if err := sessionRows.Scan(&msg.ID, &msg.RoomID, &msg.SenderID, &msg.Message, &msg.Type, &msg.CreatedAt); err != nil {
			return nil, err
		}
		sessionMsgs = append(sessionMsgs, msg)
	}
	sessionRows.Close()

	// C: Merge and deduplicate by ID
	seen := make(map[int64]bool)
	var merged []Message

	for _, msg := range contextMsgs {
		if !seen[msg.ID] {
			seen[msg.ID] = true
			merged = append(merged, msg)
		}
	}

	for _, msg := range sessionMsgs {
		if !seen[msg.ID] {
			seen[msg.ID] = true
			merged = append(merged, msg)
		}
	}

	if merged == nil {
		merged = []Message{}
	}

	return merged, nil
}

