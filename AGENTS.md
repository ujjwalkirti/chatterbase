# AGENTS.md - ChatterBase Agent Operational Guidelines

> **Notice for AI Agents**: This file defines the architectural rules, technology stack conventions, directory boundaries, development workflows, and strict behavioral standards for any AI agent working on ChatterBase. Adherence is mandatory.

---

## 1. Project Overview & Mission

ChatterBase is a high-concurrency, real-time messaging and chatroom platform designed with a hybrid authentication architecture:
- **Guest / Anonymous Users**: Zero-password barrier to entry. Enforces username uniqueness among active sessions using atomic Redis locks with TTL. Guest sessions cleanly terminate, release their usernames, and transition to archived status in PostgreSQL upon browser/tab closure or socket disconnection.
- **Permanent Users**: Standard authenticated accounts (email/username + bcrypt-hashed password) with persistent sessions, profile state, and permanent chat ownership backed by PostgreSQL partial unique indexes.
- **Real-Time Engine**: Built on Go with Socket.IO (`zishang520/socket.io/v2`) and Redis Pub/Sub backplane, supporting horizontal scaling across multiple Go backend instances.

---

## 2. Technology Stack & Architecture

### Frontend
- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript (`strict: true`)
- **Styling**: Tailwind CSS v4, Radix UI primitives, Lucide React icons
- **Form Management**: React Hook Form, Zod schema validation
- **Auth Layer**: NextAuth.js v5 (beta) + React Context (`AuthProvider`) with 30s heartbeat & `beforeunload` beacon
- **Real-Time Client**: `socket.io-client` (v4)

### Backend (`backend-go`)
- **Language & Runtime**: Go 1.23+
- **HTTP Framework**: Gin (`github.com/gin-gonic/gin`) with CORS middleware (`github.com/gin-contrib/cors`)
- **Database**: PostgreSQL 16+ via connection pool `pgxpool` (`github.com/jackc/pgx/v5/pgxpool`) with automated startup schema migrations (users, tokens, chatrooms, messages)
- **Pub/Sub & Fast Cache**: Redis 7+ via `go-redis/v9` (`github.com/redis/go-redis/v9`), supporting connection strings (`REDIS_URL`), standalone host/port fallback, and optional TLS/SNI (`REDIS_TLS`)
- **WebSockets / Real-Time**: Socket.IO v2 server in Go (`github.com/zishang520/socket.io/v2/socket`) mounted at `/socket.io/*any` via `gin.WrapH(ss)`
- **Security & Tokens**: JWT (`github.com/golang-jwt/jwt/v5`) using HMAC-SHA256 (`ACCESS_TOKEN_SECRET`) with 2-hour TTL and claims (`username`, `gender`, `dob`, `user_status`, `exp`); Passwords hashed using `golang.org/x/crypto/bcrypt` (DefaultCost = 10)
- **Device Tracking**: Client-side fingerprinting / device details (OS, browser, device type, timezone, userAgent, language, IP address) stored in PostgreSQL `users.device_details` as `JSONB`
- **Development Tooling**: Air (`.air.toml`) for live reloading during Go development

### Infrastructure & Local Services
- **Redis (Windows)**: Standalone native Windows binary located at `C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-server.exe` (Port `6379`). Do NOT rely on WSL port forwarding for Redis. Default connection: `redis://localhost:6379`.
- **PostgreSQL**: Port `5432` (database: `chatterbase`). Connection configured via `DATABASE_URL` (e.g., `postgres://postgres:password@localhost:5432/chatterbase?sslmode=disable`) or individual variables (`PGUSER`, `PGPASSWORD`, `PGHOST`, `PGPORT`, `PGDATABASE`, `PGSSLMODE`).
- **Backend API**: Port `8000` (`http://localhost:8000`).
- **Frontend App**: Port `3000` (`http://localhost:3000`).

---

## 3. Directory Layout & Boundaries

```
chatterbase/
├── .agents/                    # Agent skills, instructions, and task templates
│   └── skills/                 # Installed skills (brainstorming, TDD, backend-patterns, etc.)
├── AGENTS.md                   # This guideline document
├── Readme.md                   # Human developer guide
├── start-dev.ps1               # Automated local dev launcher (Next.js, Redis, Go backend)
├── start-dev.sh                # Linux/macOS launcher
├── backend-go/                 # Primary Go backend service
│   ├── auth/                   # Dual auth: guest locking, permanent accounts, JWT, tests
│   │   ├── auth_test.go        # Unit & integration tests for all auth flows
│   │   ├── guest_session.go    # Redis atomic lock (SetNX), TTL renewal, release & archiving
│   │   ├── guest_session_test.go # Unit tests for guest lock lifecycle & normalization
│   │   ├── handler.go          # HTTP handlers (/api/auth/guest-login, /register-permanent, etc.)
│   │   ├── jwt.go              # JWT generation (2h), signing, and verification (golang-jwt/v5)
│   │   └── model.go            # User, Token, Request DTOs, bcrypt password helpers
│   ├── chatroom/               # Chatroom CRUD, message history, pgx queries & tests
│   │   ├── chatroom_test.go
│   │   ├── handler.go          # Handlers for /api/chatroom/ routes
│   │   └── model.go            # Chatroom & Message schemas and DB operations
│   ├── config/                 # Postgres connection pool (pgxpool) & Redis client setup
│   │   ├── postgres.go         # pgxpool init, auto-migrations (users, tokens, chatrooms, messages)
│   │   └── redis.go            # go-redis client init (URL/env config, TLS/SNI support)
│   ├── middleware/             # Gin middlewares
│   │   ├── auth.go             # JWTAuthMiddleware (Bearer token validation + auto guest TTL renewal)
│   │   └── auth_test.go        # Middleware tests
│   ├── socket/                 # Socket.IO real-time server & Redis pub/sub integration
│   │   ├── socket.go           # Event handlers (message, join-room, user-joined, heartbeat, disconnect)
│   │   └── socket_test.go      # Socket guest tracking & release tests
│   ├── tools/                  # Diagnostics & connectivity scripts (Redis TLS probe, etc.)
│   ├── .air.toml               # Air live-reload configuration
│   ├── .env                    # Environment variables (PORT, DATABASE_URL, REDIS_URL, ACCESS_TOKEN_SECRET)
│   ├── go.mod                  # Go module definition (Go 1.23+)
│   ├── go.sum
│   └── main.go                 # Gin router setup, CORS, route registration, Socket.IO mount
├── backend-js/                 # [DEPRECATED] Original Node.js backend (legacy reference only; DO NOT EDIT)
└── frontend/                   # Next.js 15 App Router frontend
    ├── app/                    # Next.js App Router routes & layouts
    │   ├── (auth)/             # Authentication views (/login, /permanent-login)
    │   ├── (protected)/        # Authenticated views (/available-chatrooms, /chatrooms/[id])
    │   ├── api/auth/[...nextauth]/ # NextAuth route handler
    │   ├── layout.tsx          # Root layout with theme & auth providers
    │   └── page.tsx            # Landing page
    ├── components/
    │   ├── auth/               # LoginForm, UserTypeToggle, etc.
    │   ├── chatrooms/          # Chatroom list, ChatBox, MessageList, MemberList
    │   ├── common/             # Headers, footers, shared modals
    │   └── ui/                 # Atomic UI components (shadcn/Radix primitives)
    ├── contexts/               # React Contexts
    │   ├── AuthProvider.tsx    # Auth context with 30s heartbeat & beforeunload beacon
    │   └── SocketProvider.tsx  # Socket.IO client context and connection manager
    ├── utils/                  # Client utility functions & device fingerprinting
    ├── auth.ts                 # NextAuth v5 configuration & credentials provider
    ├── .env.local              # Frontend environment variables
    ├── package.json
    └── tsconfig.json
```

---

## 4. Mandatory Task Execution Lifecycle & Behavioral Rules

### 4.1 Mandatory Task Execution Lifecycle (Must Follow For Every Task)
Every agent working on ChatterBase MUST follow this 5-stage lifecycle sequentially for every task. Skipping any step is strictly forbidden.

```
┌────────────────────────────────────────────────────────┐
│ Step 1: Skill Discovery & Activation (First & Must Do) │
│ - Look for appropriate skills in .agents/skills/       │
│ - Read and follow the relevant SKILL.md                │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Step 2: Autonomous TDD & Implementation Loop           │
│ - Brainstorm / plan (features) or debug (fixes)        │
│ - Apply Test-Driven Development (TDD)                  │
│ - Iterate autonomously in a loop (no trivial prompts)  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Step 3: Self-Verification (Automated Checks)           │
│ - Run backend tests: go test -v ./...                  │
│ - Run backend build: go build ./...                    │
│ - Run frontend check: npx tsc --noEmit                 │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Step 4: User Verification Gate & Code Presentation     │
│ - Present all changed code for user review             │
│ - Link files with clickable markdown links             │
│ - Prompt user to verify via browser & API              │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ Step 5: User Approval Gate Before Commit & Push        │
│ - Wait for explicit user confirmation/approval         │
│ - Commit and push to the relevant branch               │
└────────────────────────────────────────────────────────┘
```

#### Step 1: Skill Discovery & Activation (First Action — Mandatory)
- Before taking any action, creating files, or editing code, the agent **MUST** inspect available skills (located in `.agents/skills/` and system skills).
- Match the problem type to the appropriate skill(s):
  - **New Features / Architectural Changes**: Activate `brainstorming` and `writing-plans`.
  - **Bugs / Regressions / Test Failures**: Activate `systematic-debugging`.
  - **Implementation / Refactoring**: Activate `test-driven-development`.
  - **Complex Multi-Step Tasks**: Activate `executing-plans` or `subagent-driven-development`.
  - **Pre-Completion Checks**: Activate `verification-before-completion`.
- Read the corresponding `SKILL.md` via `view_file` and adhere to its methodology.

#### Step 2: Autonomous Implementation & TDD Loop (Iterate Without Asking)
- Formulate the plan or diagnose the bug.
- Execute the implementation iteratively using **Test-Driven Development (TDD)**:
  - Write or update tests covering the expected behavior first.
  - Implement changes, run tests, diagnose failures, and adjust code in an autonomous loop.
  - **Do NOT ask the user for permission on routine intermediate steps** or pause unnecessarily. Solve the problem through the feedback loop.

#### Step 3: Self-Verification (Automated Proof)
- Before presenting any work to the user, ensure all automated verifications pass:
  - Backend Go test suite: `cd backend-go; go test -v ./...`
  - Backend Go compilation: `cd backend-go; go build ./...`
  - Frontend TypeScript typecheck: `cd frontend; npx tsc --noEmit`
- Verify that no regressions were introduced.

#### Step 4: User Verification Gate & Code Review Presentation
- Once automated checks pass, **STOP** and present the work to the user for human review:
  - **Present Code Changes**: Display the changed code and diffs clearly so the user can easily read through the implementation.
  - **Clickable File Links**: Include clickable markdown file links (`[filename.go](file:///path/to/filename.go)`) for every touched file.
  - **Guide User Verification**: Prompt the user to test and verify the feature or fix via:
    - **Browser UI**: e.g., `http://localhost:3000` (login flows, room joining, chat UI).
    - **API Endpoints**: e.g., `http://localhost:8000` (endpoints, payload responses).
    - **Real-Time WebSockets**: e.g., presence, typing indicators, live message updates.

#### Step 5: User Approval Gate Before Commit & Push
- **NEVER stage, commit, or push changes to git without explicit user verification and approval.**
- ONLY after the user has reviewed the code, verified the functionality in the browser/API, and explicitly confirmed approval:
  1. Stage modified files (`git add <files>`).
  2. Create a clear, descriptive commit message.
  3. Push to the relevant branch (`git push origin <branch-name>`).

---

### 4.2 Strict Behavioral Rules

### Rule 1: No Unverified Assumptions (Evidence First)
- Never assume a service is running or failing without verifying. Always test commands or inspect ports before making statements.
- Use `verification-before-completion` before declaring any task complete. Verify backend changes with Go tests (`cd backend-go; go test -v ./...`) and builds (`cd backend-go; go build ./...`). Verify frontend changes with TypeScript typechecks (`cd frontend; npx tsc --noEmit`).

### Rule 2: Brainstorming & Planning Gate
- **Do not write code for complex features or architectural changes without prior user alignment.**
- Follow the `brainstorming` skill: clarify intent, present architectural options, assess tradeoffs, and wait for confirmation.
- Use `writing-plans` to generate atomic, checklist-driven plans before multi-file refactoring.

### Rule 3: File Editing Discipline
- Only modify targeted line ranges with `replace_file_content`. Avoid whole-file replacements whenever possible.
- Never strip comments, docs, or types unrelated to the task.
- Format all file references in your responses as clickable markdown links (`[filename.go](file:///path/to/filename.go)`).

### Rule 4: Secret & Environment Safety
- Never hardcode JWT secrets (`ACCESS_TOKEN_SECRET`), PostgreSQL connection strings with passwords (`DATABASE_URL`), or Redis credentials in code files.
- Always load configuration from environment variables (`os.Getenv` in Go, `process.env` in Next.js) and ensure `.env` and `.env.local` remain in `.gitignore`.
- Follow the `accidental-data-loss-prevention` skill: never execute destructive DB operations (`DROP TABLE`, `TRUNCATE`, broad `DELETE`, or `redis-cli flushall`) without explicit user permission.

### Rule 5: Frontend Build Constraint
- **Do NOT run `npm run build` or Next.js production build commands on the frontend unless the user explicitly requests it.**
- Because the user runs the dev server locally, full frontend builds are slow and unnecessary. Rely on TypeScript typechecks (`npx tsc --noEmit`) or targeted tests instead, and never trigger a frontend production build without explicit user instruction.

### Rule 6: Backend Go Exclusivity
- **All backend development MUST occur within `backend-go` exclusively.**
- The `backend-js/` directory is strictly deprecated and preserved only for legacy historical reference. Agents must NEVER edit, add features to, or run services from `backend-js/`.
- Do not introduce Node.js backend packages, ts-node configs, or npm scripts for backend operations. All server logic, middleware, WebSocket handlers, and migrations must be written in Go.


---

## 5. Domain Architecture: Dual Authentication Flow

### User Status Hierarchy & State Machine
```go
const (
    UserStatusAnonymous = "anonymous" // Active ephemeral guest session
    UserStatusPermanent = "permanent" // Registered persistent account
    UserStatusArchived  = "archived"  // Terminated guest session (releases username)
)
```

### PostgreSQL Relational Schema & Indexing Strategy
1. **`users` Table**:
   - `id SERIAL PRIMARY KEY`
   - `username TEXT NOT NULL`
   - `email TEXT` (NULL for guest users)
   - `dob TEXT NOT NULL`
   - `gender TEXT NOT NULL`
   - `password TEXT` (bcrypt-hashed with `DefaultCost = 10` for permanent users; NULL for guests)
   - `ip_address TEXT`
   - `device_details JSONB` (browser, OS, deviceType, timezone, language, userAgent)
   - `user_status TEXT DEFAULT 'anonymous'` (`anonymous` | `permanent` | `archived`)
   - `created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
   - `updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

2. **Partial Unique Indexes** (Critical architectural rule):
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_permanent ON users(username) WHERE user_status = 'permanent';
   CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_permanent ON users(email) WHERE user_status = 'permanent';
   ```
   *Rationale*: Permanent accounts have globally unique usernames and emails. Anonymous guest usernames are intentionally **excluded** from the database unique constraint because usernames are reusable once archived. Uniqueness among active guest sessions is enforced in real-time via Redis atomic locks.

3. **`tokens` Table**:
   - `id SERIAL PRIMARY KEY`, `username TEXT NOT NULL`, `token TEXT UNIQUE NOT NULL`, `device_fingerprint TEXT`, `expired BOOLEAN DEFAULT FALSE`, `created_at TIMESTAMP`, `updated_at TIMESTAMP`.

---

### Authentication Flows & Endpoints

#### 1. Guest / Anonymous User Flow
- **Endpoint**: `POST /api/auth/guest-login`
  - **Payload**: `{ username, gender, dob, ip_address?, deviceDetails? }`
  - **Collision Checks**:
    1. PostgreSQL: checks if username is taken by a permanent account (`user_status = 'permanent'`). Returns `409 Conflict` if taken.
    2. Redis: checks if username is currently locked by an active guest (`IsGuestActive`). Returns `409 Conflict` if active.
  - **Atomic Lock Acquisition**:
    - Creates anonymous user row in PostgreSQL (`user_status = 'anonymous'`).
    - Executes Redis atomic lock: `SETNX active_guest:{lowercase_username} {userID} EX 300` (`DefaultGuestSessionTTL = 5 * time.Minute`).
    - If lock acquisition fails, immediately rolls back the user record to `user_status = 'archived'` and returns `409 Conflict`.
  - **Token Generation**:
    - Issues HMAC-SHA256 JWT (2-hour expiry) with claims: `{ username, gender, dob, user_status: "anonymous", exp }`.
    - Inserts token into PostgreSQL `tokens` table.
- **Presence & Heartbeat**:
  - Frontend client (`AuthProvider.tsx`) runs a background heartbeat loop every 30 seconds hitting `POST /api/auth/heartbeat`.
  - `RenewGuestHeartbeat` refreshes Redis TTL: `EXPIRE active_guest:{lowercase_username} 300`.
  - Socket.IO connection also handles `guest-heartbeat` events, and `JWTAuthMiddleware` automatically renews guest TTL on every authenticated HTTP request.
- **Session Teardown & Username Release**:
  - Triggers:
    - Explicit logout: `POST /api/auth/guest-logout` or `POST /api/auth/logout`.
    - Tab / browser closure: `navigator.sendBeacon` firing to `/api/auth/guest-logout` via `beforeunload` event.
    - WebSocket disconnection: Socket.IO `disconnect` handler detects guest sockets and calls `auth.ReleaseGuestUsername`.
    - Token expiration: `POST /api/auth/verify` detects expired guest tokens and invokes cleanup.
  - Teardown Operations:
    1. Redis key `active_guest:{lowercase_username}` is deleted immediately.
    2. PostgreSQL user status is updated: `UPDATE users SET user_status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = $1`.
    3. Token is marked `expired = true` in `tokens` table.
    4. The username is immediately released for other users to claim without database collision.

#### 2. Permanent User Flow
- **Registration**: `POST /api/auth/register-permanent`
  - **Payload**: `{ username, email, password, gender, dob, ip_address?, deviceDetails? }` (password min 6 characters).
  - Validates uniqueness against permanent accounts in PostgreSQL and active guests in Redis.
  - Hashes password using bcrypt (`bcrypt.DefaultCost = 10`).
  - Inserts row with `user_status = 'permanent'`.
  - Generates JWT token with claim `user_status: "permanent"` and records it in `tokens`.
- **Login**: `POST /api/auth/login-permanent`
  - **Payload**: `{ identifier, password, deviceDetails? }` (`identifier` matches username or email).
  - Queries `users` for permanent accounts, compares password hash via `bcrypt.CompareHashAndPassword`.
  - Issues JWT token and stores in `tokens`.

#### 3. Token Verification & Middleware
- **Verify Endpoint**: `POST /api/auth/verify` (`{ token }`)
  - Confirms token exists and `expired = false` in `tokens` table.
  - Verifies JWT signature and claims via `auth.VerifyToken`.
  - Automatically cleans up expired guest sessions.
- **JWT Auth Middleware**: `middleware.JWTAuthMiddleware()`
  - Enforces `Authorization: Bearer <token>` on protected routes (e.g. `/api/chatroom/enter`, `/api/chatroom/:roomId/messages`).
  - Sets decoded claims into Gin context (`c.Set("user", claims)`).
  - Automatically renews guest session TTL in Redis if `user_status == "anonymous"`.

#### 4. Legacy Compatibility Endpoint
- `POST /api/auth/register`: Automatically routes to permanent registration if a password is supplied, or guest login if omitted.

---

## 6. Real-Time Engine & Redis Pub/Sub Conventions

- **Server**: Go Socket.IO v2 server (`github.com/zishang520/socket.io/v2/socket`) attached to Gin router on `/socket.io/*any`.
- **Redis Pub/Sub Subscriber**: Subscribes to channels on startup for multi-instance horizontal scaling:
  - `MESSAGES`: Chat message broadcasting across server instances.
  - `JOIN-GROUPS`: User presence entering rooms.
  - `LEAVE-GROUPS`: User presence exiting rooms.
  - `GUEST-DISCONNECT`: Immediate notification to free guest username resources across nodes.
- **WebSocket Events**:
  - `message`: Persists message to PostgreSQL `messages` table via `chatroom.SaveMessage`, broadcasts payload to room via `client.To(Room(roomId)).Emit("message", ...)` (excluding sender to prevent optimistic update duplication), and publishes to Redis `MESSAGES`.
  - `join-room`: Joins Socket.IO room, records member in in-memory room map, associates socket with guest session for presence tracking.
  - `user-joined`: Broadcasts `{ username, roomId }` to room and broadcasts updated `online-members` array.
  - `get-online-members`: Emits current room member list (`{ roomId, members }`) to the requesting client.
  - `leave-room`: Leaves room, emits `user-left` to room, and broadcasts updated `online-members`.
  - `typing`: Relays typing indicator to room members (`client.To(Room(roomId)).Emit("typing", data)`).
  - `guest-heartbeat`: Renews guest TTL in Redis (`RenewGuestHeartbeat`).
  - `disconnect`: Cleans up room memberships, emits `user-left`, and if the socket was an active guest, immediately executes `auth.ReleaseGuestUsername` (deletes Redis key, archives DB record).

---

## 7. Development & Runbook Workflows

### Starting Local Services

1. **Redis**:
   ```powershell
   & "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-server.exe"
   ```

2. **Backend (Go)**:
   ```powershell
   cd backend-go
   # Live reload using Air:
   air
   # Or standard execution:
   go run main.go
   ```

3. **Frontend (Next.js)**:
   ```powershell
   cd frontend
   npm run dev
   ```

4. **Automated Multi-Service Launcher**:
   ```powershell
   .\start-dev.ps1
   # Automatically boots Frontend, Redis Server, and Go Backend in Windows Terminal tabs
   ```

### Verification & Testing Commands
- **Backend (Go) Test Suite**: `cd backend-go; go test -v ./...`
- **Backend (Go) Build Check**: `cd backend-go; go build ./...`
- **Frontend Typecheck**: `cd frontend; npx tsc --noEmit` *(Do NOT run `npm run build` unless explicitly requested)*
- **Redis Health Check**: `& "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-cli.exe" ping`
- **PostgreSQL Connection Check**: Ensure `DATABASE_URL` is reachable on port `5432`.