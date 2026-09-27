package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ujjwalkirti/chatterbase-backend-go/auth"
)

func JWTAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
			return
		}
		token := strings.TrimPrefix(authHeader, "Bearer ")
		claims, err := auth.VerifyToken(token)
		if err != nil || claims == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "Unauthorized"})
			return
		}
		c.Set("user", claims)

		// Renew guest presence on every authenticated HTTP request
		if status, ok := claims["user_status"].(string); ok && status == auth.UserStatusAnonymous {
			if username, ok := claims["username"].(string); ok && username != "" {
				_, _ = auth.RenewGuestHeartbeat(context.Background(), username, auth.DefaultGuestSessionTTL)
			}
		}

		c.Next()
	}
}
