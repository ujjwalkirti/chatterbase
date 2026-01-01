package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/your-username/chatterbase-backend-go/config"
	"github.com/your-username/chatterbase-backend-go/controllers"
	"github.com/your-username/chatterbase-backend-go/services/socket"
)

func main() {
	// load env
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	r := gin.Default()

	// health
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })

	// initialize services
	config.InitPostgres()
	config.InitRedis()

	// mount API groups (controllers)
	api := r.Group("/api")
	controllers.RegisterRoutes(api)
	controllers.RegisterChatRoutes(api)

	// websocket
	ss := socket.New()
	r.GET("/ws", func(c *gin.Context) {
		h := c.Writer
		rq := c.Request
		ss.ServeWS(h, rq)
	})

	log.Printf("Starting server on :%s", port)
	r.Run("0.0.0.0:" + port)
}
