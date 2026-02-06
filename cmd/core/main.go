package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"net"
	"os"

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
	}

	// 3. Initialize Core Logic
	core := server.NewCoreServer(influxStore, sqliteStore, dataDir)

	// Bootstrap admin user with random password if not exists
	if _, err := sqliteStore.GetUser("admin"); err != nil {
		randomPassword := generateRandomPassword()
		if err := core.CreateUser("admin", randomPassword, "admin"); err != nil {
			log.Printf("Failed to create admin user: %v", err)
		} else {
			// Print to stdout only (avoid logging systems if possible)
			fmt.Println("\n==============================================")
			fmt.Println("  INITIAL ADMIN CREDENTIALS")
			fmt.Println("  Username: admin")
			fmt.Printf("  Password: %s\n", randomPassword)
			fmt.Println("  ⚠️  IMPORTANT: Change this password immediately!")
			fmt.Println("==============================================\n")
		}
	}

	// 4. Start gRPC Server
	go func() {
		lis, err := net.Listen("tcp", ":50051")
		if err != nil {
			log.Fatalf("failed to listen: %v", err)
		}

		// TLS Configuration
		creds, err := credentials.NewServerTLSFromFile("certs/server-cert.pem", "certs/server-key.pem")
		if err != nil {
			log.Printf("Warning: Failed to load TLS keys, falling back to INSECURE mode: %v", err)
			log.Println("Ensure 'certs/server-cert.pem' and 'certs/server-key.pem' exist.")
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

		log.Printf("gRPC server listening on :50051")
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("failed to serve gRPC: %v", err)
		}
	}()

	// 5. Start HTTP Server
	httpServer := server.NewHttpServer(core)
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("HTTP API listening on :%s", port)
	if err := httpServer.Run(":" + port); err != nil {
		log.Fatalf("failed to serve HTTP: %v", err)
	}
}

func generateRandomPassword() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "change-me-now-12345"
	}
	return hex.EncodeToString(bytes)
}
