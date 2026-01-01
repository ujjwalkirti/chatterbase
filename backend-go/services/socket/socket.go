package socket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"github.com/your-username/chatterbase-backend-go/config"
)

var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

type SocketServer struct {
	clients map[*websocket.Conn]bool
	mu      sync.Mutex
	sub     *redis.PubSub
}

func New() *SocketServer {
	ss := &SocketServer{clients: make(map[*websocket.Conn]bool)}
	sub := config.RedisClient.Subscribe(context.Background(), "MESSAGES", "JOIN-GROUPS", "LEAVE-GROUPS")
	ss.sub = sub
	go ss.listenPubSub()
	return ss
}

func (s *SocketServer) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("ws upgrade err:", err)
		return
	}
	s.mu.Lock()
	s.clients[conn] = true
	s.mu.Unlock()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			log.Println("ws read err:", err)
			s.mu.Lock()
			delete(s.clients, conn)
			s.mu.Unlock()
			conn.Close()
			break
		}
		// Try to parse message as JSON { message, senderId, receiverId }
		var incoming map[string]interface{}
		if err := json.Unmarshal(msg, &incoming); err != nil {
			log.Printf("Received WS message (non-json): %s", string(msg))
			continue
		}
		if incoming["message"] != nil && incoming["senderId"] != nil && incoming["receiverId"] != nil {
			// publish to redis MESSAGES
			payload, _ := json.Marshal(map[string]interface{}{"message": incoming["message"], "senderId": incoming["senderId"], "receiverId": incoming["receiverId"]})
			err := config.RedisClient.Publish(context.Background(), "MESSAGES", string(payload)).Err()
			if err != nil {
				log.Println("publish failed:", err)
			}
			continue
		}
		log.Printf("Received WS message: %s", string(msg))
	}
}

func (s *SocketServer) listenPubSub() {
	ch := s.sub.Channel()
	for msg := range ch {
		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(msg.Payload), &payload); err != nil {
			log.Println("failed to unmarshal pubsub payload:", err)
			continue
		}
		s.broadcast(msg.Channel, payload)
	}
}

func (s *SocketServer) broadcast(channel string, payload interface{}) {
	b, _ := json.Marshal(payload)
	for c := range s.clients {
		c.WriteMessage(websocket.TextMessage, b)
	}
}

func (s *SocketServer) PublishMessage(channel string, message interface{}) error {
	simple, _ := json.Marshal(message)
	return config.RedisClient.Publish(context.Background(), channel, string(simple)).Err()
}
