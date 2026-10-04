# ChatterBase - Completed Tasks & Changelog

This document tracks all completed features, architectural milestones, and changes made to ChatterBase across both backend and frontend systems, compiled from the project commit history and design plans.

---

## 📋 Summary of Key Milestones

| Milestone | Area | Status | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **1. Monorepo Setup & Legacy Cleanup** | Core / Infra | Completed | Migrated to clean monorepo; preserved deprecated legacy code in [backend-js](file:///d:/personal-projects/chatterbase/backend-js). |
| **2. Go Backend Migration** | Backend | Completed | Built high-concurrency Go service ([backend-go](file:///d:/personal-projects/chatterbase/backend-go)) using Gin, PostgreSQL (`pgxpool`), Redis, and Socket.IO. |
| **3. UI Theming & NextAuth v5** | Frontend | Completed | Integrated dark/light theme switching and NextAuth.js v5 beta credentials authentication with protected routes. |
| **4. Developer Experience & Automation** | DevOps | Completed | Automated launcher scripts ([start-dev.ps1](file:///d:/personal-projects/chatterbase/start-dev.ps1), [start-dev.sh](file:///d:/personal-projects/chatterbase/start-dev.sh)), Air live-reload with Delve debugging, and [AGENTS.md](file:///d:/personal-projects/chatterbase/AGENTS.md). |
| **5. Hybrid Dual-Authentication (PR #1)** | Full Stack | Completed | Implemented zero-friction ephemeral guest accounts with atomic Redis locks alongside permanent bcrypt-hashed accounts. |
| **6. Typing Indicator & Resizable Panels (PR #2)** | Real-Time / UI | Completed | Discord-style real-time typing indicator with bouncing dots and shadcn resizable draggable online members pane. |
| **7. Presence Idempotency & Message Deduplication (PR #3)** | Real-Time / Sockets | Completed | Hardened room entry/exit to prevent redundant system messages and ensure clean disconnection teardown. |
| **8. Terms & Conditions and Legal Protection** | Legal / Compliance | Completed | Enterprise-grade terms page (/terms) with safe harbor, liability disclaimers, and mandatory consent checkboxes in auth flows. |

---

## 🚀 Detailed Phase Breakdown

### Phase 1: Project Initialization & Structure Re-alignment
- **Repository Setup**: Initialized clean monorepo structure with frontend (Next.js) and backend services.
- **Tab-Based Chatroom Switching**: Introduced tabbed switching between chatrooms with [ChatroomsDialog.tsx](file:///d:/personal-projects/chatterbase/frontend/components/common/ChatroomsDialog.tsx) and [tabs.tsx](file:///d:/personal-projects/chatterbase/frontend/components/ui/tabs.tsx).
- **Legacy Deprecation**: Preserved the original Node.js/Express implementation in [backend-js](file:///d:/personal-projects/chatterbase/backend-js) strictly as reference, establishing that all active backend development happens in [backend-go](file:///d:/personal-projects/chatterbase/backend-go).

### Phase 2: Go Backend Architecture & Database Engine
- **Gin Framework & Database Migration**: Created [backend-go](file:///d:/personal-projects/chatterbase/backend-go) utilizing Gin HTTP routing, PostgreSQL 16+ via [pgxpool](file:///d:/personal-projects/chatterbase/backend-go/config/postgres.go), and Redis 7+ via [redis.go](file:///d:/personal-projects/chatterbase/backend-go/config/redis.go).
- **Socket.IO Real-Time Server**: Mounted `zishang520/socket.io/v2` on `/socket.io/*any` in [main.go](file:///d:/personal-projects/chatterbase/backend-go/main.go) with Redis Pub/Sub integration for horizontal multi-instance scaling.
- **Message Persistence & Room Queries**: Built [chatroom/model.go](file:///d:/personal-projects/chatterbase/backend-go/chatroom/model.go) and [chatroom/handler.go](file:///d:/personal-projects/chatterbase/backend-go/chatroom/handler.go) for storing messages in PostgreSQL and fetching paginated room history.
- **Diagnostic Utilities**: Added Redis connectivity and TLS probes in [tools/redis_tls_probe](file:///d:/personal-projects/chatterbase/backend-go/tools/redis_tls_probe).

### Phase 3: Frontend Modernization & NextAuth v5
- **NextAuth.js v5 Integration**: Configured [auth.ts](file:///d:/personal-projects/chatterbase/frontend/auth.ts) and Next.js route handler in [app/api/auth/[...nextauth]/route.ts](file:///d:/personal-projects/chatterbase/frontend/app/api/auth/[...nextauth]/route.ts) with custom Credentials provider and JWT session management.
- **Route Guarding**: Enforced access control on protected routes (`/available-chatrooms`, `/chatrooms/[slug]`) using Next.js [middleware.ts](file:///d:/personal-projects/chatterbase/frontend/middleware.ts).
- **Theme Switching**: Added dark and light theme toggle support across the UI with Tailwind CSS and Radix UI primitives.

### Phase 4: Developer Automation & Tooling
- **One-Command Dev Launchers**:
  - [start-dev.ps1](file:///d:/personal-projects/chatterbase/start-dev.ps1): Automated Windows launcher that checks/spawns native Redis (`redis-server.exe`), starts Next.js frontend, and runs the Go backend.
  - [start-dev.sh](file:///d:/personal-projects/chatterbase/start-dev.sh): Dev launcher for Linux and macOS environments.
- **Headless Debugging**: Configured Air live-reload in [backend-go/.air.toml](file:///d:/personal-projects/chatterbase/backend-go/.air.toml) with Delve headless debugging on port `2345`.
- **Operational Guidelines**: Established comprehensive agent guidelines, domain rules, and architecture specs in [AGENTS.md](file:///d:/personal-projects/chatterbase/AGENTS.md).

### Phase 5: Hybrid Dual-Authentication System (PR #1)
- **Domain-Driven Architecture**: Refactored backend into domain packages ([auth](file:///d:/personal-projects/chatterbase/backend-go/auth), [chatroom](file:///d:/personal-projects/chatterbase/backend-go/chatroom), [middleware](file:///d:/personal-projects/chatterbase/backend-go/middleware), [socket](file:///d:/personal-projects/chatterbase/backend-go/socket)).
- **Dual User Types**:
  - **Guest / Ephemeral Users**: Instant entry without passwords. Active username uniqueness enforced via atomic Redis locks (`SETNX active_guest:<lowercase_username>`) with a 5-minute TTL.
  - **Permanent Users**: Persistent accounts with email, username, and bcrypt-hashed passwords (`cost = 10`).
- **PostgreSQL Partial Unique Indexes**:
  ```sql
  CREATE UNIQUE INDEX idx_users_username_permanent ON users(username) WHERE user_status = 'permanent';
  CREATE UNIQUE INDEX idx_users_email_permanent ON users(email) WHERE user_status = 'permanent';
  ```
  Permits historical archived guest usernames to be reused by future guests without database collision.
- **Resilient Guest Presence Lifecycle**:
  - 30-second background heartbeat loop in [AuthProvider.tsx](file:///d:/personal-projects/chatterbase/frontend/contexts/AuthProvider.tsx) hitting `POST /api/auth/heartbeat`.
  - Automatic Redis TTL renewal on every authenticated request via [middleware/auth.go](file:///d:/personal-projects/chatterbase/backend-go/middleware/auth.go).
  - Session teardown via `POST /api/auth/guest-logout`, `navigator.sendBeacon` on browser `beforeunload`, and WebSocket disconnection handling.
  - Archiving: Sets `user_status = 'archived'` in PostgreSQL upon termination and deletes Redis lock immediately.
- **Dual Auth UI**:
  - Dedicated [PermanentAuthForm.tsx](file:///d:/personal-projects/chatterbase/frontend/components/auth/PermanentAuthForm.tsx) for Sign In & Sign Up at `/permanent-login`.
  - Dedicated guest login at `/guest-login`.
  - Member badges distinguishing `[Guest]` and `[Member]` in [OnlineMembers.tsx](file:///d:/personal-projects/chatterbase/frontend/components/chatrooms/OnlineMembers.tsx).

### Phase 6: Real-Time Typing Indicators & Resizable Panels (PR #2)
- **Discord-Style Real-Time Typing Indicator**:
  - Created [TypingIndicator.tsx](file:///d:/personal-projects/chatterbase/frontend/components/chatrooms/TypingIndicator.tsx) with dynamic natural-language plurals:
    - 1 user: *"Alice is typing..."*
    - 2 users: *"Alice and Bob are typing..."*
    - 3 users: *"Alice, Bob, and Charlie are typing..."*
    - 4+ users: *"Several people are typing..."*
  - Discord-like 3-dot jumping CSS animation.
- **Typing State Machine**:
  - Throttled emission in [MessageBox.tsx](file:///d:/personal-projects/chatterbase/frontend/components/chatrooms/MessageBox.tsx) (max once every 2.5s).
  - Immediate typing clearing upon sending message or blurring input.
  - 4-second auto-expiry TTL in [SocketProvider.tsx](file:///d:/personal-projects/chatterbase/frontend/contexts/SocketProvider.tsx).
  - Backend event relay and validation in [socket/socket.go](file:///d:/personal-projects/chatterbase/backend-go/socket/socket.go).
- **Draggable Resizable Online Members Pane**:
  - Built [components/ui/resizable.tsx](file:///d:/personal-projects/chatterbase/frontend/components/ui/resizable.tsx) wrapping `react-resizable-panels`.
  - Integrated into [chatrooms/[slug]/page.tsx](file:///d:/personal-projects/chatterbase/frontend/app/(protected)/(socket)/chatrooms/[slug]/page.tsx) with smooth drag handle, snap-to-collapse (0% width), and uncollapse toggle button.
  - Preserved mobile slide-out sheet drawer for viewports under `md`.

### Phase 7: Chat Presence & Idempotency Hardening (PR #3)
- **Presence Teardown Idempotency**:
  - Made `removeMember` in [socket/socket.go](file:///d:/personal-projects/chatterbase/backend-go/socket/socket.go) idempotent to prevent duplicate `user-left` events when both `leave-room` and socket `disconnect` fire.
  - Added unit test `TestRemoveMember_IdempotentAndCleanup` in [socket/socket_test.go](file:///d:/personal-projects/chatterbase/backend-go/socket/socket_test.go).
- **System Message Deduplication**:
  - Guarded against empty/whitespace usernames triggering phantom join/leave messages in [SocketProvider.tsx](file:///d:/personal-projects/chatterbase/frontend/contexts/SocketProvider.tsx).
  - Streamlined `useEffect` in [chatrooms/[slug]/page.tsx](file:///d:/personal-projects/chatterbase/frontend/app/(protected)/(socket)/chatrooms/[slug]/page.tsx) to manage room subscription cleanly without redundant joins on re-renders.

### Phase 8: Terms & Conditions and Legal Protections
- **Enterprise-Grade Legal Page**:
  - Built dedicated, responsive Terms of Service at [frontend/app/terms/page.tsx](file:///d:/personal-projects/chatterbase/frontend/app/terms/page.tsx).
  - Covered Intermediary Safe Harbor under Section 79 of the Indian IT Act 2000, IT Rules 2021 (Rule 3), and US 47 U.S.C. § 230 (Communications Decency Act).
  - Established strict "AS IS" disclaimers, INR ₹100 liability caps, user indemnification ("hold harmless"), acceptable use policies, and grievance officer contact.
- **Mandatory Consent Checkboxes**:
  - Created [frontend/components/ui/checkbox.tsx](file:///d:/personal-projects/chatterbase/frontend/components/ui/checkbox.tsx) using Radix UI primitives.
  - Integrated required `agreeToTerms` Zod validation into [LoginForm.tsx](file:///d:/personal-projects/chatterbase/frontend/components/auth/LoginForm.tsx) (guest login) and [PermanentAuthForm.tsx](file:///d:/personal-projects/chatterbase/frontend/components/auth/PermanentAuthForm.tsx) (permanent registration).
  - Added terms notices to permanent sign-in and navigation bar [Navbar.tsx](file:///d:/personal-projects/chatterbase/frontend/components/common/Navbar.tsx).
- **Public Access Exemption**:
  - Configured [AuthProvider.tsx](file:///d:/personal-projects/chatterbase/frontend/contexts/AuthProvider.tsx) and [middleware.ts](file:///d:/personal-projects/chatterbase/frontend/middleware.ts) to permit unrestricted public access to `/terms` without requiring login.

---

## 📜 Commit Log History

| Commit | Date | Author | Description |
| :--- | :--- | :--- | :--- |
| `cac7334` | 2025-09-19 | ujjwalkirti | Initial setup of backend and frontend subdirectories |
| `91bc3b3` | 2025-09-19 | ujjwalkirti | Add root `.gitignore` and decouple previous remote origins |
| `0aa4660` | 2025-09-19 | ujjwalkirti | Remove outdated structure |
| `5e67b0a` | 2025-09-19 | ujjwalkirti | Re-initialize monorepo with Next.js frontend and Express backend |
| `7fd4594` | 2025-09-20 | ujjwalkirti | Add tab-based chatroom switching and dialog components in frontend |
| `0869ce4` | 2025-09-20 | ujjwalkirti | Support tab-based chatroom switching in backend and update README |
| `7044cff` | 2026-01-01 | Ujjwal Kirti | Introduce new Go backend service (`backend-go`) with Gin, Postgres, and Redis |
| `f2bc5fd` | 2026-01-01 | Ujjwal Kirti | Upgrade chatroom real-time messaging, messages container, and Redis TLS tools |
| `d018baf` | 2026-01-01 | Ujjwal Kirti | Implement theme change functionality (dark/light mode) |
| `7fc517b` | 2026-01-01 | Ujjwal Kirti | Integrate NextAuth.js v5 beta for frontend authentication and route guards |
| `f4ad6d0` | 2026-09-14 | ujjwalkirti | Update `.gitignore` rules for environment files and artifacts |
| `b99724f` | 2026-09-14 | ujjwalkirti | Deprecate `backend-js/` and initialize `AGENTS.md` guidelines |
| `f9ff330` | 2026-09-14 | ujjwalkirti | Add automated local dev startup scripts (`start-dev.ps1`, `start-dev.sh`) |
| `0f280f8` | 2026-09-14 | ujjwalkirti | Implement hybrid dual-authentication and domain-driven structure in Go backend |
| `8bff5a6` | 2026-09-19 | ujjwalkirti | Implement resilient guest presence lifecycle (heartbeats, unload beacon, Redis locks) |
| `67ed18f` | 2026-09-24 | ujjwalkirti | Document dual-auth state machine and operational lifecycle in `AGENTS.md` |
| `a9e7f16` | 2026-09-24 | ujjwalkirti | Configure Delve headless debugging on port 2345 in Air config |
| `21825e1` | 2026-09-24 | ujjwalkirti | Add member type (`guest` vs `permanent`) to online member socket payloads |
| `8f0b925` | 2026-09-24 | ujjwalkirti | Add permanent login route placeholder and link in guest login form |
| `2a7c7c4` | 2026-09-27 | ujjwalkirti | Build `PermanentAuthForm` and migrate guest login to `/guest-login` |
| `ed557ee` | 2026-09-27 | ujjwalkirti | Format guest display names in member list and enforce guest session expiry |
| `4474cad` | 2026-09-27 | Ujjwal Kirti | **Merge PR #1**: Overhaul of authentication setup (hybrid dual auth) |
| `c59b93a` | 2026-09-27 | ujjwalkirti | Add Discord typing indicator and resizable online members panel |
| `d7a9734` | 2026-09-27 | Ujjwal Kirti | **Merge PR #2**: Typing indicator and resizable panel feature branch |
| `e1b6efb` | 2026-10-04 | ujjwalkirti | Fix socket join/leave redundant messages and ensure leave idempotency |
| `894fd4f` | 2026-10-04 | ujjwalkirti | Add `completedtasks.md` and link in `Readme.md` |
| `208718b` | 2026-10-04 | Ujjwal Kirti | **Merge PR #3**: Socket presence deduplication and completed tasks documentation |
