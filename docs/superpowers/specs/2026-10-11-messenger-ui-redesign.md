# Modern Messenger UI Redesign Specification

**Date:** 2026-10-11  
**Author:** ChatterBase Team  
**Status:** Approved for Implementation Planning  
**Target Surface:** Frontend (`frontend/app/(protected)/(socket)/chatrooms/[slug]/page.tsx` and `frontend/components/chatrooms/*`)

---

## 1. Overview & Goal

The goal of this redesign is to upgrade ChatterBase's chatroom UI from a generic, boxy developer interface (with blocky textareas and draggable splitter handles) into a modern, fluid **Facebook Messenger-inspired chat experience**.

The redesign retains 100% of the underlying real-time architecture (Go backend, Socket.IO v2 events, Redis presence/heartbeats, NextAuth sessions, PostgreSQL message hydration) while overhauling the visual language, layout, micro-interactions, and aesthetics.

---

## 2. Core Visual Language & Design Tokens

### 2.1 Colors & Gradients
* **Outgoing Messages (Current User)**:
  * Background: Signature Messenger gradient: `bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600` (`#0084FF` to `#7928CA`)
  * Text: High-contrast white (`text-white`)
  * Shape: `rounded-2xl rounded-br-xs` (subtle asymmetric bubble tail)
  * Shadow: `shadow-xs hover:shadow-sm transition-shadow`
* **Incoming Messages (Other Participants)**:
  * Background: Soft neutral surface: `bg-zinc-100 dark:bg-zinc-800`
  * Text: High-contrast dark / light: `text-zinc-900 dark:text-zinc-100`
  * Shape: `rounded-2xl rounded-bl-xs`
  * Avatar: Left-aligned avatar circle (32px / `w-8 h-8`) with initials fallback and soft background.
* **System Messages**:
  * Centered pill: `bg-zinc-100/90 dark:bg-zinc-800/80 text-muted-foreground text-xs px-3.5 py-1 rounded-full border border-border/40 my-2`

### 2.2 Typography & Spacing
* Clean sans-serif hierarchy using Tailwind tokens (`Geist Sans`).
* Compact timestamps (`text-[10px] text-muted-foreground/70`) displayed discretely underneath messages or revealed cleanly on hover.
* Grouped messages: Reduced vertical spacing (`gap-1.5`) between consecutive messages from the same sender.

---

## 3. Component Architecture & Specifications

### 3.1 Chatroom Page Shell (`frontend/app/(protected)/(socket)/chatrooms/[slug]/page.tsx`)
* **Header**:
  * Messenger-style top navigation bar:
    * Left: Back navigation button (`ChevronLeft`) returning to `/available-chatrooms`.
    * Center-left: Room avatar badge with group icon / initials, Capitalized room title, and real-time active status:
      * Pulsing green online badge: `Active now • X members` (when connected) or red badge (when disconnected).
    * Right: Action buttons:
      * Quick info / members toggle button with participant count badge (`Users` icon).
  * Smooth height management: full viewport height `h-[calc(100vh-65px)]` with zero double scrollbars.
* **Layout Structure**:
  * Two-column layout on desktop:
    * **Main Chat Column**: Full flex container (Header + Messages Container + Typing Indicator + Floating Pill Input).
    * **Collapsible Details & Members Sidebar**: A slide-in / toggleable right sidebar on desktop (`w-80 border-l bg-card/50 backdrop-blur-xs`), smoothly collapsible with a single header click.
  * Mobile layout (< 768px): Chat occupies 100% width, Members list opens in a slide-out `Sheet`.

### 3.2 Message Box & Input Bar (`frontend/components/chatrooms/MessageBox.tsx`)
* **Pill Input Container**:
  * Outer bar: `rounded-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 p-1.5 pl-4 flex items-center gap-2 shadow-xs focus-within:ring-2 focus-within:ring-blue-500/30 transition-all`
  * Input field: Auto-sizing textarea (`max-h-24 min-h-[38px] leading-5 resize-none bg-transparent border-0 text-sm focus:outline-hidden py-2 px-1 flex-1`)
  * Enter key sends message; Shift+Enter creates a new line.
* **Action Buttons**:
  * Emoji Quick-Trigger button (`Smile` icon) to open a quick emoji popup or insert common emojis (`👍`, `❤️`, `🔥`, `😂`, `🎉`, `👋`).
  * Circular Send / Like Action Button:
    * When text is entered: Gradient circular send button (`w-9 h-9 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center hover:opacity-95 active:scale-95 transition-all shadow-sm cursor-pointer`).
    * When text is empty: Iconic Messenger Thumbs-Up button (`ThumbsUp` icon) that sends an instant "👍" reaction message with a single click.
* **Typing Throttling**:
  * Preserves existing 2.5s throttling and 3s idle timeout via `sendTyping`.

### 3.3 Message Bubble (`frontend/components/chatrooms/IndividualMessageBox.tsx`)
* **Avatar & Alignment**:
  * Sent messages: aligned right (`self-end items-end`).
  * Received messages: aligned left (`self-start items-start`), prefixed with sender's 32px circular avatar.
  * Sender name displayed in subtle small text above received bubbles in group chat.
* **Bubble Styling**:
  * Outgoing: `bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white rounded-2xl rounded-br-xs px-4 py-2.5 max-w-[75%] sm:max-w-[70%] break-words shadow-xs`.
  * Received: `bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-bl-xs px-4 py-2.5 max-w-[75%] sm:max-w-[70%] break-words shadow-xs border border-border/30`.
* **Timestamp & Metadata**:
  * Format: `hh:mm a` (e.g. `12:45 PM`).

### 3.4 Typing Indicator (`frontend/components/chatrooms/TypingIndicator.tsx`)
* Messenger-style speech bubble at the bottom-left of the message stream:
  * Container: `inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl rounded-bl-xs bg-zinc-100 dark:bg-zinc-800 border border-border/40 shadow-xs`.
  * Animated 3-dot wave: Three 6px circular dots with staggered bounce animations (`[animation-delay:-0.32s]`, `[animation-delay:-0.16s]`, `0s`).
  * Label: Text rendering "Alex is typing..." or "Alex and Sam are typing...".
  * Smooth transition: `opacity-100` when typing, `opacity-0` when inactive.

### 3.5 Online Members & Chat Details Panel (`frontend/components/chatrooms/OnlineMembers.tsx`)
* Redesigned as a Messenger "Chat Details & Active Members" panel:
  * Header with Room Title, participant count badge.
  * Section 1: Permanent Members (with verified badge or subtle icon).
  * Section 2: Guests (with guest badge).
  * Member Item:
    * Avatar with glowing green online dot (`ring-2 ring-background`).
    * Display name with truncated text handling.
    * Current user indicator (`(You)` badge).
    * Hover effects: `hover:bg-muted/60 rounded-xl px-2.5 py-1.5 transition-colors`.

### 3.6 Messages Container (`frontend/components/chatrooms/MessagesContainer.tsx`)
* Clean message viewport with smooth scrolling:
  * Auto-scrolls to the newest message on incoming messages and initial history hydration.
  * Empty state: Friendly Messenger welcome illustration with chat icon, room name, and "Say hello to start the conversation!".
  * Loading state: Subtle animated skeleton/dots while room history is hydrating.

---

## 4. Technical Constraints & Invariants

1. **Socket.IO Protocol Integrity**: Do NOT alter event names or signatures (`message`, `join-room`, `leave-room`, `typing`, `online-members`, `user-joined`, etc.).
2. **Next.js & React 19 Compatibility**:
   * All interactive chat components must retain `"use client"`.
   * Strict TypeScript typing with zero `any` regressions.
3. **Responsive Breakpoints**:
   * Mobile (< 768px): Full-width chat view with slide-out `Sheet` for members.
   * Desktop (>= 768px): Side-by-side chat view with toggleable right sidebar.
4. **Theme Consistency**: All components must support both Light and Dark themes seamlessly via existing `next-themes` and Tailwind classes.

---

## 5. Verification & Testing Strategy

1. **Automated Verification**:
   * Frontend TypeScript typecheck: `cd frontend; npx tsc --noEmit`
   * Backend Go test suite: `cd backend-go; go test -v ./...`
   * Backend Go compilation: `cd backend-go; go build ./...`
2. **Manual Browser Verification**:
   * Outgoing gradient bubbles vs incoming neutral bubbles.
   * Enter to send, Shift+Enter for new line.
   * Quick thumbs-up sending when empty.
   * Quick emoji insertion.
   * Real-time typing bubble with 3-dot bouncing wave.
   * Header back button and member sidebar toggle.
   * Responsive layout on desktop and mobile viewport sizes.
