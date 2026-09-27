# Guest Session Lifecycle & Username Presence Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent active guest usernames from becoming prematurely available by implementing a resilient multi-layer session presence architecture (HTTP middleware renewal, WebSocket join/disconnect tracking, 30s frontend heartbeats, unload beacon, and case-normalized Redis key locking).

**Architecture:** 
1. **Backend Presence Layer (`backend-go`)**: 
   - `auth/guest_session.go` normalizes usernames (`strings.ToLower(strings.TrimSpace(username))`) for consistent Redis keys and raises default TTL to 5 minutes.
   - `middleware/auth.go` (`JWTAuthMiddleware`) automatically renews the guest's Redis key on any authenticated HTTP request.
   - `auth/handler.go` exposes `POST /api/auth/heartbeat` and enforces `IsGuestActive` check on legacy `POST /api/auth/register` to protect NextAuth logins.
   - `socket/socket.go` registers guest socket IDs upon `user-joined` and `join-room`, renews Redis locks on socket activity, and releases locks + archives PostgreSQL records immediately upon `disconnect`.
2. **Frontend Presence Layer (`frontend`)**:
   - `contexts/AuthProvider.tsx` runs an active 30-second heartbeat interval calling `/api/auth/heartbeat` across all protected routes (both `/available-chatrooms` and `/chatrooms/[slug]`), and registers a `beforeunload` beacon to release usernames immediately on browser/tab close.
   - `contexts/SocketProvider.tsx` emits periodic `guest-heartbeat` events while connected.

**Tech Stack:** Go 1.24+, Gin, Redis (`go-redis/v9`), pgx, Next.js 15, React 19, Socket.io-client.

**Spec:** Section 5 of [AGENTS.md](file:///D:/personal-projects/chatterbase/AGENTS.md) and [2026-09-14-hybrid-dual-auth-go.md](file:///D:/personal-projects/chatterbase/docs/plans/2026-09-14-hybrid-dual-auth-go.md).

## Global Constraints
- Go code must compile with 0 errors via `go build ./...` in `backend-go`.
- All Go tests must pass via `go test -v ./...` in `backend-go`.
- Frontend linting/build must pass with 0 errors via `npm run build` in `frontend`.
- Redis keys must follow prefix `active_guest:{lowercase_username}`.
- Guest usernames must remain locked for as long as the user has an active tab open.
- When an anonymous user session terminates or tab closes, the Redis lock must be freed and PostgreSQL record marked `user_status = 'archived'`.

---

### Task 1: Normalize Username Keys & Increase TTL in `auth/guest_session.go`

**Files:**
- Modify: `backend-go/auth/guest_session.go`
- Test: `backend-go/auth/guest_session_test.go`

**Interfaces:**
- Consumes: `config.RedisClient`, `config.Pool`
- Produces:
  - `NormalizeGuestUsername(username string) string`
  - `DefaultGuestSessionTTL = 5 * time.Minute`
  - `IsGuestActive(ctx context.Context, username string) (bool, error)` (case-normalized)
  - `AcquireGuestUsername(ctx context.Context, username string, userId int64, ttl time.Duration) (bool, error)` (case-normalized)
  - `RenewGuestHeartbeat(ctx context.Context, username string, ttl time.Duration) (bool, error)` (case-normalized)
  - `ReleaseGuestUsername(ctx context.Context, username string, userId int64) error` (case-normalized)

- [x] **Step 1: Write unit tests for case normalization and TTL in `backend-go/auth/guest_session_test.go`**
Add test `TestGuestSessionCaseInsensitivity`:
```go
func TestGuestSessionCaseInsensitivity(t *testing.T) {
	if config.RedisClient == nil {
		t.Skip("Redis not available")
	}
	ctx := context.Background()
	username := fmt.Sprintf("CaseUser_%d", time.Now().UnixNano())

	acquired, err := AcquireGuestUsername(ctx, username, 101, DefaultGuestSessionTTL)
	if err != nil || !acquired {
		t.Fatalf("failed to acquire username: %v", err)
	}
	defer ReleaseGuestUsername(ctx, username, 101)

	// Checking lowercase version must report active
	lowerActive, err := IsGuestActive(ctx, strings.ToLower(username))
	if err != nil || !lowerActive {
		t.Fatalf("expected lowercase username to be active")
	}

	// Checking uppercase version must report active
	upperActive, err := IsGuestActive(ctx, strings.ToUpper(username))
	if err != nil || !upperActive {
		t.Fatalf("expected uppercase username to be active")
	}
}
```

- [x] **Step 2: Run test to verify it fails**
Run: `go test -v -run TestGuestSessionCaseInsensitivity ./auth` in `backend-go`.
Expected: FAIL (compilation error or key mismatch).

- [x] **Step 3: Implement normalization and default TTL in `backend-go/auth/guest_session.go`**
Update `guest_session.go`:
```go
const (
	GuestKeyPrefix         = "active_guest:"
	DefaultGuestSessionTTL = 5 * time.Minute
)

func NormalizeGuestUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

func guestKey(username string) string {
	return GuestKeyPrefix + NormalizeGuestUsername(username)
}
```

- [x] **Step 4: Run test to verify it passes**
Run: `go test -v -run TestGuestSessionCaseInsensitivity ./auth` in `backend-go`.
Expected: PASS.

---

### Task 2: Add Heartbeat Endpoint & Secure `/api/auth/register` in `auth/handler.go`

**Files:**
- Modify: `backend-go/auth/handler.go`
- Test: `backend-go/auth/auth_test.go`

**Interfaces:**
- Consumes: `guest_session.go`, `jwt.go`, `config.Pool`
- Produces:
  - `POST /api/auth/heartbeat`: Renews Redis lock for anonymous users
  - Hardened `POST /api/auth/register`: Validates `IsGuestActive` before inserting anonymous users and uses `DefaultGuestSessionTTL`

- [x] **Step 1: Write failing tests in `backend-go/auth/auth_test.go`**
Add tests `TestGuestHeartbeatEndpoint` and `TestRegister_BlocksActiveGuest`:
```go
func TestGuestHeartbeatEndpoint(t *testing.T) {
	router := setupTestRouter()
	username := fmt.Sprintf("hb_user_%d", time.Now().UnixNano())

	// Acquire initial session
	_, _ = AcquireGuestUsername(context.Background(), username, 1, 10*time.Second)
	token, _ := GenerateToken(username, "male", "2000-01-01", UserStatusAnonymous)

	payload := map[string]interface{}{"token": token}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, "/api/auth/heartbeat", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK from heartbeat, got %d: %s", w.Code, w.Body.String())
	}
}

func TestRegister_BlocksActiveGuest(t *testing.T) {
	router := setupTestRouter()
	username := fmt.Sprintf("reg_block_%d", time.Now().UnixNano())

	// Simulate active guest
	_, _ = AcquireGuestUsername(context.Background(), username, 1, DefaultGuestSessionTTL)

	payload := map[string]interface{}{
		"username": username,
		"dob":      "2000-01-01",
		"gender":   "other",
	}
	body, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusConflict {
		t.Fatalf("expected 409 Conflict when registering active guest username, got %d: %s", w.Code, w.Body.String())
	}
}
```

- [x] **Step 2: Run tests to verify they fail**
Run: `go test -v -run "TestGuestHeartbeatEndpoint|TestRegister_BlocksActiveGuest" ./auth` in `backend-go`.
Expected: FAIL.

- [x] **Step 3: Implement `heartbeat` handler and update `register` in `backend-go/auth/handler.go`**
1. In `RegisterRoutes`:
```go
auth.POST("/heartbeat", guestHeartbeat)
```
2. Implement `guestHeartbeat`:
```go
func guestHeartbeat(c *gin.Context) {
	var body struct {
		Token string `json:"token"`
	}
	_ = c.ShouldBindJSON(&body)
	tokenStr := body.Token
	if tokenStr == "" {
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}
	if tokenStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Token is required"})
		return
	}

	claims, err := VerifyToken(tokenStr)
	if err != nil || claims == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Invalid token"})
		return
	}

	username, _ := claims["username"].(string)
	userStatus, _ := claims["user_status"].(string)
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Username missing from token"})
		return
	}

	if userStatus == UserStatusAnonymous {
		renewed, err := RenewGuestHeartbeat(c.Request.Context(), username, DefaultGuestSessionTTL)
		if err != nil || !renewed {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Guest session expired or not found"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Heartbeat acknowledged"})
}
```
3. Update `guestLogin` and `register` to use `DefaultGuestSessionTTL` (5 minutes) and verify `IsGuestActive` on `register`. In `register`:
```go
	// Check if username is currently active guest in Redis
	active, err := IsGuestActive(ctx, guestReq.Username)
	if err == nil && active {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Username is currently in use"})
		return
	}
```
And check lock result:
```go
	acquired, err := AcquireGuestUsername(ctx, guestReq.Username, userID, DefaultGuestSessionTTL)
	if err != nil || !acquired {
		_ = ReleaseGuestUsername(ctx, guestReq.Username, userID)
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "Username is currently in use"})
		return
	}
```

- [x] **Step 4: Run tests to verify they pass**
Run: `go test -v -run "TestGuestHeartbeatEndpoint|TestRegister_BlocksActiveGuest" ./auth` in `backend-go`.
Expected: PASS.

---

### Task 3: Automatic Presence Renewal in `JWTAuthMiddleware`

**Files:**
- Modify: `backend-go/middleware/auth.go`
- Test: `backend-go/middleware/auth_test.go` (create)

**Interfaces:**
- Consumes: `auth.VerifyToken`, `auth.RenewGuestHeartbeat`, `auth.DefaultGuestSessionTTL`
- Produces: `JWTAuthMiddleware` that keeps active guest Redis TTL refreshed during API usage

- [x] **Step 1: Write test for middleware guest renewal in `backend-go/middleware/auth_test.go`**
Create `backend-go/middleware/auth_test.go`:
```go
package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ujjwalkirti/chatterbase-backend-go/auth"
	"github.com/ujjwalkirti/chatterbase-backend-go/config"
)

func TestJWTAuthMiddleware_RenewsGuestPresence(t *testing.T) {
	os.Setenv("ACCESS_TOKEN_SECRET", "test-secret-key-123")
	config.InitRedis()
	if config.RedisClient == nil {
		t.Skip("Redis not available")
	}

	username := "mw_guest_user"
	ctx := context.Background()
	_, _ = auth.AcquireGuestUsername(ctx, username, 999, 10*time.Second)

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

	// Check TTL has been renewed to >= 4 minutes
	ttl, err := config.RedisClient.TTL(ctx, "active_guest:"+username).Result()
	if err != nil || ttl < 3*time.Minute {
		t.Fatalf("expected renewed TTL >= 3 minutes, got %v", ttl)
	}
}
```

- [x] **Step 2: Run test to verify it fails**
Run: `go test -v ./middleware` in `backend-go`.
Expected: FAIL (TTL not renewed).

- [x] **Step 3: Implement guest renewal in `backend-go/middleware/auth.go`**
Update `JWTAuthMiddleware`:
```go
		c.Set("user", claims)

		// Renew guest presence on every authenticated HTTP request
		if status, ok := claims["user_status"].(string); ok && status == auth.UserStatusAnonymous {
			if username, ok := claims["username"].(string); ok && username != "" {
				go func(u string) {
					_, _ = auth.RenewGuestHeartbeat(context.Background(), u, auth.DefaultGuestSessionTTL)
				}(username)
			}
		}

		c.Next()
```

- [x] **Step 4: Run test to verify it passes**
Run: `go test -v ./middleware` in `backend-go`.
Expected: PASS.

---

### Task 4: Socket.IO Automatic Guest Join Tracking & Presence in `socket/socket.go`

**Files:**
- Modify: `backend-go/socket/socket.go`
- Test: `backend-go/socket/socket_test.go` (create)

**Interfaces:**
- Consumes: `auth.RenewGuestHeartbeat`, `auth.ReleaseGuestUsername`, `auth.DefaultGuestSessionTTL`
- Produces:
  - Socket tracks guest mapping on `user-joined` and `join-room` as well as `guest-heartbeat`
  - Immediate `ReleaseGuestUsername` when socket disconnects

- [x] **Step 1: Write test for socket guest tracking in `backend-go/socket/socket_test.go`**
Create `socket_test.go` testing that:
1. When socket receives `user-joined` or `guest-heartbeat`, the socket is mapped to the guest username.
2. When socket disconnects, `ReleaseGuestUsername` is invoked.

- [x] **Step 2: Update `backend-go/socket/socket.go`**
1. In `join-room`:
If `userId` is provided, refresh guest heartbeat if user is guest:
```go
_, _ = auth.RenewGuestHeartbeat(context.Background(), userId, auth.DefaultGuestSessionTTL)
```
2. In `user-joined`:
```go
			if roomId != "" && username != "" {
				ss.guestMu.Lock()
				ss.socketGuests[socketId] = username
				ss.guestMu.Unlock()
				_, _ = auth.RenewGuestHeartbeat(context.Background(), username, auth.DefaultGuestSessionTTL)
```
3. In `guest-heartbeat`:
```go
			if username != "" {
				ss.guestMu.Lock()
				ss.socketGuests[socketId] = username
				ss.guestMu.Unlock()
				_, _ = auth.RenewGuestHeartbeat(context.Background(), username, auth.DefaultGuestSessionTTL)
			}
```
4. In `disconnect`:
Ensures `ReleaseGuestUsername` is invoked with clean logging.

- [x] **Step 3: Run socket tests to verify they pass**
Run: `go test -v ./socket` in `backend-go`.
Expected: PASS.

---

### Task 5: Frontend Active Presence & Heartbeat Loop

**Files:**
- Modify: `frontend/contexts/AuthProvider.tsx`
- Modify: `frontend/contexts/SocketProvider.tsx`
- Test: Manual verification + `npm run build` in `frontend`

**Interfaces:**
- Consumes: NextAuth session (`session.user.accessToken`, `session.user.username`)
- Produces:
  - Active 30-second interval sending heartbeat to `${NEXT_PUBLIC_API_URL}/api/auth/heartbeat`
  - `beforeunload` event handler triggering `navigator.sendBeacon` to release guest username on tab closure
  - `SocketProvider` emits `guest-heartbeat` event every 30 seconds while connected

- [x] **Step 1: Implement recurring heartbeat and `beforeunload` beacon in `frontend/contexts/AuthProvider.tsx`**
In `AuthContextProvider` inside `frontend/contexts/AuthProvider.tsx`:
```tsx
	useEffect(() => {
		if (!user?.username || !user?.accessToken) return;

		const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

		// 1. Send heartbeat every 30 seconds
		const interval = setInterval(async () => {
			try {
				await fetch(`${apiUrl}/api/auth/heartbeat`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${user.accessToken}`,
					},
					body: JSON.stringify({ token: user.accessToken }),
				});
			} catch (err) {
				console.error("Heartbeat error:", err);
			}
		}, 30000);

		// 2. Beacon on tab/browser close to release guest lock immediately
		const handleBeforeUnload = () => {
			const payload = JSON.stringify({ token: user.accessToken });
			if (navigator.sendBeacon) {
				const blob = new Blob([payload], { type: "application/json" });
				navigator.sendBeacon(`${apiUrl}/api/auth/guest-logout`, blob);
			} else {
				fetch(`${apiUrl}/api/auth/guest-logout`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: payload,
					keepalive: true,
				});
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			clearInterval(interval);
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [user?.username, user?.accessToken]);
```

- [x] **Step 2: Add periodic socket heartbeat in `frontend/contexts/SocketProvider.tsx`**
Inside `useEffect` in `frontend/contexts/SocketProvider.tsx`, when `_socket` connects:
```tsx
		const heartbeatInterval = setInterval(() => {
			if (_socket.connected && currentRoomId) {
				_socket.emit("guest-heartbeat", { username: currentUserId });
			}
		}, 30000);
```
Clean up `clearInterval(heartbeatInterval)` on unmount.

- [x] **Step 3: Run frontend build to verify TypeScript and linting**
Run: `cd frontend; npm run build`
Expected: Build passes with 0 errors.

---

### Task 6: End-to-End Verification

**Files:**
- Full codebase across `backend-go` and `frontend`

- [x] **Step 1: Run complete Go test suite**
Run: `cd backend-go; go test -v ./...`
Expected: PASS across all packages.

- [x] **Step 2: Run Go compilation**
Run: `cd backend-go; go build ./...`
Expected: PASS with 0 errors.

- [x] **Step 3: Verify end-to-end guest lifecycle**
1. Log in as a guest user.
2. Remain on `/available-chatrooms` for > 3 minutes (exceeding old 2-minute threshold).
3. Verify `IsGuestActive` / Redis key remains active due to recurring heartbeat.
4. Try to register second guest with same username in private window -> Expect 409 Conflict.
5. Close the guest tab -> Verify Redis key is immediately released via `beforeunload` beacon / socket disconnect.
6. Re-register with the same username -> Expect 200 OK success.
