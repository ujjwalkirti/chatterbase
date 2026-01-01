# Chatter Base Go Backend (infra)

This folder is a Go-language implementation of the original Node backend.

Environment (.env.example):
- PORT=8000
- MONGO_URI=mongodb://mongo:27017/chatterbase
- REDIS_HOST=redis
- REDIS_PORT=6379
- ACCESS_TOKEN_SECRET=changeme

Run locally (docker-compose):
- docker-compose up --build

HTTP endpoints:
- POST /api/auth/register { username, dob, gender, ip_address, deviceDetails }
- POST /api/auth/verify { token }
- POST /api/auth/logout { token }
- GET /api/chatroom/
- POST /api/chatroom/create { chatRoomDetails }
- POST /api/chatroom/enter { chatroomId }
- GET /ws  (websocket endpoint)

Notes:
- This is a minimal functional clone focusing on parity with the original backend. Additional hardening, validation, and tests are recommended before production use.
