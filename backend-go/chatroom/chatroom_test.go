package chatroom

import (
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRegisterRoutes(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	api := router.Group("/api")

	RegisterRoutes(api)

	routes := router.Routes()
	expectedRoutes := map[string]string{
		"/api/chatroom/":                 http.MethodGet,
		"/api/chatroom/create":           http.MethodPost,
		"/api/chatroom/enter":            http.MethodPost,
		"/api/chatroom/:roomId/messages": http.MethodGet,
	}

	for _, route := range routes {
		if method, ok := expectedRoutes[route.Path]; ok {
			if route.Method == method {
				delete(expectedRoutes, route.Path)
			}
		}
	}

	if len(expectedRoutes) > 0 {
		t.Fatalf("missing expected routes: %v", expectedRoutes)
	}
}

func TestChatroomModelInit(t *testing.T) {
	room := Chatroom{
		ID:               1,
		Name:             "General",
		Description:      "General discussion room",
		ParticipantCount: 0,
		Participants:     []string{},
	}

	if room.Name != "General" || room.ID != 1 {
		t.Errorf("unexpected room properties: %+v", room)
	}
}
