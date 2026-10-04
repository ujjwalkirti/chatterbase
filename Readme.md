# Chatter Base

Chatter Base is a modern, high-concurrency, real-time messaging and chatroom platform. Built with **Next.js 15** (React 19, Tailwind CSS v4) on the frontend and **Go** (Gin, Socket.IO v2, Redis Pub/Sub, PostgreSQL) on the backend, it features a hybrid dual-authentication architecture (ephemeral guest accounts + permanent accounts), Discord-style real-time typing indicators, resizable panels, and robust session presence tracking.

---

## 📝 Completed Tasks & Changelog

For a detailed, chronological breakdown of all features, architecture migrations, and commit history from the beginning of the repository to the present, see **[completedtasks.md](completedtasks.md)**.

---

## 🚀 Features

- **Hybrid Dual-Authentication**: Zero-friction guest logins with atomic Redis locks & username recycling, alongside permanent bcrypt-hashed accounts.
- **Real-Time Messaging**: High-performance instant messaging powered by Go Socket.IO and Redis Pub/Sub backplane.
- **Typing Indicators**: Discord-style typing indicator with bouncing dots and dynamic pluralization ("Alice is typing...", "Alice and Bob are typing...").
- **Resizable Online Members Pane**: Draggable, collapsible panel with desktop/tablet resizing and mobile sheet support.
- **Chatroom Management**: Create, join, and interact across multiple chatrooms.
- **Device Details Capture**: Collects browser/device fingerprinting for security auditing.
- **Protected Routes & Presence**: Heartbeat-based presence lifecycle with automatic session cleanup on tab/browser closure.
- **Responsive UI**: Built with Tailwind CSS v4, Lucide React, and Radix UI primitives.
- **Automated Dev Tooling**: Live reload with Air, Delve headless debugging, and one-click dev startup scripts (`start-dev.ps1`, `start-dev.sh`).

---

## 🏗️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling & UI**: Tailwind CSS v4, Radix UI primitives, `react-resizable-panels`, Lucide React
- **Auth Layer**: NextAuth.js v5 (beta) + React Context (`AuthProvider`) with 30s heartbeat & `beforeunload` beacon
- **Real-Time Client**: `socket.io-client` (v4)
- **Backend**: Go 1.23+, Gin HTTP framework, Socket.IO v2 (`zishang520/socket.io/v2`)
- **Database**: PostgreSQL 16+ via connection pool `pgxpool` with automated startup migrations
- **Cache & Pub/Sub**: Redis 7+ (`go-redis/v9`) for atomic guest session locking and cross-instance Pub/Sub
- **Tooling**: Air (live reload), Delve (debugging), Docker & Docker Compose

---

## 📁 Project Structure

```
chatter-base/
├── backend/
│   ├── .env
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       ├── config/
│       ├── controllers/
│       ├── middlewares/
│       ├── models/
│       ├── services/
│       └── utils/
├── frontend/
│   ├── .env.local
│   ├── components.json
│   ├── next-env.d.ts
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── README.md
│   ├── tsconfig.json
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── (auth)/
│   │   └── (protected)/
│   ├── components/
│   │   ├── auth/
│   │   ├── chatrooms/
│   │   ├── common/
│   │   ├── landing-page/
│   │   └── ui/
│   ├── contexts/
│   │   └── AuthProvider.tsx
│   ├── lib/
│   ├── public/
│   └── utils/
├── .gitignore
└── Readme.md
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (v9+ recommended)
- **MongoDB** (local or remote)
- **Redis** (local or remote)

### 1. Clone the repository

```sh
git clone https://github.com/your-username/chatter-base.git
cd chatter-base
```

### 2. Set up the Backend

```sh
cd backend
cp .env.example .env   # or create .env and fill in values
npm install
npm run build
npm start
```

- The backend runs on port `8000` by default.

### 3. Set up the Frontend

```sh
cd ../frontend
cp .env.local.example .env.local   # or create .env.local and fill in values
npm install
npm run dev
```

- The frontend runs on port `3000` by default.

### 4. Open in Browser

Visit [http://localhost:3000](http://localhost:3000) to use Chatter Base.

---

## 🔑 Authentication

- Registration and login forms validate user input and collect device details.
- JWT tokens are stored in localStorage and managed via React Context.

---

## 💬 Chatrooms

- View available chatrooms, create new ones, and join existing rooms.
- Real-time messaging with Socket.io.
- Protected routes ensure only authenticated users can access chatrooms.

---

## 🛠️ Customization

- **UI Components**: Easily extend or modify components in `/components`.
- **Context Providers**: Centralized state management for authentication and sockets.
- **API Integration**: Update endpoints in `/utils` as needed.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙌 Contributing

Pull requests and issues are welcome! Please open an issue to discuss major changes.

---

## 📞 Contact

For questions or feedback, open an issue on GitHub or contact the maintainer.



  ### 1. Start the Redis Server (First)

  The backend requires Redis for pub/sub messaging. Since Redis runs locally as a standalone service, start it in a
  separate terminal:

    & "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-server.exe"

  │ Verification (Optional): In any terminal, verify it is responding:
  │
  │   & "C:\Users\kirti\redis\Redis-8.10.1-Windows-x64-msys2\redis-cli.exe" ping
  │   # Should return: PONG
  ──────
