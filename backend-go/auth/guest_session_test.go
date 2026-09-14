package auth

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/ujjwalkirti/chatterbase-backend-go/config"
)

func TestGuestSessionLifecycle(t *testing.T) {
	if config.RedisClient == nil {
		t.Skip("Redis not available, skipping TestGuestSessionLifecycle")
	}

	ctx := context.Background()
	username := fmt.Sprintf("guest_%d", time.Now().UnixNano())

	// Step 1: Create user in Postgres with status anonymous
	var userId int64
	err := config.Pool.QueryRow(ctx,
		"INSERT INTO users (username, dob, gender, ip_address, user_status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
		username, "2000-01-01", "other", "127.0.0.1", UserStatusAnonymous,
	).Scan(&userId)
	if err != nil {
		t.Fatalf("failed to insert test anonymous user: %v", err)
	}

	// Step 2: Acquire username in Redis
	acquired, err := AcquireGuestUsername(ctx, username, userId, 10*time.Second)
	if err != nil {
		t.Fatalf("unexpected error acquiring username: %v", err)
	}
	if !acquired {
		t.Fatalf("expected to acquire free username, got false")
	}

	// Step 3: Second acquisition should fail (collision)
	secondAcquire, err := AcquireGuestUsername(ctx, username, userId+1, 10*time.Second)
	if err != nil {
		t.Fatalf("unexpected error on second acquire: %v", err)
	}
	if secondAcquire {
		t.Fatalf("expected second acquire to fail due to lock, got true")
	}

	// Step 4: Check if guest is active
	active, err := IsGuestActive(ctx, username)
	if err != nil {
		t.Fatalf("unexpected error checking if guest is active: %v", err)
	}
	if !active {
		t.Fatalf("expected guest to be active")
	}

	// Step 5: Renew heartbeat
	renewed, err := RenewGuestHeartbeat(ctx, username, 20*time.Second)
	if err != nil {
		t.Fatalf("unexpected error renewing heartbeat: %v", err)
	}
	if !renewed {
		t.Fatalf("expected heartbeat renewal to succeed")
	}

	// Step 6: Release guest username
	err = ReleaseGuestUsername(ctx, username, userId)
	if err != nil {
		t.Fatalf("unexpected error releasing guest username: %v", err)
	}

	// Step 7: Redis key should now be gone
	activeAfterRelease, err := IsGuestActive(ctx, username)
	if err != nil {
		t.Fatalf("unexpected error checking active state after release: %v", err)
	}
	if activeAfterRelease {
		t.Fatalf("expected guest to NOT be active after release")
	}

	// Step 8: Check user status in PostgreSQL is archived
	var status string
	err = config.Pool.QueryRow(ctx, "SELECT user_status FROM users WHERE id = $1", userId).Scan(&status)
	if err != nil {
		t.Fatalf("failed to query user status from db: %v", err)
	}
	if status != UserStatusArchived {
		t.Fatalf("expected user_status to be %q, got %q", UserStatusArchived, status)
	}
}
