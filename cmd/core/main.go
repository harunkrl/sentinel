package main

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net"
	"os"

	"sentinel/internal/server"
	"sentinel/internal/store"

	"google.golang.org/grpc"
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
			log.Println("==============================================")
			log.Println("  INITIAL ADMIN CREDENTIALS")
			log.Println("  Username: admin")
			log.Printf("  Password: %s", randomPassword)
			log.Println("  Please change this password after first login!")
			log.Println("==============================================")
		}
	}

	// 4. Start gRPC Server
	go func() {
		lis, err := net.Listen("tcp", ":50051")
		if err != nil {
			log.Fatalf("failed to listen: %v", err)
		}
		grpcServer := grpc.NewServer()

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
