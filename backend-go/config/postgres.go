package config

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

var Pool *pgxpool.Pool

func InitPostgres() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		user := os.Getenv("PGUSER")
		pass := os.Getenv("PGPASSWORD")
		host := os.Getenv("PGHOST")
		port := os.Getenv("PGPORT")
		database := os.Getenv("PGDATABASE")
		databaseURL = fmt.Sprintf("postgres://%s:%s@%s:%s/%s", user, pass, host, port, database)
	}

	// Ensure sslmode is set for local dev; allow override via PGSSLMODE
	if !strings.Contains(databaseURL, "sslmode=") {
		sslMode := os.Getenv("PGSSLMODE")
		if sslMode == "" {
			// default to disable when connecting to localhost for convenience
			if strings.Contains(databaseURL, "localhost") || strings.Contains(databaseURL, "127.0.0.1") {
				sslMode = "disable"
			}
		}
		if sslMode != "" {
			if strings.Contains(databaseURL, "?") {
				databaseURL = databaseURL + "&sslmode=" + sslMode
			} else {
				databaseURL = databaseURL + "?sslmode=" + sslMode
			}
		}
	}

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		log.Fatalf("failed to create pgx pool: %v", err)
	}

	// ping
	if err := pool.Ping(ctx); err != nil {
		log.Printf("warning: ping to Postgres failed: %v. Check DATABASE_URL / PGUSER / PGPASSWORD and PGSSLMODE (try PGSSLMODE=disable for local Postgres)", err)
	}

	Pool = pool

	if err := runMigrations(ctx); err != nil {
		log.Fatalf("failed to run migrations: %v", err)
	}
}

func runMigrations(ctx context.Context) error {
	// create tables if not exist
	queries := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			dob TEXT,
			gender TEXT,
			ip_address TEXT,
			user_status TEXT
		);`,

		`CREATE TABLE IF NOT EXISTS tokens (
			id SERIAL PRIMARY KEY,
			username TEXT NOT NULL,
			token TEXT UNIQUE NOT NULL,
			device_fingerprint TEXT,
			expired BOOLEAN DEFAULT FALSE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);`,

		`CREATE TABLE IF NOT EXISTS chatrooms (
			id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT,
			participant_count INTEGER DEFAULT 0,
			participants TEXT[] DEFAULT '{}'
		);`,
	}

	for _, q := range queries {
		if _, err := Pool.Exec(ctx, q); err != nil {
			return err
		}
	}
	return nil
}
