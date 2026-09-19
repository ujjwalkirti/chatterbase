# AGENTS.md - ChatterBase Agent Operational Guidelines

> **Notice for AI Agents**: This file defines the architectural rules, technology stack conventions, directory boundaries, development workflows, and strict behavioral standards for any AI agent working on ChatterBase. Adherence is mandatory.

---

## 1. Project Overview & Mission

ChatterBase is a high-concurrency, real-time messaging and chatroom platform designed with a hybrid authentication architecture:
- **Guest / Anonymous Users**: Zero-password barrier to entry. Enforces username uniqueness among active sessions. Guest sessions cleanly terminate and release their usernames upon browser or tab closure.
- **Permanent Users**: Standard authenticated accounts (email/username + bcrypt-hashed password) with persistent sessions, profile state, and permanent chat ownership.
- **Real-Time Engine**: Built on Socket.io with Redis Pub/Sub backplane, supporting horizontal scaling across multiple Node.js worker nodes.

---

## 2. Technology Stack & Architecture

### Frontend
- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript (`strict: true`)
- **Styling**: Tailwind CSS v4, Radix UI primitives, Lucide React icons
- **Form Management**: React Hook Form, Zod schema validation
- **Auth Layer**: NextAuth.js v5 (beta) + React Context (`AuthProvider`)
- **Real-Time Client**: `socket.io-client`

### Backend
- **Server**: Node.js + Express 5 (TypeScript)
- **Database**: MongoDB via Mongoose 8
- **Pub/Sub & Fast Cache**: Redis 7+ (`ioredis`)
- **WebSockets**: Socket.io server attached to Express HTTP server
- **Security & Tokens**: JWT (`jsonwebtoken`), `bcryptjs` for password hashing
- **Device Tracking**: Client-side fingerprinting (OS, browser, device type, timezone, IP) stored with user sessions

### Infrastructure & Local Services
- **Redis (Windows)**: Standalone native Windows binary located at `C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-server.exe` (Port `6379`). Do NOT rely on WSL port forwarding for Redis.
- **MongoDB**: Default connection to `mongodb://localhost:27017/chatter-base` (or `MONGO_URI` from `backend/.env`).
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
├── backend/
│   ├── src/
│   │   ├── config/             # DB & Redis connection clients
│   │   ├── controllers/        # Express route handlers (/api/auth, /api/chatrooms, etc.)
│   │   ├── middlewares/        # Auth verification, rate limiting, request validation
│   │   ├── models/             # Mongoose schemas (User, Chatroom, Message, etc.)
│   │   ├── services/           # Business logic (auth service, socket service, redis pub/sub)
│   │   ├── utils/              # Helper functions & token utilities
│   │   └── index.ts            # Server entrypoint (HTTP + Socket.io + DB bootstrap)
│   ├── .env                    # Environment variables (PORT, MONGO_URI, JWT secret, REDIS)
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── app/                    # Next.js App Router routes & layouts
    │   ├── (auth)/             # Authentication views (/login, /register)
    │   ├── (protected)/        # Authenticated views (/available-chatrooms, /chatrooms/[id])
    │   ├── layout.tsx          # Root layout with theme & auth providers
    │   └── page.tsx            # Landing page
    ├── components/
    │   ├── auth/               # LoginForm, RegisterForm, UserTypeToggle
    │   ├── chatrooms/          # Chatroom list, ChatBox, MessageList, MemberList
    │   ├── common/             # Headers, footers, shared modals
    │   └── ui/                 # Atomic UI components (shadcn/Radix primitives)
    ├── contexts/               # React Contexts (AuthProvider, SocketProvider)
    │   └── AuthProvider.tsx
    ├── utils/                  # Client utility functions & device fingerprinting
    ├── .env.local              # Frontend environment variables
    ├── package.json
    └── tsconfig.json
```

---

## 4. Strict Agent Rules & Behavioral Guidelines

### Rule 1: No Unverified Assumptions (Evidence First)
- Never assume a service is running or failing without verifying. Always test commands or inspect ports before making statements.
- Use `verification-before-completion` before declaring any task complete. Verify with TypeScript builds (`npm run build`), unit tests, or endpoint tests.

### Rule 2: Brainstorming & Planning Gate
- **Do not write code for complex features or architectural changes without prior user alignment.**
- Follow the `brainstorming` skill: clarify intent, present architectural options, assess tradeoffs, and wait for confirmation.
- Use `writing-plans` to generate atomic, checklist-driven plans before multi-file refactoring.

### Rule 3: File Editing Discipline
- Only modify targeted line ranges with `replace_file_content`. Avoid whole-file replacements whenever possible.
- Never strip comments, docs, or types unrelated to the task.
- Format all file references in your responses as clickable markdown links (`[filename.ts](file:///path/to/filename.ts)`).

### Rule 4: Secret & Environment Safety
- Never hardcode JWT secrets, database connection strings with passwords, or API keys in code files.
- Always load from `process.env` and ensure `.env` and `.env.local` are in `.gitignore`.
- Follow the `accidental-data-loss-prevention` skill: never run destructive DB drops (`User.collection.drop()`, `redis-cli flushall`) without explicit user permission.

### Rule 5: Frontend Build Constraint
- **Do NOT run `npm run build` or Next.js production build commands on the frontend unless the user explicitly requests it.**
- Because the user runs the dev server locally, full frontend builds are slow and unnecessary. Rely on TypeScript typechecks (`npx tsc --noEmit`) or targeted tests instead, and never trigger a frontend production build without explicit user instruction.


---

## 5. Domain Architecture: Dual Authentication Flow

### User Types
```typescript
type UserStatus = "anonymous" | "permanent";
```

1. **Guest / Anonymous User**:
   - Fields: `username`, `dob`, `gender`, `deviceDetails`, `ip_address`, `user_status: "anonymous"`.
   - `password`: Not required.
   - `email`: Not required.
   - **Username Uniqueness Rule**: Must be unique *among active sessions*. Redis key lock: `active_guest:{username}` with TTL.
   - **Session Lifecycle**:
     - Client connects via ephemeral session (no long-term persistent cookie).
     - Socket emits heartbeats / ping to keep Redis presence alive.
     - On browser/tab close (`beforeunload` beacon or Socket.io `disconnect`), backend releases the username key and marks/removes the guest session.

2. **Permanent User**:
   - Fields: `username`, `email`, `password` (bcrypt-hashed), `dob`, `gender`, `deviceDetails`, `user_status: "permanent"`.
   - `password`: Required (enforced via Mongoose conditional validation and pre-save hook).
   - `email`: Required and globally unique index in MongoDB.
   - **Session Lifecycle**: Standard long-lived JWT refresh / session tokens (e.g., 30 days).

---

## 6. Real-Time Engine & Redis Pub/Sub Conventions

- All chat messages sent over WebSockets must be published to Redis channel `MESSAGES` to ensure multi-instance broadcasting.
- Channel names:
  - `MESSAGES`: Room and direct chat payloads.
  - `JOIN-GROUPS`: User presence entering rooms.
  - `LEAVE-GROUPS`: User presence exiting rooms.
  - `GUEST-DISCONNECT`: Immediate notification to free guest username resources across nodes.
- Do not perform synchronous long-running database queries inside high-frequency Socket.io event callbacks; leverage Redis cache where appropriate.

---

## 7. Development & Runbook Workflows

### Starting Local Services
1. **Redis**:
   ```powershell
   & "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-server.exe"
   ```
2. **Backend**:
   ```powershell
   cd backend
   npm run dev
   ```
3. **Frontend**:
   ```powershell
   cd frontend
   npm run dev
   ```

### Verification & Testing Commands
- **Backend (Go) Typecheck / Build**: `cd backend-go; go build ./...` and `go test -v ./...`
- **Frontend Typecheck**: `cd frontend; npx tsc --noEmit` (Do NOT run `npm run build` unless explicitly requested)
- **Redis Health Check**: `& "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-cli.exe" ping`
- **PostgreSQL Connection Check**: Ensure `DATABASE_URL` is reachable on port `5432`.