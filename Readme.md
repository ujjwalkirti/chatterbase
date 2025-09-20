# Chatter Base

Chatter Base is a modern, real-time chat platform that enables users to join, create, and interact in chatrooms with secure authentication and device tracking. Built with **Next.js**, **React**, **Socket.io**, and **Express**, it features a responsive UI, real-time messaging, and robust backend services.

---

## 🚀 Features

- **User Authentication**: Secure JWT-based login and registration.
- **Real-Time Messaging**: Instant chat powered by Socket.io.
- **Chatroom Management**: Create, join, and interact in multiple chatrooms.
- **Device Details Capture**: Collects device/browser info during registration.
- **Protected Routes**: Authenticated access to chatrooms and user features.
- **Responsive UI**: Built with Tailwind CSS and Radix UI for accessibility.
- **Toast Notifications**: Feedback via Sonner toasts.
- **Form Validation**: Robust forms using React Hook Form and Zod.
- **Modern Icons**: Lucide React for crisp, scalable icons.

---

## 🏗️ Tech Stack

- **Frontend**: Next.js (App Router), React 19.x, TypeScript
- **Styling**: Tailwind CSS, Radix UI, tw-animate-css
- **Real-Time**: Socket.io-client
- **Forms**: React Hook Form, Zod
- **Notifications**: Sonner
- **Icons**: Lucide React
- **Backend**: Express, TypeScript, Mongoose (MongoDB), Socket.io, Redis (ioredis)
- **Languages**: TypeScript (frontend & backend), CSS

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
