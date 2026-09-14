# Domain-Driven Refactoring for backend-go Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `backend-go` from a generic layer-based architecture (`controllers/`, `models/`, `services/`) into clean, idiomatic Go domain packages (`auth/`, `chatroom/`, `middleware/`, `socket/`) so `auth/auth_test.go` and other tests can use standard Go package naming and compile cleanly.

**Architecture:** Domain packages (`auth`, `chatroom`) encapsulate their respective handlers, domain models, database operations, and unit tests. Cross-cutting concerns are isolated into `middleware/`, `socket/`, and `config/`. `main.go` mounts the domains using clear domain-level interfaces.

**Tech Stack:** Go 1.24, Gin (`github.com/gin-gonic/gin`), Socket.IO (`github.com/zishang520/socket.io/v2`), Redis (`github.com/redis/go-redis/v9`), pgx (`github.com/jackc/pgx/v5`).

---

## Global Constraints

- All Go source files inside a directory MUST declare that directory's package name (e.g. all files in `auth/` use `package auth`).
- Test files must use `package auth` or `package auth_test`.
- No circular dependencies (`import cycle not allowed`).
- Must pass `go build ./...` and `go test ./...` at completion.

---

### Task 1: Create `backend-go/auth` Package

**Files:**
- Create: `backend-go/auth/model.go`
- Create: `backend-go/auth/jwt.go`
- Create: `backend-go/auth/handler.go`
- Create: `backend-go/auth/auth_test.go`

**Interfaces:**
- Produces:
  - `auth.RegisterRoutes(rg *gin.RouterGroup)`
  - `auth.GenerateToken(username, gender, dob, userStatus string) (string, error)`
  - `auth.VerifyToken(tokenStr string) (jwt.MapClaims, error)`
  - `auth.ErrTokenExpired`
  - `auth.User`, `auth.Token`

- [ ] **Step 1: Create `backend-go/auth/model.go`**
  Migrate `models/user.go` and `models/token.go` into `auth/model.go` under `package auth`.
  Include `User`, `Token`, `SaveToken`, `GetTokenByUsername`, and `DeleteTokenByUsername`.

- [ ] **Step 2: Create `backend-go/auth/jwt.go`**
  Migrate `services/jwt.go` into `auth/jwt.go` under `package auth`.

- [ ] **Step 3: Create `backend-go/auth/handler.go`**
  Migrate `controllers/auth.go` into `auth/handler.go` under `package auth`.
  Remove unused `controllers` naming, update model references to use local types in `package auth`.

- [ ] **Step 4: Create `backend-go/auth/auth_test.go`**
  Create unit test with `package auth` testing `GenerateToken` and `VerifyToken`.

---

### Task 2: Create `backend-go/chatroom` Package

**Files:**
- Create: `backend-go/chatroom/model.go`
- Create: `backend-go/chatroom/handler.go`
- Create: `backend-go/chatroom/chatroom_test.go`

**Interfaces:**
- Produces:
  - `chatroom.RegisterRoutes(rg *gin.RouterGroup)`
  - `chatroom.Chatroom`, `chatroom.Message`
  - `chatroom.SaveMessage(ctx context.Context, roomId, senderId, message, messageType string) (*Message, error)`
  - `chatroom.GetMessagesByRoom(ctx context.Context, roomId string, limit, offset int) ([]Message, error)`

- [ ] **Step 1: Create `backend-go/chatroom/model.go`**
  Migrate `models/chatroom.go` and `models/message.go` into `chatroom/model.go` under `package chatroom`.

- [ ] **Step 2: Create `backend-go/chatroom/handler.go`**
  Migrate `controllers/chatroom.go` into `chatroom/handler.go` under `package chatroom`.
  Rename `RegisterChatRoutes` to `RegisterRoutes(rg *gin.RouterGroup)`.
  Update middleware import to new `middleware` package.

- [ ] **Step 3: Create `backend-go/chatroom/chatroom_test.go`**
  Create unit test under `package chatroom` verifying router setup and model struct defaults.

---

### Task 3: Create `backend-go/middleware` & `backend-go/socket` Packages

**Files:**
- Create: `backend-go/middleware/auth.go`
- Create: `backend-go/socket/socket.go`

**Interfaces:**
- Consumes:
  - `auth.VerifyToken` in `middleware/auth.go`
  - `chatroom.SaveMessage` in `socket/socket.go`
- Produces:
  - `middleware.JWTAuthMiddleware() gin.HandlerFunc`
  - `socket.New() *SocketServer`

- [ ] **Step 1: Create `backend-go/middleware/auth.go`**
  Migrate `middlewares/auth.go` to `middleware/auth.go` under `package middleware`.
  Update import to use `github.com/ujjwalkirti/chatterbase-backend-go/auth` for `auth.VerifyToken`.

- [ ] **Step 2: Create `backend-go/socket/socket.go`**
  Migrate `services/socket/socket.go` to `socket/socket.go` under `package socket`.
  Update import to use `github.com/ujjwalkirti/chatterbase-backend-go/chatroom` for `chatroom.SaveMessage` and `chatroom.Message`.

---

### Task 4: Update `main.go` and Clean Up Old Folders

**Files:**
- Modify: `backend-go/main.go`
- Delete: `backend-go/controllers/`
- Delete: `backend-go/models/`
- Delete: `backend-go/services/`
- Delete: `backend-go/middlewares/`

- [ ] **Step 1: Update `backend-go/main.go`**
  Update imports:
  - `"github.com/ujjwalkirti/chatterbase-backend-go/auth"`
  - `"github.com/ujjwalkirti/chatterbase-backend-go/chatroom"`
  - `"github.com/ujjwalkirti/chatterbase-backend-go/socket"`
  Update route registration:
  - `auth.RegisterRoutes(api)`
  - `chatroom.RegisterRoutes(api)`

- [ ] **Step 2: Remove old directories**
  Remove `controllers/`, `models/`, `services/`, `middlewares/`.

---

### Task 5: Build & Verification

- [ ] **Step 1: Run `go test ./...` in `backend-go`**
  Ensure all tests in `auth` and `chatroom` pass.

- [ ] **Step 2: Run `go build ./...` in `backend-go`**
  Ensure entire application builds cleanly.
