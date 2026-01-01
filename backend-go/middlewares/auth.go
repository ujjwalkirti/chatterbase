package middlewares

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/your-username/chatterbase-backend-go/services"
)

func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		auth := c.GetHeader("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
			return
		}
		token := strings.TrimPrefix(auth, "Bearer ")
		claims, err := services.VerifyToken(token)
		if err != nil || claims == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
			return
		}
		c.Set("user", claims)
		c.Next()
	}
}
