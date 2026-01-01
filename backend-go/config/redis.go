package config

import (
	"context"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

func InitRedis() {
	addr := os.Getenv("REDIS_HOST") + ":" + os.Getenv("REDIS_PORT")
	RedisClient = redis.NewClient(&redis.Options{Addr: addr})
	if err := RedisClient.Ping(context.Background()).Err(); err != nil {
		log.Printf("redis ping failed: %v", err)
	}
}
