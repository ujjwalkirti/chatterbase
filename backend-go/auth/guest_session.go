package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/ujjwalkirti/chatterbase-backend-go/config"
)

const GuestKeyPrefix = "active_guest:"

func guestKey(username string) string {
	return GuestKeyPrefix + username
}

// AcquireGuestUsername attempts to lock a guest username atomically in Redis with a TTL.
// Returns true if the username was acquired, or false if it is currently locked by another active guest.
func AcquireGuestUsername(ctx context.Context, username string, userId int64, ttl time.Duration) (bool, error) {
	if config.RedisClient == nil {
		return false, fmt.Errorf("redis client is not initialized")
	}
	success, err := config.RedisClient.SetNX(ctx, guestKey(username), userId, ttl).Result()
	if err != nil {
		return false, err
	}
	return success, nil
}

// RenewGuestHeartbeat refreshes the TTL of an active guest session in Redis.
// Returns true if the key exists and its TTL was renewed, or false if the session does not exist.
func RenewGuestHeartbeat(ctx context.Context, username string, ttl time.Duration) (bool, error) {
	if config.RedisClient == nil {
		return false, fmt.Errorf("redis client is not initialized")
	}
	return config.RedisClient.Expire(ctx, guestKey(username), ttl).Result()
}

// IsGuestActive checks if a guest username is currently active in Redis.
func IsGuestActive(ctx context.Context, username string) (bool, error) {
	if config.RedisClient == nil {
		return false, fmt.Errorf("redis client is not initialized")
	}
	n, err := config.RedisClient.Exists(ctx, guestKey(username)).Result()
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

// ReleaseGuestUsername removes the active guest key from Redis and archives the user record in PostgreSQL.
func ReleaseGuestUsername(ctx context.Context, username string, userId int64) error {
	if config.RedisClient != nil {
		_ = config.RedisClient.Del(ctx, guestKey(username)).Err()
	}

	if config.Pool != nil {
		if userId > 0 {
			_, err := config.Pool.Exec(ctx, "UPDATE users SET user_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", UserStatusArchived, userId)
			if err != nil {
				return err
			}
		} else if username != "" {
			_, err := config.Pool.Exec(ctx, "UPDATE users SET user_status = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2 AND user_status = $3", UserStatusArchived, username, UserStatusAnonymous)
			if err != nil {
				return err
			}
		}
	}

	return nil
}
