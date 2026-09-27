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

func TestDetermineOnlineMember(t *testing.T) {
	ctx := context.Background()

	// 1. Explicit guest type should have Type="guest" and Username="guest-alice"
	m1 := DetermineOnlineMember(ctx, "user1", "alice", "room1", "guest")
	if m1.Type != "guest" {
		t.Errorf("expected Type to be 'guest', got %q", m1.Type)
	}
	if m1.Username != "guest-alice" {
		t.Errorf("expected Username to be 'guest-alice', got %q", m1.Username)
	}

	// 2. Anonymous type should also be resolved to "guest" with "guest-" prefix
	m2 := DetermineOnlineMember(ctx, "user2", "bob", "room1", "anonymous")
	if m2.Type != "guest" {
		t.Errorf("expected Type to be 'guest', got %q", m2.Type)
	}
	if m2.Username != "guest-bob" {
		t.Errorf("expected Username to be 'guest-bob', got %q", m2.Username)
	}

	// 3. Username already starting with "guest-" should not get duplicated prefix
	m3 := DetermineOnlineMember(ctx, "user3", "guest-charlie", "room1", "guest")
	if m3.Username != "guest-charlie" {
		t.Errorf("expected Username to be 'guest-charlie', got %q", m3.Username)
	}

	// 4. Permanent type should have Type="permanent" and unmodified Username
	m4 := DetermineOnlineMember(ctx, "user4", "diana", "room1", "permanent")
	if m4.Type != "permanent" {
		t.Errorf("expected Type to be 'permanent', got %q", m4.Type)
	}
	if m4.Username != "diana" {
		t.Errorf("expected Username to be 'diana', got %q", m4.Username)
	}
}
