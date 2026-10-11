package chatroom

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/ujjwalkirti/chatterbase-backend-go/auth"
	"github.com/ujjwalkirti/chatterbase-backend-go/config"
)

func TestMain(m *testing.M) {
	_ = godotenv.Load("../.env")
	_ = godotenv.Load()
	config.InitRedis()
	config.InitPostgres()
	os.Exit(m.Run())
}

func TestRegisterRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	api := router.Group("/api")

	RegisterRoutes(api)

	routes := router.Routes()
	expectedRoutes := map[string]string{
		"/api/chatroom/":                 http.MethodGet,
		"/api/chatroom/create":           http.MethodPost,
		"/api/chatroom/enter":            http.MethodPost,
		"/api/chatroom/:roomId/messages": http.MethodGet,
	}

	for _, route := range routes {
		if method, ok := expectedRoutes[route.Path]; ok {
			if route.Method == method {
				delete(expectedRoutes, route.Path)
			}
		}
	}

	if len(expectedRoutes) > 0 {
		t.Fatalf("missing expected routes: %v", expectedRoutes)
	}
}

func TestChatroomModelInit(t *testing.T) {
	room := Chatroom{
		ID:               1,
		Name:             "General",
		Description:      "General discussion room",
		ParticipantCount: 0,
		Participants:     []string{},
	}

	if room.Name != "General" || room.ID != 1 {
		t.Errorf("unexpected room properties: %+v", room)
	}
}

func TestMessagePersistence_SaveAndGet(t *testing.T) {
	if config.Pool == nil {
		t.Skip("Postgres not available")
	}

	ctx := context.Background()
	testRoomID := fmt.Sprintf("test_room_%d", time.Now().UnixNano())
	sender1 := "alice"
	sender2 := "bob"

	// 1. Save first message
	msg1, err := SaveMessage(ctx, testRoomID, sender1, "Hello from Alice", "user")
	if err != nil {
		t.Fatalf("failed to save message 1: %v", err)
	}
	if msg1.ID == 0 {
		t.Fatalf("expected non-zero message ID")
	}
	if msg1.RoomID != testRoomID || msg1.SenderID != sender1 || msg1.Message != "Hello from Alice" {
		t.Fatalf("unexpected message 1 content: %+v", msg1)
	}

	// 2. Save second message
	msg2, err := SaveMessage(ctx, testRoomID, sender2, "Hi Alice, from Bob", "user")
	if err != nil {
		t.Fatalf("failed to save message 2: %v", err)
	}
	if msg2.ID == 0 || msg2.ID == msg1.ID {
		t.Fatalf("expected distinct valid ID for message 2")
	}

	// 3. Retrieve messages by room in chronological order
	messages, err := GetMessagesByRoom(ctx, testRoomID, 50, 0)
	if err != nil {
		t.Fatalf("failed to get messages by room: %v", err)
	}
	if len(messages) != 2 {
		t.Fatalf("expected 2 messages, got %d", len(messages))
	}
	if messages[0].ID != msg1.ID || messages[1].ID != msg2.ID {
		t.Fatalf("messages not in expected chronological order: %+v", messages)
	}

	// 4. Test GetRecentMessages
	recent, err := GetRecentMessages(ctx, testRoomID, 1)
	if err != nil {
		t.Fatalf("failed to get recent messages: %v", err)
	}
	if len(recent) != 1 {
		t.Fatalf("expected 1 recent message, got %d", len(recent))
	}
	if recent[0].ID != msg2.ID {
		t.Fatalf("expected most recent message to be msg2, got %+v", recent[0])
	}
}

func TestGetMessagesEndpoint(t *testing.T) {
	if config.Pool == nil {
		t.Skip("Postgres not available")
	}

	ctx := context.Background()
	testRoomID := fmt.Sprintf("test_api_room_%d", time.Now().UnixNano())

	// Save test message
	_, err := SaveMessage(ctx, testRoomID, "charlie", "Testing API endpoint", "user")
	if err != nil {
		t.Fatalf("failed to save test message: %v", err)
	}

	// Generate valid auth token
	token, err := auth.GenerateToken("charlie", "male", "2000-01-01", "permanent")
	if err != nil {
		t.Fatalf("failed to generate auth token: %v", err)
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	api := router.Group("/api")
	RegisterRoutes(api)

	// Call GET /api/chatroom/:roomId/messages with Bearer token
	req, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("/api/chatroom/%s/messages", testRoomID), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Success bool      `json:"success"`
		Message string    `json:"message"`
		Data    []Message `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	if !resp.Success {
		t.Fatalf("expected success true, got false: %s", resp.Message)
	}
	if len(resp.Data) != 1 {
		t.Fatalf("expected 1 message in response, got %d", len(resp.Data))
	}
	if resp.Data[0].Message != "Testing API endpoint" {
		t.Fatalf("unexpected message content: %+v", resp.Data[0])
	}
}

func TestGetMessagesEndpoint_SessionWindowing(t *testing.T) {
	if config.Pool == nil {
		t.Skip("Postgres not available")
	}

	ctx := context.Background()
	testRoomID := fmt.Sprintf("test_api_window_%d", time.Now().UnixNano())

	// Save 25 messages with incrementing timestamps
	baseTime := time.Now().Add(-1 * time.Minute)
	for i := 1; i <= 25; i++ {
		query := `INSERT INTO messages (room_id, sender_id, message, type, created_at) VALUES ($1, $2, $3, $4, $5)`
		_, err := config.Pool.Exec(ctx, query, testRoomID, "dave", fmt.Sprintf("Msg %d", i), "user", baseTime.Add(time.Duration(i)*time.Millisecond))
		if err != nil {
			t.Fatalf("failed to save message %d: %v", i, err)
		}
	}

	token, err := auth.GenerateToken("dave", "male", "2000-01-01", "permanent")
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	api := router.Group("/api")
	RegisterRoutes(api)

	// Fresh login request without offset -> should return 20 messages (not all 25)
	req, _ := http.NewRequest(http.MethodGet, fmt.Sprintf("/api/chatroom/%s/messages", testRoomID), nil)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Success bool      `json:"success"`
		Data    []Message `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response JSON: %v", err)
	}

	if len(resp.Data) != 20 {
		t.Fatalf("expected 20 messages from fresh login windowing, got %d", len(resp.Data))
	}
	if resp.Data[0].Message != "Msg 6" {
		t.Fatalf("expected first message to be 'Msg 6', got %q", resp.Data[0].Message)
	}
	if resp.Data[19].Message != "Msg 25" {
		t.Fatalf("expected last message to be 'Msg 25', got %q", resp.Data[19].Message)
	}
}

func TestGetSessionMessages_FreshLogin(t *testing.T) {
	if config.Pool == nil {
		t.Skip("Postgres not available")
	}

	ctx := context.Background()
	testRoomID := fmt.Sprintf("test_session_fresh_%d", time.Now().UnixNano())

	// Insert 25 messages
	for i := 1; i <= 25; i++ {
		_, err := SaveMessage(ctx, testRoomID, "user1", fmt.Sprintf("Message %d", i), "user")
		if err != nil {
			t.Fatalf("failed to save message %d: %v", i, err)
		}
	}

	// Fresh login: session started 5 seconds ago
	sessionStart := time.Now().Add(-5 * time.Second)
	messages, err := GetSessionMessages(ctx, testRoomID, sessionStart, 20, 100)
	if err != nil {
		t.Fatalf("GetSessionMessages failed: %v", err)
	}

	if len(messages) != 20 {
		t.Fatalf("expected 20 messages for fresh login, got %d", len(messages))
	}

	// Should be the latest 20 messages (Message 6 to Message 25) in ASC order
	if messages[0].Message != "Message 6" {
		t.Fatalf("expected first message to be 'Message 6', got %q", messages[0].Message)
	}
	if messages[19].Message != "Message 25" {
		t.Fatalf("expected last message to be 'Message 25', got %q", messages[19].Message)
	}
}

func TestGetSessionMessages_ReturningUser(t *testing.T) {
	if config.Pool == nil {
		t.Skip("Postgres not available")
	}

	ctx := context.Background()
	testRoomID := fmt.Sprintf("test_session_return_%d", time.Now().UnixNano())

	// 10 messages before session start (e.g. 10 minutes ago)
	baseTime := time.Now().Add(-10 * time.Minute)
	for i := 1; i <= 10; i++ {
		query := `INSERT INTO messages (room_id, sender_id, message, type, created_at) VALUES ($1, $2, $3, $4, $5)`
		_, err := config.Pool.Exec(ctx, query, testRoomID, "user1", fmt.Sprintf("Past message %d", i), "user", baseTime.Add(time.Duration(i)*time.Second))
		if err != nil {
			t.Fatalf("failed to insert past message %d: %v", i, err)
		}
	}

	// Session start was 5 minutes ago
	sessionStart := time.Now().Add(-5 * time.Minute)

	// 5 messages after session start
	for i := 1; i <= 5; i++ {
		query := `INSERT INTO messages (room_id, sender_id, message, type, created_at) VALUES ($1, $2, $3, $4, $5)`
		_, err := config.Pool.Exec(ctx, query, testRoomID, "user2", fmt.Sprintf("Session message %d", i), "user", sessionStart.Add(time.Duration(i)*time.Minute))
		if err != nil {
			t.Fatalf("failed to insert session message %d: %v", i, err)
		}
	}

	// Returning user
	messages, err := GetSessionMessages(ctx, testRoomID, sessionStart, 20, 100)
	if err != nil {
		t.Fatalf("GetSessionMessages failed: %v", err)
	}

	// Should contain 10 past context messages + 5 session messages = 15 messages
	if len(messages) != 15 {
		t.Fatalf("expected 15 messages for returning user, got %d", len(messages))
	}

	if messages[0].Message != "Past message 1" {
		t.Fatalf("expected first message to be 'Past message 1', got %q", messages[0].Message)
	}
	if messages[14].Message != "Session message 5" {
		t.Fatalf("expected last message to be 'Session message 5', got %q", messages[14].Message)
	}
}


