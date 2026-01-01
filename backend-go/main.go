package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/ujjwalkirti/chatterbase-backend-go/config"
	"github.com/ujjwalkirti/chatterbase-backend-go/controllers"
	"github.com/ujjwalkirti/chatterbase-backend-go/services/socket"
)

func main() {
	// load env
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	r := gin.Default()

	// enable CORS (allow localhost:3000 by default or use CORS_ORIGIN env var comma-separated)
	corsOrigin := os.Getenv("CORS_ORIGIN")
	if corsOrigin == "" {
		corsOrigin = "http://localhost:3000"
	}
	corsConfig := cors.Config{
		AllowOrigins:     []string{corsOrigin},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}
	r.Use(cors.New(corsConfig))

	// health
	r.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })

	// initialize services
	config.InitPostgres()
	config.InitRedis()

	// mount API groups (controllers)
	api := r.Group("/api")
	controllers.RegisterRoutes(api)
	controllers.RegisterChatRoutes(api)

	// Socket.IO
	ss := socket.New()
	defer ss.Close()

	r.GET("/socket.io/*any", gin.WrapH(ss))
	r.POST("/socket.io/*any", gin.WrapH(ss))

	log.Printf("Starting server on :%s", port)
	r.Run("0.0.0.0:" + port)
}
