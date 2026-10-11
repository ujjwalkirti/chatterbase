# Modern Messenger UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign ChatterBase's chatroom UI to look and feel like modern Facebook Messenger with gradient message bubbles, a rounded pill input bar, animated 3-dot typing bubble, sleek online presence sidebar, and a polished header.

**Architecture:** Replace the developer-style resizable panel layout with a responsive, Messenger-style chat interface consisting of an active presence header, smooth scrollable message thread with gradient sent bubbles and avatar-prefixed received bubbles, a floating pill input with emoji and quick thumbs-up actions, and a collapsible desktop members drawer.

**Tech Stack:** Next.js 15 (React 19), Tailwind CSS v4, Lucide React icons, Radix UI primitives (`Avatar`, `Sheet`, `Button`), Socket.IO client v4, NextAuth.js v5.

**Spec:** `docs/superpowers/specs/2026-10-11-messenger-ui-redesign.md`

## Global Constraints

- **No Backend Modifications**: Preserve all existing Socket.IO events (`message`, `join-room`, `leave-room`, `typing`, `online-members`, `user-joined`) and API contracts.
- **Frontend Build Prohibition**: Do NOT run `npm run build` or full production builds; verify via `npx tsc --noEmit`.
- **Responsive Standard**: Mobile (< 768px) uses full-width chat with slide-out `Sheet`; Desktop (>= 768px) features collapsible right sidebar.
- **Theme Support**: Flawless light and dark mode styling across all components.

---

### Task 1: Messenger Bubble & Message Formatting (`IndividualMessageBox.tsx`)

**Files:**
- Modify: `frontend/components/chatrooms/IndividualMessageBox.tsx`
- Type Reference: `frontend/types/index.d.ts` (or `Message` type in project)

**Interfaces:**
- Consumes: `message: Message`, `isSenderCurrentUser: boolean`
- Produces: Polished Messenger bubble component with gradient on outgoing, neutral surface with avatar on incoming, and formatted timestamps.

- [ ] **Step 1: Inspect existing `IndividualMessageBox.tsx`**
  Verify the props and structure of `IndividualMessageBox.tsx`:
  - `message: Message` containing `message`, `senderId`, `timestamp`, `id`, `type`.
  - `isSenderCurrentUser: boolean`.

- [ ] **Step 2: Implement Messenger bubble design in `IndividualMessageBox.tsx`**
  - Outgoing message styling:
    - Gradient: `bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600`
    - Text: `text-white font-normal`
    - Corners: `rounded-2xl rounded-br-xs`
    - Shadow: `shadow-xs hover:shadow-sm transition-shadow`
  - Incoming message styling:
    - Surface: `bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100`
    - Corners: `rounded-2xl rounded-bl-xs`
    - Avatar: 32px circular avatar with fallback initials for the sender
    - Sender name: small text `text-[11px] font-medium text-muted-foreground px-1 mb-0.5`
  - Timestamp formatting:
    - Display compact time (`hh:mm a`) with subtle styling `text-[10px] text-muted-foreground/75 px-1.5`.

- [ ] **Step 3: Run TypeScript typecheck to verify Task 1**
  Run: `cd frontend; npx tsc --noEmit`
  Expected: Clean pass with 0 errors.

---

### Task 2: Messenger Speech Bubble Typing Indicator (`TypingIndicator.tsx`)

**Files:**
- Modify: `frontend/components/chatrooms/TypingIndicator.tsx`

**Interfaces:**
- Consumes: `roomId: string`, `useSocket().getTypingUsersForRoom(roomId)`
- Produces: Messenger-style speech bubble with 3-dot animated bouncing wave.

- [ ] **Step 1: Implement Messenger-style 3-dot speech bubble in `TypingIndicator.tsx`**
  - Wrap in speech bubble styling:
    - Container: `inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl rounded-bl-xs bg-zinc-100 dark:bg-zinc-800 border border-border/40 shadow-xs mb-1`
    - Staggered bouncing dots: 3 circular dots `w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400` with delays `-0.32s`, `-0.16s`, `0s`.
    - Text label: subtle `text-xs font-medium text-muted-foreground` displaying typer names.
  - Smooth visibility transition: `transition-all duration-200` between active and inactive typing states.

- [ ] **Step 2: Run TypeScript typecheck to verify Task 2**
  Run: `cd frontend; npx tsc --noEmit`
  Expected: Clean pass with 0 errors.

---

### Task 3: Messenger Rounded Pill Input Bar with Quick Thumbs-Up & Emojis (`MessageBox.tsx`)

**Files:**
- Modify: `frontend/components/chatrooms/MessageBox.tsx`

**Interfaces:**
- Consumes: `roomId: string`, `useSocket()`, `authContext`
- Produces: Pill-shaped input bar with auto-resizing text field, quick emoji insertion, typing throttling, and quick thumbs-up reaction.

- [ ] **Step 1: Replace blocky textarea with Messenger rounded pill container**
  - Outer container: `p-2 bg-background/80 backdrop-blur-xs border-t border-border/40 flex items-center gap-2`
  - Pill wrapper: `flex-1 flex items-center bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 rounded-full px-3 py-1 focus-within:ring-2 focus-within:ring-blue-500/25 transition-all`
  - Input: Auto-expanding textarea or single/multiline input `max-h-24 resize-none bg-transparent border-0 text-sm focus:outline-hidden py-1.5 px-2 flex-1`
  - Emojis shortcut: Add quick emoji trigger popup or quick-react buttons (e.g. `😊` / `Smile` icon that allows inserting quick emojis).
  - Circular action button:
    - If `message.trim()` has content: circular gradient send button (`bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full p-2.5 hover:opacity-90 active:scale-95 transition-all shadow-sm`).
    - If empty: Messenger iconic Thumbs-Up button (`ThumbsUp` icon) sending `"👍"` on click!

- [ ] **Step 2: Maintain typing throttling and Enter key behavior**
  - Enter sends message; Shift+Enter creates a new line.
  - Typing emits `sendTyping(roomId, true)` throttled at 2.5s.
  - Stop typing clears idle timer after 3s.

- [ ] **Step 3: Run TypeScript typecheck to verify Task 3**
  Run: `cd frontend; npx tsc --noEmit`
  Expected: Clean pass with 0 errors.

---

### Task 4: Messages Container Viewport, History Hydration & Empty State (`MessagesContainer.tsx`)

**Files:**
- Modify: `frontend/components/chatrooms/MessagesContainer.tsx`

**Interfaces:**
- Consumes: `roomId: string`, `useSocket().getMessagesForRoom(roomId)`
- Produces: Smooth auto-scrolling message list with Messenger empty state and clean system message pills.

- [ ] **Step 1: Upgrade empty & loading states in `MessagesContainer.tsx`**
  - Empty state: Clean Messenger card with MessageSquare/Sparkles icon, friendly greeting, room title, and call to action: "Say hello to start the conversation!".
  - Loading state: Animated pulse loader with Messenger blue accent.
  - System messages: Centered pill with subtle border and muted typography (`bg-zinc-100/80 dark:bg-zinc-800/80 rounded-full px-3.5 py-1 text-xs text-muted-foreground border border-border/40`).

- [ ] **Step 2: Run TypeScript typecheck to verify Task 4**
  Run: `cd frontend; npx tsc --noEmit`
  Expected: Clean pass with 0 errors.

---

### Task 5: Messenger Online Members & Presence Details Panel (`OnlineMembers.tsx`)

**Files:**
- Modify: `frontend/components/chatrooms/OnlineMembers.tsx`

**Interfaces:**
- Consumes: `roomId: string`, `useSocket().getOnlineMembersForRoom(roomId)`
- Produces: Messenger-style "Chat Details & Active Members" panel with green online rings on avatars, badge counts, and user roles.

- [ ] **Step 1: Refactor `OnlineMembers.tsx` with Messenger design**
  - Header: Clean title with active member counter badge.
  - Separate sections: Registered Members and Guests.
  - Member row styling:
    - 36px Avatar with initial fallback.
    - Green online dot positioned over bottom-right of avatar (`absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full ring-2 ring-background`).
    - Username with truncate handling, highlighting `(You)` if it is the current user.
    - Subtle role badge (Guest vs Member).
    - Hover interaction: `hover:bg-muted/50 rounded-xl px-2.5 py-1.5 transition-colors`.

- [ ] **Step 2: Run TypeScript typecheck to verify Task 5**
  Run: `cd frontend; npx tsc --noEmit`
  Expected: Clean pass with 0 errors.

---

### Task 6: Modern Messenger Chat Shell & Header Navigation (`page.tsx`)

**Files:**
- Modify: `frontend/app/(protected)/(socket)/chatrooms/[slug]/page.tsx`

**Interfaces:**
- Consumes: `slug` param, `authContext`, `useSocket()`
- Produces: Seamless Messenger chat layout with top navigation header, main chat stream, and collapsible desktop sidebar / mobile sheet.

- [ ] **Step 1: Redesign the chat layout in `page.tsx`**
  - Replace the `ResizablePanelGroup` with a clean, responsive layout:
    - Top bar:
      - Back button (`ChevronLeft`) linking to `/available-chatrooms`.
      - Room Avatar circle with room initials or icon.
      - Room Title with capitalize format.
      - Real-time status: Green dot with `Active now • X online` or `Connecting...`.
      - Action buttons on right: Toggle Members / Details button with active count badge.
    - Body:
      - Main Chat viewport (MessagesContainer + TypingIndicator + MessageBox).
      - Right side desktop panel: Toggleable slide-in Messenger "Chat Details & Members" sidebar (transitions width smoothly when toggled).
      - Mobile: Sheet drawer triggered by the header button.

- [ ] **Step 2: Run TypeScript typecheck to verify Task 6**
  Run: `cd frontend; npx tsc --noEmit`
  Expected: Clean pass with 0 errors.

---

### Task 7: Full System Verification & Quality Check

**Files:**
- Check all modified files:
  - `frontend/components/chatrooms/IndividualMessageBox.tsx`
  - `frontend/components/chatrooms/TypingIndicator.tsx`
  - `frontend/components/chatrooms/MessageBox.tsx`
  - `frontend/components/chatrooms/MessagesContainer.tsx`
  - `frontend/components/chatrooms/OnlineMembers.tsx`
  - `frontend/app/(protected)/(socket)/chatrooms/[slug]/page.tsx`

- [ ] **Step 1: Run frontend TypeScript checks**
  Run: `cd frontend; npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 2: Run backend Go tests to ensure zero regressions**
  Run: `cd backend-go; go test -v ./...`
  Expected: All tests PASS.

- [ ] **Step 3: Run backend Go compilation**
  Run: `cd backend-go; go build ./...`
  Expected: Build succeeds.

- [ ] **Step 4: Present changes to user with clickable links**
  Provide clear diff summary and clickable markdown links for all touched files, guiding browser testing at `http://localhost:3000`.
