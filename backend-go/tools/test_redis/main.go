package main

import (
	"context"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"github.com/redis/go-redis/v9"
)

func main() {
	// load .env if present
	_ = godotenv.Load()

	url := os.Getenv("REDIS_URL")
	if url == "" {
		host := os.Getenv("REDIS_HOST")
		port := os.Getenv("REDIS_PORT")
		pw := os.Getenv("REDIS_PASSWORD")
		fmt.Printf("No REDIS_URL set, using host=%s port=%s pwdSet=%t\n", host, port, pw != "")
		return
	}
	opt, err := redis.ParseURL(url)
	if err != nil {
		fmt.Printf("Parse error: %v\n", err)
		return
	}
	// apply insecure skip if requested
	if opt.TLSConfig != nil {
		if v := os.Getenv("REDIS_INSECURE_SKIP_VERIFY"); v == "true" || v == "1" {
			opt.TLSConfig.InsecureSkipVerify = true
		}
	}
	client := redis.NewClient(opt)
	err = client.Ping(context.Background()).Err()
	if err != nil {
		fmt.Printf("Ping error: %v\n", err)
		return
	}
	fmt.Println("Ping OK")
}
