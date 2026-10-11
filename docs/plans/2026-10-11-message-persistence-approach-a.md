# Message Persistence (Approach A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement stateless chatroom message persistence and hydration (Approach A) using JWT `iat` session windowing with composite index optimization in Go backend and client-side hydration in Next.js.

**Architecture:**
- On login (guest or permanent), the backend generates a JWT token containing standard `iat` (issued-at Unix timestamp) claim.
- On chatroom entrance, client invokes `GET /api/chatroom/:roomId/messages`.
- Backend extracts `iat` from token claims (or optional query parameter) to determine `session_start`:
  - If fresh session (`now - session_start < 60s`): returns up to 20 past context messages.
  - If returning session (`now - session_start >= 60s`): returns up to 20 context messages created before `session_start` PLUS all messages created since `session_start` (capped at 100), ordered chronologically.
- A composite PostgreSQL index `idx_messages_room_created_desc ON messages(room_id, created_at DESC)` ensures $O(\log N + K)$ query latency.
- Client (`SocketProvider`) hydrates the messages map on room mount, preventing duplicate items with incoming real-time socket events.

**Tech Stack:** Go 1.23, Gin, pgxpool, PostgreSQL 16, Redis 8, Next.js 15, TypeScript, Socket.IO client.

---

### Task 1: Composite Index & Schema Migration
**Files:**
- Modify: `backend-go/config/postgres.go`
- Test: `backend-go/chatroom/chatroom_test.go`

- [ ] **Step 1: Write/Update test confirming schema migration runs cleanly**
- [ ] **Step 2: Add `idx_messages_room_created_desc` composite index to `runMigrations` in `postgres.go`**
- [ ] **Step 3: Run backend test to verify migration executes without error**

---

### Task 2: JWT `iat` Claim Assurance
**Files:**
- Modify: `backend-go/auth/jwt.go`
- Test: `backend-go/auth/auth_test.go`

- [ ] **Step 1: Write failing test in `backend-go/auth/auth_test.go` checking that `VerifyToken` returns non-zero `iat` claim**
- [ ] **Step 2: Run test and observe failure (RED)**
- [ ] **Step 3: Add `"iat": time.Now().Unix()` to `jwt.MapClaims` in `GenerateToken` in `backend-go/auth/jwt.go`**
- [ ] **Step 4: Run test and verify it passes (GREEN)**

---

### Task 3: Backend Message Model & Session Window Query
**Files:**
- Modify: `backend-go/chatroom/model.go`
- Test: `backend-go/chatroom/chatroom_test.go`

- [ ] **Step 1: Write failing tests in `backend-go/chatroom/chatroom_test.go` for `GetSessionMessages`:**
  - Case A: Fresh login (`sessionStart` is recent or zero) returns recent 20 messages.
  - Case B: Returning user (`sessionStart` in past) returns 20 prior context messages + messages since `sessionStart`.
- [ ] **Step 2: Run tests and observe compilation/execution failure (RED)**
- [ ] **Step 3: Implement `GetSessionMessages(ctx, roomID, sessionStart, contextLimit, maxSessionLimit)` in `backend-go/chatroom/model.go`**
- [ ] **Step 4: Run tests and verify they pass (GREEN)**

---

### Task 4: Chatroom Handler Integration
**Files:**
- Modify: `backend-go/chatroom/handler.go`
- Test: `backend-go/chatroom/chatroom_test.go`

- [ ] **Step 1: Write failing test for `GET /api/chatroom/:roomId/messages` verifying session-based windowing behavior with JWT**
- [ ] **Step 2: Run test and observe failure (RED)**
- [ ] **Step 3: Update `getMessages` in `backend-go/chatroom/handler.go` to parse `iat` from claims (or `session_start` query param) and delegate to `GetSessionMessages` when `offset == 0`**
- [ ] **Step 4: Run test and verify it passes (GREEN)**

---

### Task 5: Frontend History Hydration & Deduplication
**Files:**
- Modify: `frontend/contexts/SocketProvider.tsx`
- Modify: `frontend/app/(protected)/(socket)/chatrooms/[slug]/page.tsx`
- Modify: `frontend/components/chatrooms/MessagesContainer.tsx`

- [ ] **Step 1: Add `hydrateRoomHistory(roomId: string, token: string)` method in `SocketProvider.tsx` with duplicate protection**
- [ ] **Step 2: Trigger history hydration in `chatrooms/[slug]/page.tsx` when entering a room**
- [ ] **Step 3: Add loading and empty states in `MessagesContainer.tsx`**
- [ ] **Step 4: Run TypeScript typecheck `npx tsc --noEmit` and verify zero errors**

---

### Task 6: End-to-End Self-Verification
- [ ] **Step 1: Run full backend test suite: `go test -v ./...`**
- [ ] **Step 2: Run backend build: `go build ./...`**
- [ ] **Step 3: Run frontend typecheck: `npx tsc --noEmit`**
