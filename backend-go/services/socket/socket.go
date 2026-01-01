package socket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/redis/go-redis/v9"
	"github.com/ujjwalkirti/chatterbase-backend-go/config"
	"github.com/ujjwalkirti/chatterbase-backend-go/models"
	"github.com/zishang520/socket.io/v2/socket"
)

type OnlineMember struct {
	UserId   string `json:"userId"`
	Username string `json:"username"`
	RoomId   string `json:"roomId"`
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
}

func New() *SocketServer {
	io := socket.NewServer(nil, nil)

	ss := &SocketServer{
		IO:          io,
		roomMembers: make(map[string]map[string]OnlineMember),
		socketUsers: make(map[string]string),
		socketRooms: make(map[string][]string),
	}

	// Subscribe to Redis channels
	sub := config.RedisClient.Subscribe(context.Background(), "MESSAGES", "JOIN-GROUPS", "LEAVE-GROUPS")
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
				savedMsg, err := models.SaveMessage(context.Background(), roomId, senderId, message, "user")
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
				log.Printf("Invalid join-room format: %T", args[0])
				return
			}

			if roomId == "" {
				log.Println("join-room: roomId is empty")
				return
			}

			log.Printf("Client %s (user: %s) joining room: %s", socketId, userId, roomId)
			client.Join(socket.Room(roomId))

			// Track the member
			ss.memberMu.Lock()
			if ss.roomMembers[roomId] == nil {
				ss.roomMembers[roomId] = make(map[string]OnlineMember)
			}
			ss.roomMembers[roomId][socketId] = OnlineMember{
				UserId:   userId,
				Username: userId, // Using userId as username for now
				RoomId:   roomId,
			}
			ss.socketUsers[socketId] = userId
			ss.socketRooms[socketId] = append(ss.socketRooms[socketId], roomId)

			// Get current online members for this room
			members := make([]OnlineMember, 0, len(ss.roomMembers[roomId]))
			for _, m := range ss.roomMembers[roomId] {
				members = append(members, m)
			}
			ss.memberMu.Unlock()

			// Emit user-joined event to the room
			io.To(socket.Room(roomId)).Emit("user-joined", map[string]interface{}{
				"username": userId,
				"roomId":   roomId,
			})

			// Emit online-members to the room
			io.To(socket.Room(roomId)).Emit("online-members", map[string]interface{}{
				"roomId":  roomId,
				"members": members,
			})

			log.Printf("Room %s now has %d online members", roomId, len(members))
		})

		// Handle leave-room event - frontend sends { userId, roomId }
		client.On("leave-room", func(args ...any) {
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
				userId = ss.socketUsers[socketId]
			default:
				log.Printf("Invalid leave-room format: %T", args[0])
				return
			}

			if roomId == "" {
				return
			}

			log.Printf("Client %s (user: %s) leaving room: %s", socketId, userId, roomId)
			client.Leave(socket.Room(roomId))

			ss.removeFromRoom(socketId, roomId, userId, io)
		})

		// Handle room-message event (alternative to message event)
		client.On("room-message", func(args ...any) {
			if len(args) == 0 {
				return
			}
			data, ok := args[0].(map[string]interface{})
			if !ok {
				return
			}
			room, _ := data["room"].(string)
			if room == "" {
				room, _ = data["roomId"].(string)
			}
			if room != "" {
				log.Printf("Room message to %s: %v", room, data)
				io.To(socket.Room(room)).Emit("message", data)
			}
		})

		// Handle disconnect
		client.On("disconnect", func(args ...any) {
			reason := ""
			if len(args) > 0 {
				if r, ok := args[0].(string); ok {
					reason = r
				}
			}
			log.Println("Socket.IO client disconnected:", socketId, "reason:", reason)

			// Remove from all rooms
			ss.memberMu.Lock()
			rooms := ss.socketRooms[socketId]
			username := ss.socketUsers[socketId]
			delete(ss.socketUsers, socketId)
			delete(ss.socketRooms, socketId)
			ss.memberMu.Unlock()

			for _, roomId := range rooms {
				ss.removeFromRoom(socketId, roomId, username, io)
			}
		})
	})

	// Start listening to Redis pub/sub in background
	go ss.listenPubSub()

	return ss
}

func (s *SocketServer) removeFromRoom(socketId, roomId, username string, io *socket.Server) {
	s.memberMu.Lock()
	if s.roomMembers[roomId] != nil {
		delete(s.roomMembers[roomId], socketId)
	}

	// Get updated members list
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
