package middleware

import (
	"context"
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
	os.Exit(m.Run())
}

func TestJWTAuthMiddleware_RenewsGuestPresence(t *testing.T) {
	os.Setenv("ACCESS_TOKEN_SECRET", "test-secret-key-123")
	if config.RedisClient == nil {
		t.Skip("Redis not available")
	}

	username := "mw_guest_user"
	ctx := context.Background()
	_, _ = auth.AcquireGuestUsername(ctx, username, 999, 10*time.Second)
	defer auth.ReleaseGuestUsername(ctx, username, 999)

	token, err := auth.GenerateToken(username, "female", "2000-01-01", auth.UserStatusAnonymous)
	if err != nil {
		t.Fatalf("failed to generate token: %v", err)
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(JWTAuthMiddleware())
	router.GET("/test-auth", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req, _ := http.NewRequest(http.MethodGet, "/test-auth", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	// Check TTL has been renewed to >= 3 minutes
	ttl, err := config.RedisClient.TTL(ctx, "active_guest:"+username).Result()
	if err != nil || ttl < 3*time.Minute {
		t.Fatalf("expected renewed TTL >= 3 minutes, got %v", ttl)
	}
}
