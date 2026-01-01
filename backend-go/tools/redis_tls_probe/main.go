package main

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/url"
	"os"
	"time"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		fmt.Println("No REDIS_URL set")
		return
	}
	u, err := url.Parse(redisURL)
	if err != nil {
		fmt.Println("parse error", err)
		return
	}
	host := u.Hostname()
	port := u.Port()
	if port == "" {
		port = "6379"
	}
	addr := net.JoinHostPort(host, port)
	fmt.Println("Probing", addr)

	// plain TCP
	d := net.Dialer{Timeout: 5 * time.Second}
	conn, err := d.Dial("tcp", addr)
	if err != nil {
		fmt.Println("TCP dial error:", err)
	} else {
		fmt.Println("TCP dial OK")
		// try sending a Redis PING in plain text protocol and read the response
		conn.SetWriteDeadline(time.Now().Add(2 * time.Second))
		_, werr := conn.Write([]byte("*1\r\n$4\r\nPING\r\n"))
		if werr != nil {
			fmt.Println("TCP write error:", werr)
		} else {
			conn.SetReadDeadline(time.Now().Add(2 * time.Second))
			buf := make([]byte, 128)
			n, err := conn.Read(buf)
			if err != nil {
				fmt.Println("TCP read error (no reply or timed out):", err)
			} else {
				fmt.Printf("TCP read %d bytes: %q\n", n, string(buf[:n]))
			}
		}
		conn.Close()
	}

	// TLS
	cfg := &tls.Config{InsecureSkipVerify: os.Getenv("REDIS_INSECURE_SKIP_VERIFY") == "true", ServerName: host}
	fmt.Println("Attempting TLS handshake (InsecureSkipVerify=", cfg.InsecureSkipVerify, ")")
	tlsConn, err := tls.DialWithDialer(&d, "tcp", addr, cfg)
	if err != nil {
		fmt.Println("TLS dial error:", err)
	} else {
		fmt.Println("TLS handshake OK; peer certificates:")
		for _, cert := range tlsConn.ConnectionState().PeerCertificates {
			fmt.Printf("- Subject: %s\n", cert.Subject.CommonName)
		}
		tlsConn.Close()
	}
}
