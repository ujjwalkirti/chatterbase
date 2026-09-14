# Hybrid Dual-Authentication (Guest & Permanent) for Go Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a hybrid authentication system in `backend-go` separating ephemeral guest users (no password, Redis-enforced active username uniqueness, archive-on-disconnect) and permanent users (email/username, bcrypt-hashed password, persistent session).

**Architecture:** 
Gin router in `backend-go` provides endpoints: `POST /api/auth/guest-login`, `POST /api/auth/guest-logout`, `POST /api/auth/register-permanent`, `POST /api/auth/login-permanent`, `POST /api/auth/verify`, and `POST /api/auth/logout`. Active guest sessions are locked in Redis with short TTL (`active_guest:{username}`) and refreshed via Socket.io heartbeats. When guests disconnect, log out, or close the browser, the Redis lock is released and the PostgreSQL user record is marked `user_status = 'archived'` so historical chat messages remain intact while the username becomes available again.

**Tech Stack:** 
Go 1.26, Gin (`github.com/gin-gonic/gin`), PostgreSQL (`github.com/jackc/pgx/v5`), Redis 7+ (`github.com/redis/go-redis/v9`), `golang.org/x/crypto/bcrypt`, `github.com/golang-jwt/jwt/v5`, Socket.IO (`github.com/zishang520/socket.io/v2`).

**Spec:** Section 5 of [AGENTS.md](file:///D:/personal-projects/chatterbase/AGENTS.md) and [2026-09-14-hybrid-dual-auth.md](file:///D:/personal-projects/chatterbase/docs/plans/2026-09-14-hybrid-dual-auth.md).

## Global Constraints
- Go builds must compile with 0 errors via `go build ./...` in `backend-go`.
- Tests must pass via `go test -v ./...` in `backend-go`.
- Standalone Redis binary is available on port `6379`.
- Password hashing must use `golang.org/x/crypto/bcrypt` with `bcrypt.DefaultCost` (10 rounds). Passwords must never be stored in plain text or returned in JSON responses.
- Anonymous usernames must only be checked for uniqueness against active Redis sessions and permanent users, NOT historical archived guests.
- When an anonymous user session terminates, mark the PostgreSQL record `user_status = 'archived'`, do not delete the user or their historical messages.
- Maintain backward compatibility with `/api/auth/register`, `/api/auth/verify`, and `/api/auth/logout`.

---

### Task 1: PostgreSQL Schema Migrations for Dual Auth

**Files:**
- Modify: `backend-go/config/postgres.go`

**Interfaces:**
- Consumes: PostgreSQL connection pool `config.Pool`
- Produces: Updated `users` table schema:
  - `email TEXT`
  - `user_status TEXT` (values: `"anonymous"`, `"permanent"`, `"archived"`)
  - Partial unique index on `username` for permanent users: `idx_users_username_permanent`
  - Partial unique index on `email` for permanent users: `idx_users_email_permanent`
  - Drop global unique constraint on `username` so archived users can share historical usernames.

- [x] **Step 1: Update `runMigrations` in `backend-go/config/postgres.go`**
Add migration statements to `runMigrations`:
```go
		// Relax global unique constraint on username to allow historical archived users
		`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;`,
		`ALTER TABLE users ADD COLUMN IF NOT EXISTS user_status TEXT DEFAULT 'anonymous';`,
		// Create partial unique indexes for permanent users
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_permanent ON users(username) WHERE user_status = 'permanent';`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_permanent ON users(email) WHERE user_status = 'permanent';`,
```

- [x] **Step 2: Verify PostgreSQL initialization runs cleanly**
Run test in `backend-go`:
```powershell
cd D:\personal-projects\chatterbase\backend-go
go test -v -run TestMain ./...
```
Expected: PASS (or migration succeeds on existing test runs).

---

### Task 2: Models, Request DTOs, and Password Hashing

**Files:**
- Modify: `backend-go/auth/model.go`
- Test: `backend-go/auth/auth_test.go`

**Interfaces:**
- Consumes: `golang.org/x/crypto/bcrypt`
- Produces:
  - Constants: `UserStatusAnonymous = "anonymous"`, `UserStatusPermanent = "permanent"`, `UserStatusArchived = "archived"`
  - `User` struct with `Email string`
  - `GuestLoginRequest`:
    - `Username string` (required)
    - `Gender string` (required)
    - `DOB string` (required)
    - `IPAddress string`
    - `DeviceDetails map[string]interface{}`
  - `PermanentRegisterRequest`:
    - `Username string` (required)
    - `Email string` (required)
    - `Password string` (required)
    - `Gender string` (required)
    - `DOB string` (required)
    - `IPAddress string`
    - `DeviceDetails map[string]interface{}`
  - `PermanentLoginRequest`:
    - `Identifier string` (required - username or email)
    - `Password string` (required)
    - `DeviceDetails map[string]interface{}`
  - `HashPassword(password string) (string, error)`
  - `CheckPasswordHash(password, hash string) bool`

- [x] **Step 1: Write unit tests for password hashing in `backend-go/auth/auth_test.go`**
Add unit test function `TestPasswordHashing`:
```go
func TestPasswordHashing(t *testing.T) {
	password := "SecretPass123!"
	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("failed to hash password: %v", err)
	}
	if hash == password {
		t.Fatal("hash should not match plain password")
	}
	if !CheckPasswordHash(password, hash) {
		t.Fatal("expected password check to succeed for correct password")
	}
	if CheckPasswordHash("WrongPassword!", hash) {
		t.Fatal("expected password check to fail for incorrect password")
	}
}
```

- [x] **Step 2: Run test to verify it fails**
Run: `go test -v -run TestPasswordHashing ./auth` in `backend-go`.
Expected: FAIL (compilation error: `HashPassword` not declared).

- [x] **Step 3: Implement models and bcrypt helpers in `backend-go/auth/model.go`**
Add structs `GuestLoginRequest`, `PermanentRegisterRequest`, `PermanentLoginRequest`, `UserStatusArchived = "archived"`, `Email string` to `User`, and the bcrypt helper functions:
```go
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
```

- [x] **Step 4: Run test to verify it passes**
Run: `go test -v -run TestPasswordHashing ./auth` in `backend-go`.
Expected: PASS.

---

### Task 3: Redis Guest Presence & Session Service

**Files:**
- Create: `backend-go/auth/guest_session.go`
- Test: `backend-go/auth/guest_session_test.go`

**Interfaces:**
- Consumes: `config.RedisClient`, `config.Pool`
- Produces:
  - `AcquireGuestUsername(ctx context.Context, username string, userId int64, ttl time.Duration) (bool, error)`
  - `ReleaseGuestUsername(ctx context.Context, username string, userId int64) error`
  - `RenewGuestHeartbeat(ctx context.Context, username string, ttl time.Duration) (bool, error)`
  - `IsGuestActive(ctx context.Context, username string) (bool, error)`

- [x] **Step 1: Write tests for Redis guest presence in `backend-go/auth/guest_session_test.go`**
Create `backend-go/auth/guest_session_test.go` testing:
1. `AcquireGuestUsername` acquires lock on a free username and returns `true`.
2. Second call to `AcquireGuestUsername` with same username returns `false` (collision).
3. `RenewGuestHeartbeat` succeeds and keeps the key alive.
4. `ReleaseGuestUsername` removes the key and updates PostgreSQL record `user_status` to `"archived"`.

- [x] **Step 2: Run test to verify it fails**
Run: `go test -v -run TestGuestSession ./auth` in `backend-go`.
Expected: FAIL (types and methods undefined).

- [x] **Step 3: Implement `guest_session.go` in `backend-go/auth/guest_session.go`**
Implement the service methods:
- Key format: `"active_guest:" + username`
- `AcquireGuestUsername`: Calls `config.RedisClient.SetNX(ctx, "active_guest:"+username, userId, ttl).Result()`.
- `RenewGuestHeartbeat`: Calls `config.RedisClient.Expire(ctx, "active_guest:"+username, ttl).Result()`.
- `ReleaseGuestUsername`:
  - `config.RedisClient.Del(ctx, "active_guest:"+username)`.
  - In PostgreSQL: If `userId > 0`, `UPDATE users SET user_status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = $1`; else `UPDATE users SET user_status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE username = $1 AND user_status = 'anonymous'`.
- `IsGuestActive`: Calls `config.RedisClient.Exists(ctx, "active_guest:"+username).Result()`.

- [x] **Step 4: Run test to verify it passes**
Run: `go test -v -run TestGuestSession ./auth` in `backend-go`.
Expected: PASS.

---

### Task 4: Dual Auth Handlers & Endpoints

**Files:**
- Modify: `backend-go/auth/handler.go`
- Test: `backend-go/auth/auth_test.go`

**Interfaces:**
- Consumes: `guest_session.go`, `model.go`, `jwt.go`, `config.Pool`
- Produces Endpoints:
  - `POST /api/auth/guest-login`
  - `POST /api/auth/guest-logout`
  - `POST /api/auth/register-permanent`
  - `POST /api/auth/login-permanent`
  - `POST /api/auth/verify`
  - `POST /api/auth/logout`

- [x] **Step 1: Write integration tests for all dual auth endpoints in `backend-go/auth/auth_test.go`**
Add tests:
1. `TestGuestLogin_Success`: Returns 200, JWT token, user status `"anonymous"`, sets Redis key.
2. `TestGuestLogin_Conflict`: Returns 409 when username is already locked in Redis or held by permanent user.
3. `TestPermanentRegister_Success`: Hashes password, returns 200/201, stores `email` and `password` hash in DB.
4. `TestPermanentRegister_Conflict`: Returns 409 on duplicate permanent username or email.
5. `TestPermanentLogin_Success`: Returns 200 with JWT on valid email/username + password.
6. `TestPermanentLogin_InvalidPassword`: Returns 401 on incorrect password.
7. `TestGuestLogout`: Releases Redis key and marks user `archived` in DB.

- [x] **Step 2: Run tests to verify they fail**
Run: `go test -v -run TestGuestLogin ./auth` in `backend-go`.
Expected: FAIL (endpoints / handlers not implemented).

- [x] **Step 3: Implement handlers and route registration in `backend-go/auth/handler.go`**
1. Register routes:
```go
func RegisterRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	auth.POST("/guest-login", guestLogin)
	auth.POST("/guest-logout", guestLogout)
	auth.POST("/register-permanent", registerPermanent)
	auth.POST("/login-permanent", loginPermanent)
	auth.POST("/register", register)
	auth.POST("/verify", verify)
	auth.POST("/logout", logout)
}
```
2. Implement `guestLogin`:
   - Bind `GuestLoginRequest`.
   - Check if username belongs to a permanent user: `SELECT id FROM users WHERE username = $1 AND user_status = 'permanent'`. If found -> 409 Conflict.
   - Check if username is active in Redis via `IsGuestActive`. If true -> 409 Conflict.
   - Insert into `users`: `INSERT INTO users (username, dob, gender, ip_address, device_details, user_status) VALUES ($1,$2,$3,$4,$5,'anonymous') RETURNING id`.
   - Acquire Redis lock: `AcquireGuestUsername(ctx, req.Username, userID, 2*time.Minute)`.
   - Generate JWT token (`user_status: "anonymous"`).
   - Save token in `tokens` table.
   - Return 200 with token and user profile.
3. Implement `guestLogout`:
   - Read token from body or Authorization header.
   - Call `ReleaseGuestUsername`.
   - Mark token expired in `tokens` table.
   - Return 200.
4. Implement `registerPermanent`:
   - Bind `PermanentRegisterRequest`.
   - Validate non-empty `email` and `password` (min 6 characters).
   - Check uniqueness of `username` and `email` against permanent users and active guests. If collision -> 409 Conflict.
   - Hash password with `HashPassword(req.Password)`.
   - Insert user into `users` with `user_status = 'permanent'`, `email`, `password`.
   - Generate JWT token (`user_status: "permanent"`).
   - Save token in `tokens` table.
   - Return 200/201 with token and user profile.
5. Implement `loginPermanent`:
   - Bind `PermanentLoginRequest`.
   - Query user by `(email = $1 OR username = $1) AND user_status = 'permanent'`. If not found -> 401 Unauthorized.
   - Verify password using `CheckPasswordHash(req.Password, user.Password)`. If mismatch -> 401 Unauthorized.
   - Generate JWT token.
   - Save token in `tokens`.
   - Return 200 with token and user profile.
6. Update `logout`:
   - Mark token expired. If user was anonymous, release Redis key and set `user_status = 'archived'`.
7. Preserve `/register` for backward compatibility.

- [x] **Step 4: Run integration tests to verify they pass**
Run: `go test -v ./auth` in `backend-go`.
Expected: PASS.

---

### Task 5: Socket.IO Guest Heartbeat & Disconnect Hooks

**Files:**
- Modify: `backend-go/socket/socket.go`
- Test: `backend-go/socket/socket_test.go`

**Interfaces:**
- Consumes: `auth.RenewGuestHeartbeat`, `auth.ReleaseGuestUsername`
- Produces:
  - Socket event `guest-heartbeat` renewing Redis TTL.
  - On `disconnect`, releasing guest lock and archiving user if client was a guest.

- [x] **Step 1: Write test for guest socket heartbeat and disconnect in `backend-go/socket/socket_test.go`**
Test that:
1. `guest-heartbeat` renews Redis TTL.
2. Disconnecting a guest socket triggers release of `active_guest:{username}`.

- [x] **Step 2: Implement socket listeners in `backend-go/socket/socket.go`**
1. Add `socketGuests map[string]string` (socketId -> username) and `guestMu sync.RWMutex` to `SocketServer`.
2. Add `guest-heartbeat` handler:
```go
client.On("guest-heartbeat", func(args ...any) {
	if len(args) == 0 {
		return
	}
	if data, ok := args[0].(map[string]interface{}); ok {
		if username, ok := data["username"].(string); ok && username != "" {
			ss.guestMu.Lock()
			ss.socketGuests[socketId] = username
			ss.guestMu.Unlock()
			_, _ = auth.RenewGuestHeartbeat(context.Background(), username, 2*time.Minute)
		}
	}
})
```
3. In `disconnect` handler:
```go
ss.guestMu.Lock()
guestUsername, isGuest := ss.socketGuests[socketId]
delete(ss.socketGuests, socketId)
ss.guestMu.Unlock()

if isGuest && guestUsername != "" {
	_ = auth.ReleaseGuestUsername(context.Background(), guestUsername, 0)
}
```

- [x] **Step 3: Run socket tests to verify they pass**
Run: `go test -v ./socket` in `backend-go`.
Expected: PASS.

---

### Task 6: Full Verification & Build Check

**Files:**
- Full codebase in `backend-go`

- [x] **Step 1: Run complete Go test suite**
Run:
```powershell
cd D:\personal-projects\chatterbase\backend-go
go test -v ./...
```
Expected: All tests PASS.

- [x] **Step 2: Run Go compile verification**
Run:
```powershell
cd D:\personal-projects\chatterbase\backend-go
go build ./...
```
Expected: PASS with 0 compilation errors.
