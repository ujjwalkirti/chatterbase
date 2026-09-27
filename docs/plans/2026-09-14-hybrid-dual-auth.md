# Hybrid Dual-Authentication (Guest & Permanent) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a hybrid authentication system separating ephemeral guest users (no password, Redis-enforced active username uniqueness, archive-on-disconnect) and permanent users (email/username, bcrypt-hashed password, persistent session).

**Architecture:** 
Express backend provides dedicated endpoints: `POST /api/auth/guest-login`, `POST /api/auth/register-permanent`, and `POST /api/auth/login-permanent`. Active guest sessions are locked in Redis with short TTL (`active_guest:{username}`) refreshed via Socket.io heartbeats. When guests disconnect or close the browser, the Redis lock is freed, and the MongoDB user record is archived (`user_status: "archived"`) so historical chat messages stay intact.

**Tech Stack:** 
Node.js, Express 5, TypeScript, MongoDB / Mongoose 8, Redis 7+ (`ioredis`), `bcryptjs`, `jsonwebtoken`, Socket.io.

**Spec:** Section 5 of [AGENTS.md](file:///D:/personal-projects/chatterbase/AGENTS.md).

## Global Constraints
- Node / Express TypeScript builds must compile with 0 errors via `npm run build` in `backend`.
- Redis service is standalone Windows binary at `C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-server.exe` on port `6379`.
- Password hashing must use `bcryptjs` with salt rounds = 10. Passwords must never be stored in plain text.
- Anonymous usernames must only be checked for uniqueness against active Redis sessions and permanent users, NOT historical archived guests.
- When an anonymous user session terminates, mark the document `user_status: "archived"`, do not hard-delete historical messages.

---

### Task 1: Install Security Dependencies & Test Runner in Backend

**Files:**
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: npm registry
- Produces: `bcryptjs`, `@types/bcryptjs`, `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest`

- [ ] **Step 1: Install dependencies**
Run in `backend`:
```powershell
cd D:\personal-projects\chatterbase\backend
npm install bcryptjs
npm install -D @types/bcryptjs jest ts-jest @types/jest supertest @types/supertest
```

- [ ] **Step 2: Add Jest configuration to package.json**
Add `"test": "jest"` and basic jest config to `backend/package.json`.

- [ ] **Step 3: Run test script to verify test runner executes**
Run: `npm test` in `backend`.
Expected: PASS or "No tests found" (exit code 0 or cleanly running jest).

---

### Task 2: Update User Model & Add Password Hashing

**Files:**
- Modify: `backend/src/models/User.ts`
- Test: `backend/src/__tests__/models/User.test.ts`

**Interfaces:**
- Consumes: `bcryptjs`, `mongoose`
- Produces: 
  - `IUser` interface with `email?: string`, `password?: string`, `user_status: "anonymous" | "permanent" | "archived"`.
  - `comparePassword(candidatePassword: string): Promise<boolean>`.
  - Mongoose `pre("save")` hook to auto-hash password when modified.
  - Partial/sparse index on `email` and non-unique index on `username` for archived users.

- [ ] **Step 1: Write unit tests for User model**
Create `backend/src/__tests__/models/User.test.ts` testing:
1. Creating permanent user without password fails validation.
2. Creating anonymous user without password succeeds.
3. Password gets hashed on save for permanent user.
4. `comparePassword` correctly validates correct and incorrect passwords.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx jest backend/src/__tests__/models/User.test.ts`
Expected: FAIL (missing comparePassword, schema requires password currently).

- [ ] **Step 3: Implement User Schema updates in `backend/src/models/User.ts`**
Update `UserSchema`:
- `email`: `type: String, required: function() { return this.user_status === 'permanent'; }, sparse: true, trim: true, lowercase: true`
- `password`: `type: String, required: function() { return this.user_status === 'permanent'; }`
- `user_status`: enum `["anonymous", "permanent", "archived"]`, default `"anonymous"`
- Add `pre("save")` hook:
```typescript
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```
- Add method `comparePassword`:
```typescript
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};
```

- [ ] **Step 4: Run test to verify it passes**
Run: `npx jest backend/src/__tests__/models/User.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck backend**
Run: `npm run build` in `backend`.
Expected: PASS (0 TypeScript errors).

---

### Task 3: Redis Guest Presence & Session Service

**Files:**
- Create: `backend/src/services/guestSession.ts`
- Test: `backend/src/__tests__/services/guestSession.test.ts`

**Interfaces:**
- Consumes: `RedisService` (`backend/src/services/redis.ts`), `backend/src/models/User.ts`
- Produces:
  - `acquireGuestUsername(username: string, userId: string, ttlSeconds?: number): Promise<boolean>`
  - `releaseGuestUsername(username: string, userId: string): Promise<boolean>`
  - `renewGuestHeartbeat(username: string, ttlSeconds?: number): Promise<boolean>`
  - `isGuestActive(username: string): Promise<boolean>`

- [ ] **Step 1: Write test for guestSession service**
Create `backend/src/__tests__/services/guestSession.test.ts` testing:
1. `acquireGuestUsername` succeeds when key does not exist.
2. `acquireGuestUsername` returns false when key already exists.
3. `releaseGuestUsername` removes key and archives user in Mongo.
4. `renewGuestHeartbeat` extends TTL.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx jest backend/src/__tests__/services/guestSession.test.ts`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement `GuestSessionService`**
Create `backend/src/services/guestSession.ts`:
- Keys: `active_guest:{username}` -> stores `userId`.
- Uses `redisClient.set(key, userId, "EX", ttlSeconds, "NX")` for atomic acquisition.
- `releaseGuestUsername`: Deletes Redis key and runs `User.findByIdAndUpdate(userId, { user_status: "archived" })`.
- `renewGuestHeartbeat`: Runs `redisClient.expire(key, ttlSeconds)`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx jest backend/src/__tests__/services/guestSession.test.ts`
Expected: PASS.

---

### Task 4: Dual Auth Service (Guest Login, Permanent Register & Login)

**Files:**
- Modify: `backend/src/services/auth.ts`
- Test: `backend/src/__tests__/services/auth.test.ts`

**Interfaces:**
- Consumes: `User`, `Token`, `GuestSessionService`
- Produces:
  - `loginGuest(details: { username, dob, gender, ip_address }, deviceDetails)`:
    - Checks permanent users for username collision (`User.findOne({ username, user_status: 'permanent' })`).
    - Checks active guests via `GuestSessionService.acquireGuestUsername`.
    - Creates anonymous user and JWT token.
  - `registerPermanent(details: { username, email, password, dob, gender, ip_address }, deviceDetails)`:
    - Validates email and password presence.
    - Checks unique username & email among permanent users.
    - Hashes password and creates permanent user + JWT token.
  - `loginPermanent(identifier: string, password: string, deviceDetails)`:
    - Finds user by email or username where `user_status === 'permanent'`.
    - Compares password via `comparePassword`.
    - Issues JWT token.

- [ ] **Step 1: Write tests for `AuthService` dual flows**
Create `backend/src/__tests__/services/auth.test.ts` testing:
1. Guest login succeeds when username is free and locks it.
2. Guest login fails with 409 if active guest holds username.
3. Permanent register hashes password and creates user.
4. Permanent login succeeds with matching password and fails with invalid password.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx jest backend/src/__tests__/services/auth.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement methods in `backend/src/services/auth.ts`**
Add `loginGuest`, `registerPermanent`, `loginPermanent`, update existing `verifyToken` and `logout`.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx jest backend/src/__tests__/services/auth.test.ts`
Expected: PASS.

---

### Task 5: Express Auth Controller Endpoints

**Files:**
- Modify: `backend/src/controllers/auth.ts`
- Test: `backend/src/__tests__/controllers/auth.test.ts`

**Interfaces:**
- Consumes: `AuthService`
- Produces:
  - `POST /api/auth/guest-login`
  - `POST /api/auth/guest-logout`
  - `POST /api/auth/register-permanent`
  - `POST /api/auth/login-permanent`
  - `POST /api/auth/verify`
  - `POST /api/auth/logout`

- [ ] **Step 1: Write supertest integration tests for auth routes**
Create `backend/src/__tests__/controllers/auth.test.ts`:
1. `POST /api/auth/guest-login` returns 200 with JWT on valid payload.
2. `POST /api/auth/guest-login` returns 409 if username taken.
3. `POST /api/auth/register-permanent` returns 201 on valid payload.
4. `POST /api/auth/login-permanent` returns 200 on correct credentials and 401 on wrong password.

- [ ] **Step 2: Run test to verify it fails**
Run: `npx jest backend/src/__tests__/controllers/auth.test.ts`
Expected: FAIL (endpoints missing).

- [ ] **Step 3: Implement route handlers in `backend/src/controllers/auth.ts`**
Wire the endpoints to `authService` methods with standard status codes (200, 201, 400, 401, 409, 500).

- [ ] **Step 4: Run test to verify it passes**
Run: `npx jest backend/src/__tests__/controllers/auth.test.ts`
Expected: PASS.

---

### Task 6: Socket.io Disconnect & Heartbeat Hook for Guests

**Files:**
- Modify: `backend/src/services/socket.ts`
- Test: `backend/src/__tests__/services/socketGuest.test.ts`

**Interfaces:**
- Consumes: `GuestSessionService`
- Produces:
  - `socket.on("guest-heartbeat", ({ username }) => renewGuestHeartbeat)`
  - `socket.on("disconnect", () => releaseGuestUsername)` if socket was identified as guest.

- [ ] **Step 1: Write test for guest socket disconnect behavior**
Verify that when a guest disconnects, their username lock is released and status is set to archived.

- [ ] **Step 2: Implement socket listeners in `backend/src/services/socket.ts`**
Attach guest metadata to socket on connection/authentication, renew TTL on heartbeat, and trigger release on disconnect.

- [ ] **Step 3: Run test to verify it passes**
Run: `npx jest backend/src/__tests__/services/socketGuest.test.ts`
Expected: PASS.

---

### Task 7: Full System Verification & Postman Collection Update

**Files:**
- Modify: `backend/ChatterBase.postman_collection.json`
- Test: Full backend build and test suite

- [ ] **Step 1: Run complete backend test suite**
Run: `npm test` in `backend`.
Expected: ALL PASS.

- [ ] **Step 2: Run TypeScript compile verification**
Run: `npm run build` in `backend`.
Expected: PASS (0 errors, dist folder populated).

- [ ] **Step 3: Update Postman Collection**
Add requests for:
- `Guest Login` (`POST /api/auth/guest-login`)
- `Guest Logout` (`POST /api/auth/guest-logout`)
- `Permanent Register` (`POST /api/auth/register-permanent`)
- `Permanent Login` (`POST /api/auth/login-permanent`)