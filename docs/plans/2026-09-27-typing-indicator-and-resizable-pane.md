# Typing Indicator & Resizable Online Members Pane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a real-time Discord-style typing indicator (bouncing dots, "X is typing...", "X and Y are typing...", "X, Y and Z are typing...", "Several people are typing...") and a shadcn resizable draggable online members pane with collapsible behavior on screens down to tablet, while keeping default mobile behavior.

**Architecture:**
- Real-time socket events for typing (`typing` payload: `{ roomId, username, isTyping }`) with client-side throttled emission (2.5s), idle detection (3s timeout or clear), message-send clearing, and receiving auto-expiry (4s TTL).
- Go backend Socket.IO verification and testing for room typing relay.
- Shadcn UI Resizable primitives (`react-resizable-panels`) for the chatroom view, enabling smooth drag-resizing, collapse to 0%, and responsive uncollapse button, while preserving mobile layout.

**Tech Stack:** Next.js 15, React 19, Socket.IO client v4, Tailwind CSS v4, Lucide React, `react-resizable-panels`, Go 1.23+, `zishang520/socket.io/v2`.

**Spec:** User audio specifications and brainstorming alignment on Discord-style typing indicator & shadcn resizable pane.

## Global Constraints
- Backend changes exclusively in `backend-go` (no `backend-js`).
- No full production frontend builds (`npm run build`). Verify frontend via `npx tsc --noEmit`.
- No git commits before Step 5 (explicit user approval gate).
- Format all file references with clickable markdown links (`[filename.tsx](file:///path/to/filename.tsx)`).

---

### Task 1: Backend Go Typing Event Validation & Tests

**Files:**
- Modify: `backend-go/socket/socket.go`
- Test: `backend-go/socket/socket_test.go`

**Interfaces:**
- Consumes: Socket.IO `typing` client event with payload `{"roomId": string, "username": string, "isTyping": bool}`.
- Produces: Room broadcast of `typing` event payload to all room sockets except sender.

- [ ] **Step 1: Write the failing backend test in `socket_test.go`**
- [ ] **Step 2: Run test to verify failure / assertion**
- [ ] **Step 3: Implement typing event validation/relay in `socket.go`**
- [ ] **Step 4: Run backend tests to verify green**

---

### Task 2: Install `react-resizable-panels` & Create `components/ui/resizable.tsx`

**Files:**
- Create: `frontend/components/ui/resizable.tsx`
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` components styled with Tailwind CSS v4 and Lucide icons.

- [ ] **Step 1: Install `react-resizable-panels`**
- [ ] **Step 2: Create `frontend/components/ui/resizable.tsx`**
- [ ] **Step 3: Verify TypeScript compilation with `npx tsc --noEmit`**

---

### Task 3: Discord Typing State Machine in Frontend (`SocketProvider.tsx`)

**Files:**
- Modify: `frontend/contexts/SocketProvider.tsx`
- Modify: `frontend/utils/types/index.ts`

**Interfaces:**
- Produces:
  - `sendTyping: (roomId: string, isTyping: boolean) => void`
  - `typingUsers: Map<string, string[]>`
  - `getTypingUsersForRoom: (roomId: string) => string[]`
  - Auto-cleanup timer (4-second TTL for typers), message cleanup (clearing typer when message received).

- [ ] **Step 1: Update types in `frontend/utils/types/index.ts`**
- [ ] **Step 2: Implement typing state machine, timeout map, and socket listeners in `SocketProvider.tsx`**
- [ ] **Step 3: Verify TypeScript compilation with `npx tsc --noEmit`**

---

### Task 4: Create Discord-Style `TypingIndicator.tsx` Component

**Files:**
- Create: `frontend/components/chatrooms/TypingIndicator.tsx`

**Interfaces:**
- Consumes: `roomId: string`
- Produces: Discord-style formatted text:
  - 1 user: **Alice** is typing...
  - 2 users: **Alice** and **Bob** are typing...
  - 3 users: **Alice**, **Bob**, and **Charlie** are typing...
  - 4+ users: **Several people** are typing...
  - 3 animated jumping/pulsing dots matching Discord aesthetic.

- [ ] **Step 1: Implement `TypingIndicator.tsx` with animated bouncing dots and Discord formatting**
- [ ] **Step 2: Verify TypeScript compilation with `npx tsc --noEmit`**

---

### Task 5: Integrate Typing Trigger in `MessageBox.tsx`

**Files:**
- Modify: `frontend/components/chatrooms/MessageBox.tsx`

**Interfaces:**
- Consumes: `useSocket().sendTyping(roomId, isTyping)`
- Throttles typing emission (max once every 2.5s) on keystroke, emits `false` on blur/clear/message send.

- [ ] **Step 1: Wire throttled typing emitter and idle/clear detection into `MessageBox.tsx`**
- [ ] **Step 2: Clear typing immediately on message submit**
- [ ] **Step 3: Verify TypeScript compilation with `npx tsc --noEmit`**

---

### Task 6: Resizable Online Members Pane & Chatroom Layout in `page.tsx`

**Files:**
- Modify: `frontend/app/(protected)/(socket)/chatrooms/[slug]/page.tsx`

**Interfaces:**
- Consumes: `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`, `TypingIndicator`, `OnlineMembers`, `MessagesContainer`, `MessageBox`
- Implements: Resizable panel layout with collapsible right pane (collapses to 0% when dragged to end) on screens >= `md` (tablet and desktop), and uncollapse toggle button. On mobile (< `md`), preserves default layout.

- [ ] **Step 1: Update `page.tsx` to include `ResizablePanelGroup`, `TypingIndicator`, and collapse toggle**
- [ ] **Step 2: Verify responsive behavior on both small and large viewports**
- [ ] **Step 3: Verify TypeScript compilation with `npx tsc --noEmit`**

---

### Task 7: Full Automated Verification

**Steps:**
- [ ] Run backend Go tests: `go test -v ./...`
- [ ] Run backend Go build: `go build ./...`
- [ ] Run frontend TypeScript typecheck: `npx tsc --noEmit`
