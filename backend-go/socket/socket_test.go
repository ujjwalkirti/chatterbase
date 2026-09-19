package socket

import (
	"context"
	"os"
	"testing"

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

func TestSocketGuestTrackingAndRelease(t *testing.T) {
	if config.RedisClient == nil {
		t.Skip("Redis not available")
	}

	username := "socket_guest_test"
	ctx := context.Background()

	// Acquire guest session in Redis
	acquired, err := auth.AcquireGuestUsername(ctx, username, 777, auth.DefaultGuestSessionTTL)
	if err != nil || !acquired {
		t.Fatalf("failed to acquire guest username: %v", err)
	}

	ss := New()
	defer ss.Close()

	socketId := "mock_socket_123"

	// Register socket as guest
	ss.guestMu.Lock()
	ss.socketGuests[socketId] = username
	ss.guestMu.Unlock()

	// Renew presence
	renewed, err := auth.RenewGuestHeartbeat(ctx, username, auth.DefaultGuestSessionTTL)
	if err != nil || !renewed {
		t.Fatalf("expected heartbeat renewal to succeed")
	}

	// Verify still active in Redis
	active, err := auth.IsGuestActive(ctx, username)
	if err != nil || !active {
		t.Fatalf("expected guest to be active in Redis")
	}

	// Simulate disconnect cleanup
	ss.guestMu.Lock()
	guestUsername, isGuest := ss.socketGuests[socketId]
	delete(ss.socketGuests, socketId)
	ss.guestMu.Unlock()

	if !isGuest || guestUsername != username {
		t.Fatalf("expected socket to be recognized as guest %s, got %s (isGuest=%v)", username, guestUsername, isGuest)
	}

	err = auth.ReleaseGuestUsername(ctx, guestUsername, 0)
	if err != nil {
		t.Fatalf("unexpected error releasing guest username: %v", err)
	}

	// Verify no longer active
	activeAfter, _ := auth.IsGuestActive(ctx, username)
	if activeAfter {
		t.Fatalf("expected guest to NOT be active after release")
	}
}
