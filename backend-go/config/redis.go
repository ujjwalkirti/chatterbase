package config

import (
	"context"
	"crypto/tls"
	"log"
	"net/url"
	"os"
	"strconv"

	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

func InitRedis() {
	// Prefer a single REDIS_URL (redis://[:password@]host:port[/db]) if provided
	redisURL := os.Getenv("REDIS_URL")
	if redisURL != "" {
		opt, err := redis.ParseURL(redisURL)
		if err != nil {
			log.Printf("invalid REDIS_URL: %v", err)
			return
		}
		// Decide whether to enable TLS: use rediss:// scheme or explicit REDIS_TLS env var
		enableTLS := false
		u, perr := url.Parse(redisURL)
		scheme := ""
		if perr == nil {
			scheme = u.Scheme
			if u.Scheme == "rediss" {
				enableTLS = true
			}
		}
		tlsEnv := os.Getenv("REDIS_TLS")
		if tlsEnv == "true" || tlsEnv == "1" {
			enableTLS = true
		}
		log.Printf("REDIS URL scheme=%s REDIS_TLS env=%s enableTLS=%v", scheme, tlsEnv, enableTLS)

		if enableTLS {
			// Ensure TLS ServerName is set (SNI) and allow skipping verification when requested
			if opt.TLSConfig == nil {
				opt.TLSConfig = &tls.Config{}
			}
			// set server name for SNI from the URL host if not set
			if opt.TLSConfig.ServerName == "" {
				// extract host from redisURL
				if perr == nil {
					host := u.Hostname()
					if host != "" {
						opt.TLSConfig.ServerName = host
					}
				}
			}
			if v := os.Getenv("REDIS_INSECURE_SKIP_VERIFY"); v == "true" || v == "1" {
				opt.TLSConfig.InsecureSkipVerify = true
			}
			log.Printf("Using REDIS_URL=%s TLS enabled=%v InsecureSkipVerify=%v ServerName=%s", redisURL, true, opt.TLSConfig.InsecureSkipVerify, opt.TLSConfig.ServerName)
		} else {
			// ensure TLSConfig not set so client won't attempt TLS
			opt.TLSConfig = nil
			log.Printf("Using REDIS_URL=%s TLS enabled=%v", redisURL, false)
		}
		RedisClient = redis.NewClient(opt)
	} else {
		// Fallback to REDIS_HOST and REDIS_PORT with optional REDIS_PASSWORD and REDIS_DB
		addr := os.Getenv("REDIS_HOST") + ":" + os.Getenv("REDIS_PORT")
		db := 0
		if v := os.Getenv("REDIS_DB"); v != "" {
			if n, err := strconv.Atoi(v); err == nil {
				db = n
			}
		}
		opts := &redis.Options{Addr: addr, Password: os.Getenv("REDIS_PASSWORD"), DB: db}
		// If REDIS_TLS is set, enable TLS but allow optional insecure skip
		if tlsEnv := os.Getenv("REDIS_TLS"); tlsEnv == "true" || tlsEnv == "1" {
			opts.TLSConfig = &tls.Config{}
			if v := os.Getenv("REDIS_INSECURE_SKIP_VERIFY"); v == "true" || v == "1" {
				opts.TLSConfig.InsecureSkipVerify = true
			}
			log.Printf("Using REDIS host/port %s with TLS enabled InsecureSkipVerify=%v", addr, opts.TLSConfig.InsecureSkipVerify)
		} else {
			log.Printf("Using REDIS host/port %s TLS disabled", addr)
		}
		RedisClient = redis.NewClient(opts)
	}

	// Log resolved client options for debugging before ping
	if rcOpts := RedisClient.Options(); rcOpts != nil {
		insecure := false
		serverName := ""
		if rcOpts.TLSConfig != nil {
			insecure = rcOpts.TLSConfig.InsecureSkipVerify
			serverName = rcOpts.TLSConfig.ServerName
		}
		log.Printf("Resolved Redis options -> addr=%s passwordSet=%t db=%d tls=%v insecure=%v serverName=%s", rcOpts.Addr, rcOpts.Password != "", rcOpts.DB, rcOpts.TLSConfig != nil, insecure, serverName)
	} else {
		log.Printf("Resolved Redis options -> nil")
	}

	if err := RedisClient.Ping(context.Background()).Err(); err != nil {
		log.Printf("redis ping failed: %v", err)
	}
}
