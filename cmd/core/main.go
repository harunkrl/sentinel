package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sentinel/internal/server"
	"sentinel/internal/store"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/reflection"
)

func main() {
	log.Println("Starting Sentinel Core...")

	// 1. Initialize Influx Store
	influxStore, err := store.NewInfluxStore()
	if err != nil {
		log.Printf("Warning: InfluxDB not configured, running without storage: %v", err)
	} else {
		log.Println("Connected to InfluxDB")
		defer influxStore.Close()
	}

	// 2. Initialize SQLite Store
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "/data"
	}
	sqliteStore, err := store.NewStore(dataDir)
	if err != nil {
		log.Printf("Warning: Failed to initialize SQLite store: %v", err)
	} else {
		log.Println("Connected to SQLite Database")
		defer func() { _ = sqliteStore.Close() }()
	}

	// 3. Initialize Core Logic
	core := server.NewCoreServer(influxStore, sqliteStore, dataDir)

	// Bootstrap admin user with random password if not exists
	if _, err := sqliteStore.GetUser("admin"); err != nil {
		randomPassword := generateRandomPassword()
		if err := core.CreateUser("admin", randomPassword, "admin"); err != nil {
			log.Printf("Failed to create admin user: %v", err)
		} else {
			// Save to file
			pwFile := dataDir + "/initial_admin_password.txt"
			if err := os.WriteFile(pwFile, []byte(randomPassword), 0600); err != nil {
				log.Printf("Warning: Failed to write password file: %v", err)
				// Print to stdout as fallback only if file write fails
				fmt.Println("\n==============================================")
				fmt.Println("  INITIAL ADMIN CREDENTIALS")
				fmt.Println("  Username: admin")
				fmt.Printf("  Password: %s\n", randomPassword)
				fmt.Println("  ⚠️  IMPORTANT: Change this password immediately!")
				fmt.Println("==============================================")
			} else {
				fmt.Printf("\n✅ Admin user created. Credentials saved to: %s\n", pwFile)
				fmt.Println("   ⚠️  IMPORTANT: Read the file, change the password, then delete it!")
			}
		}
	}

	// 4. Start gRPC Server
	grpcPort := os.Getenv("GRPC_PORT")
	if grpcPort == "" {
		grpcPort = "50051"
	}

	lis, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	// TLS Configuration
	certFile := os.Getenv("TLS_CERT_FILE")
	keyFile := os.Getenv("TLS_KEY_FILE")
	if certFile == "" {
		certFile = "certs/server-cert.pem"
	}
	if keyFile == "" {
		keyFile = "certs/server-key.pem"
	}

	creds, err := credentials.NewServerTLSFromFile(certFile, keyFile)
	if err != nil {
		log.Printf("Warning: Failed to load TLS keys, falling back to INSECURE mode: %v", err)
	}

	var grpcServer *grpc.Server
	if creds != nil {
		grpcServer = grpc.NewServer(grpc.Creds(creds))
		log.Println("gRPC Server running in SECURE (TLS) mode 🔒")
	} else {
		grpcServer = grpc.NewServer()
		log.Println("gRPC Server running in INSECURE mode ⚠️")
	}

	core.RegisterGrpc(grpcServer)
	reflection.Register(grpcServer)

	go func() {
		log.Printf("gRPC server listening on :%s", grpcPort)
		if err := grpcServer.Serve(lis); err != nil {
			log.Printf("gRPC server stopped: %v", err)
		}
	}()

	// 5. Start HTTP Server
	httpServer := server.NewHttpServer(core)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	httpSrv := &http.Server{
		Addr:    ":" + port,
		Handler: httpServer.Handler(),
	}

	go func() {
		log.Printf("HTTP API listening on :%s", port)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP server stopped: %v", err)
		}
	}()

	// 6. Graceful Shutdown — wait for SIGINT or SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit
	log.Printf("Received signal %v, shutting down gracefully...", sig)

	// Stop gRPC server (stops accepting new connections, waits for in-flight)
	grpcServer.GracefulStop()
	log.Println("gRPC server stopped")

	// Shut down HTTP server with a 10-second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpSrv.Shutdown(ctx); err != nil {
		log.Printf("HTTP server forced shutdown: %v", err)
	}
	log.Println("HTTP server stopped")

	log.Println("Sentinel Core shut down cleanly.")
}

func generateRandomPassword() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "change-me-now-12345"
	}
	return hex.EncodeToString(bytes)
}
