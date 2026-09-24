package socket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/redis/go-redis/v9"
	"github.com/ujjwalkirti/chatterbase-backend-go/auth"
	"github.com/ujjwalkirti/chatterbase-backend-go/chatroom"
	"github.com/ujjwalkirti/chatterbase-backend-go/config"
	"github.com/zishang520/socket.io/v2/socket"
)

type OnlineMember struct {
	UserId   string `json:"userId"`
	Username string `json:"username"`
	RoomId   string `json:"roomId"`
	Type     string `json:"type"`
}

type SocketServer struct {
	IO  *socket.Server
	sub *redis.PubSub

	// Track online members per room
	roomMembers map[string]map[string]OnlineMember // roomId -> socketId -> member
	memberMu    sync.RWMutex

	// Track socket to user mapping
	socketUsers map[string]string   // socketId -> username
	socketRooms map[string][]string // socketId -> []roomId

	// Track guest users for session cleanup
	socketGuests map[string]string // socketId -> username
	guestMu      sync.RWMutex
}

func New() *SocketServer {
	io := socket.NewServer(nil, nil)

	ss := &SocketServer{
		IO:           io,
		roomMembers:  make(map[string]map[string]OnlineMember),
		socketUsers:  make(map[string]string),
		socketRooms:  make(map[string][]string),
		socketGuests: make(map[string]string),
	}

	// Subscribe to Redis channels
	sub := config.RedisClient.Subscribe(context.Background(), "MESSAGES", "JOIN-GROUPS", "LEAVE-GROUPS", "GUEST-DISCONNECT")
	ss.sub = sub

	// Socket.IO event handlers
	io.On("connection", func(clients ...any) {
		client := clients[0].(*socket.Socket)
		socketId := string(client.Id())
		log.Println("Socket.IO client connected:", socketId)

		// Handle message event
		client.On("message", func(args ...any) {
			if len(args) == 0 {
				return
			}
			data, ok := args[0].(map[string]interface{})
			if !ok {
				log.Println("Invalid message format")
				return
			}
			log.Printf("Received message from %s: %v", client.Id(), data)

			// Extract roomId from the payload
			roomId, _ := data["roomId"].(string)
			senderId, _ := data["senderId"].(string)
			message, _ := data["message"].(string)
			timestamp, _ := data["timestamp"].(string)

			if roomId != "" && senderId != "" && message != "" {
				// Build message payload
				messagePayload := map[string]interface{}{
					"senderId":  senderId,
					"message":   message,
					"roomId":    roomId,
					"type":      "user",
					"timestamp": timestamp,
				}

				// Save to database
				savedMsg, err := chatroom.SaveMessage(context.Background(), roomId, senderId, message, "user")
				if err != nil {
					log.Printf("Failed to save message to database: %v", err)
				} else {
					log.Printf("Message saved to database with ID: %d", savedMsg.ID)
					messagePayload["id"] = savedMsg.ID
					messagePayload["timestamp"] = savedMsg.CreatedAt.Format("2006-01-02T15:04:05.000Z")
				}

				// Emit to the room (excluding sender to avoid duplicate from optimistic update)
				client.To(socket.Room(roomId)).Emit("message", messagePayload)
				log.Printf("Broadcasted message to room %s", roomId)
			}
		})

		// Handle join-room event - frontend sends { userId, roomId }
		client.On("join-room", func(args ...any) {
			if len(args) == 0 {
				return
			}

			var roomId, userId string

			// Handle both object and string formats
			switch v := args[0].(type) {
			case map[string]interface{}:
				roomId, _ = v["roomId"].(string)
				userId, _ = v["userId"].(string)
			case string:
				roomId = v
				userId = socketId
			default:
				log.Println("Invalid join-room payload format")
				return
			}

			if roomId != "" {
				client.Join(socket.Room(roomId))
				log.Printf("Client %s joined room %s", client.Id(), roomId)

				// Track socket room
				ss.memberMu.Lock()
				ss.socketRooms[socketId] = append(ss.socketRooms[socketId], roomId)
				ss.memberMu.Unlock()

				// If userId is provided, treat it as username and add to members
				if userId != "" {
					ss.memberMu.Lock()
					ss.socketUsers[socketId] = userId
					ss.memberMu.Unlock()

					// Track guest presence if userId matches an active guest
					if active, _ := auth.IsGuestActive(context.Background(), userId); active {
						ss.guestMu.Lock()
						ss.socketGuests[socketId] = userId
						ss.guestMu.Unlock()
						_, _ = auth.RenewGuestHeartbeat(context.Background(), userId, auth.DefaultGuestSessionTTL)
					}

					member := OnlineMember{
						UserId:   userId,
						Username: userId,
						RoomId:   roomId,
					}
					ss.addMember(roomId, socketId, member)
				}
			}
		})

		// Handle user-joined event - explicit user info with username
		client.On("user-joined", func(args ...any) {
			if len(args) == 0 {
				return
			}

			data, ok := args[0].(map[string]interface{})
			if !ok {
				log.Println("Invalid user-joined format")
				return
			}

			roomId, _ := data["roomId"].(string)
			userId, _ := data["userId"].(string)
			username, _ := data["username"].(string)

			if username == "" {
				username = userId
			}

			if roomId != "" && username != "" {
				// Track user mapping
				ss.memberMu.Lock()
				ss.socketUsers[socketId] = username
				// Ensure room is tracked
				found := false
				for _, r := range ss.socketRooms[socketId] {
					if r == roomId {
						found = true
						break
					}
				}
				if !found {
					ss.socketRooms[socketId] = append(ss.socketRooms[socketId], roomId)
				}
				ss.memberMu.Unlock()

				// Track guest presence if username matches an active guest
				if active, _ := auth.IsGuestActive(context.Background(), username); active {
					ss.guestMu.Lock()
					ss.socketGuests[socketId] = username
					ss.guestMu.Unlock()
					_, _ = auth.RenewGuestHeartbeat(context.Background(), username, auth.DefaultGuestSessionTTL)
				}

				client.Join(socket.Room(roomId))

				member := OnlineMember{
					UserId:   userId,
					Username: username,
					RoomId:   roomId,
				}
				ss.addMember(roomId, socketId, member)

				// Broadcast user-joined to the room
				client.To(socket.Room(roomId)).Emit("user-joined", map[string]interface{}{
					"username": username,
					"roomId":   roomId,
				})
			}
		})

		// Handle get-online-members request
		client.On("get-online-members", func(args ...any) {
			if len(args) == 0 {
				return
			}

			roomId, ok := args[0].(string)
			if !ok {
				if m, ok := args[0].(map[string]interface{}); ok {
					roomId, _ = m["roomId"].(string)
				}
			}

			if roomId != "" {
				ss.memberMu.RLock()
				members := make([]OnlineMember, 0)
				if ss.roomMembers[roomId] != nil {
					for _, m := range ss.roomMembers[roomId] {
						members = append(members, m)
					}
				}
				ss.memberMu.RUnlock()

				client.Emit("online-members", map[string]interface{}{
					"roomId":  roomId,
					"members": members,
				})
			}
		})

		// Handle leave-room event
		client.On("leave-room", func(args ...any) {
			if len(args) == 0 {
				return
			}

			var roomId string
			switch v := args[0].(type) {
			case map[string]interface{}:
				roomId, _ = v["roomId"].(string)
			case string:
				roomId = v
			}

			if roomId != "" {
				client.Leave(socket.Room(roomId))
				log.Printf("Client %s left room %s", client.Id(), roomId)
				ss.removeMember(roomId, socketId, io)
			}
		})

		// Handle typing indicator
		client.On("typing", func(args ...any) {
			if len(args) == 0 {
				return
			}
			if data, ok := args[0].(map[string]interface{}); ok {
				roomId, _ := data["roomId"].(string)
				if roomId != "" {
					client.To(socket.Room(roomId)).Emit("typing", data)
				}
			}
		})

		// Handle guest heartbeat event
		client.On("guest-heartbeat", func(args ...any) {
			if len(args) == 0 {
				return
			}
			var username string
			switch v := args[0].(type) {
			case map[string]interface{}:
				username, _ = v["username"].(string)
			case string:
				username = v
			}
			if username != "" {
				ss.guestMu.Lock()
				ss.socketGuests[socketId] = username
				ss.guestMu.Unlock()
				_, _ = auth.RenewGuestHeartbeat(context.Background(), username, auth.DefaultGuestSessionTTL)
			}
		})

		// Handle disconnect
		client.On("disconnect", func(args ...any) {
			log.Println("Socket.IO client disconnected:", socketId)

			// Release guest session if socket was a guest
			ss.guestMu.Lock()
			guestUsername, isGuest := ss.socketGuests[socketId]
			delete(ss.socketGuests, socketId)
			ss.guestMu.Unlock()

			if isGuest && guestUsername != "" {
				log.Printf("Releasing guest username on disconnect: %s", guestUsername)
				_ = auth.ReleaseGuestUsername(context.Background(), guestUsername, 0)
			}

			ss.memberMu.Lock()
			rooms := ss.socketRooms[socketId]
			delete(ss.socketUsers, socketId)
			delete(ss.socketRooms, socketId)
			ss.memberMu.Unlock()

			// Remove user from all rooms they were in
			for _, roomId := range rooms {
				ss.removeMember(roomId, socketId, io)
			}
		})
	})

	go ss.listenPubSub()

	return ss
}

func (s *SocketServer) addMember(roomId, socketId string, member OnlineMember) {
	s.memberMu.Lock()
	if s.roomMembers[roomId] == nil {
		s.roomMembers[roomId] = make(map[string]OnlineMember)
	}
	s.roomMembers[roomId][socketId] = member

	// Get member list
	members := make([]OnlineMember, 0)
	for _, m := range s.roomMembers[roomId] {
		members = append(members, m)
	}
	s.memberMu.Unlock()

	// Broadcast updated member list to room
	s.IO.To(socket.Room(roomId)).Emit("online-members", map[string]interface{}{
		"roomId":  roomId,
		"members": members,
	})

	log.Printf("Room %s now has %d online members (added %s)", roomId, len(members), member.Username)
}

func (s *SocketServer) removeMember(roomId, socketId string, io *socket.Server) {
	s.memberMu.Lock()
	var username string
	if s.roomMembers[roomId] != nil {
		if m, ok := s.roomMembers[roomId][socketId]; ok {
			username = m.Username
			delete(s.roomMembers[roomId], socketId)
		}
	}

	members := make([]OnlineMember, 0)
	if s.roomMembers[roomId] != nil {
		for _, m := range s.roomMembers[roomId] {
			members = append(members, m)
		}
	}
	s.memberMu.Unlock()

	// Emit user-left event
	io.To(socket.Room(roomId)).Emit("user-left", map[string]interface{}{
		"username": username,
		"roomId":   roomId,
	})

	// Emit updated online-members
	io.To(socket.Room(roomId)).Emit("online-members", map[string]interface{}{
		"roomId":  roomId,
		"members": members,
	})

	log.Printf("Room %s now has %d online members after user left", roomId, len(members))
}

func (s *SocketServer) listenPubSub() {
	ch := s.sub.Channel()
	for msg := range ch {
		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
			log.Println("failed to unmarshal pubsub payload:", err)
			continue
		}

		// For MESSAGES channel (used for cross-server broadcasting in multi-server setup)
		// Messages are already saved to DB in the direct socket handler
		if msg.Channel == "MESSAGES" {
			roomId, _ := payload["roomId"].(string)
			if roomId != "" {
				// Only broadcast - DB save already happened in the socket handler
				s.IO.To(socket.Room(roomId)).Emit("message", payload)
			}
		} else {
			// Broadcast to all connected clients for other channels
			s.IO.Emit(msg.Channel, payload)
		}
	}
}

func (s *SocketServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.IO.ServeHandler(nil).ServeHTTP(w, r)
}

func (s *SocketServer) Close() {
	s.IO.Close(nil)
}

func (s *SocketServer) PublishMessage(channel string, message interface{}) error {
	payload, _ := json.Marshal(message)
	return config.RedisClient.Publish(context.Background(), channel, string(payload)).Err()
}
