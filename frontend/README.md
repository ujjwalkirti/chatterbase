# Chatter Base

Chatter Base is a modern, real-time chat platform built with **Next.js**, **React**, and **Socket.io**. It features secure authentication, dynamic chatroom management, and a responsive, accessible UI.

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

- **Frontend**: Next.js (App Router), React 19.x
- **Styling**: Tailwind CSS, Radix UI
- **Real-Time**: Socket.io-client
- **Forms**: React Hook Form, Zod
- **Notifications**: Sonner
- **Icons**: Lucide React

---

## 📁 Project Structure

```
frontend-chatter-base/
├── app/                # Next.js app directory (pages, layouts)
├── components/         # Reusable UI and feature components
├── contexts/           # React Context providers (Auth, Socket)
├── utils/              # Utility functions and type definitions
├── public/             # Static assets
├── styles/             # Global and custom styles
└── README.md
```

---

## ⚡ Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run the development server:**

   ```bash
   npm run dev
   ```

3. **Open in browser:**
   ```
   http://localhost:3000
   ```

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

For questions or feedback, open an issue or
