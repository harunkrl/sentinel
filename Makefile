
BINARY_DIR=bin

build: build-core build-agent

build-core:
	@echo "Building Core..."
	mkdir -p $(BINARY_DIR)
	go build -o $(BINARY_DIR)/core ./cmd/core

build-agent:
	@echo "Building Agent (Linux/AMD64)..."
	mkdir -p $(BINARY_DIR)
	GOOS=linux GOARCH=amd64 go build -o $(BINARY_DIR)/agent-amd64 ./cmd/agent

build-agent-arm:
	@echo "Building Agent (Linux/ARM64 for Pi)..."
	mkdir -p $(BINARY_DIR)
	GOOS=linux GOARCH=arm64 go build -o $(BINARY_DIR)/agent-arm64 ./cmd/agent

clean:
	rm -rf $(BINARY_DIR)

test:
	@echo "Running Tests..."
	go test -v ./...
	go vet ./...

help:
	@echo "Available commands:"
	@echo "  make build         - Build core and agent binaries"
	@echo "  make build-core    - Build only the core server"
	@echo "  make build-agent   - Build agent for Linux/AMD64"
	@echo "  make build-agent-arm - Build agent for Linux/ARM64"
	@echo "  make test          - Run tests and static analysis"
	@echo "  make clean         - Remove build artifacts"
