
BINARY_DIR=bin

# === Build ===
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

build-agent-windows:
	@echo "Building Agent (Windows/AMD64)..."
	mkdir -p $(BINARY_DIR)
	GOOS=windows GOARCH=amd64 go build -o $(BINARY_DIR)/agent-windows.exe ./cmd/agent

build-all: build-core build-agent build-agent-arm build-agent-windows

# === Docker ===
dev:
	./compile_and_run.sh --dev

prod:
	./compile_and_run.sh --prod

stop:
	docker compose down

# === Operations ===
status:
	@bash ./scripts/status.sh

logs:
	@bash ./scripts/logs.sh

doctor:
	@bash ./scripts/doctor.sh

backup:
	@bash ./scripts/backup.sh

reset:
	@bash ./scripts/reset.sh

update:
	@bash ./scripts/update.sh

generate-certs:
	@bash ./scripts/gen_certs.sh

# === Development ===
test:
	@echo "Running Tests..."
	go test -v ./...
	go vet ./...

clean:
	rm -rf $(BINARY_DIR)

# === Help ===
help:
	@echo ""
	@echo "  Sentinel — Available Commands"
	@echo "  ════════════════════════════════════════"
	@echo ""
	@echo "  Build:"
	@echo "    make build            Build core + Linux agent"
	@echo "    make build-all        Build all (core + Linux/ARM/Windows agent)"
	@echo "    make build-core       Build only the core server"
	@echo "    make build-agent      Build agent for Linux/AMD64"
	@echo "    make build-agent-arm  Build agent for Linux/ARM64"
	@echo "    make build-agent-windows  Build agent for Windows"
	@echo ""
	@echo "  Docker:"
	@echo "    make dev              Start development environment"
	@echo "    make prod             Start production environment"
	@echo "    make stop             Stop all containers"
	@echo ""
	@echo "  Operations:"
	@echo "    make status           Show service health"
	@echo "    make logs             View service logs"
	@echo "    make doctor           Diagnose common issues"
	@echo "    make backup           Backup data"
	@echo "    make reset            Clean reset (wipe data)"
	@echo "    make update           Pull latest + rebuild"
	@echo "    make gen-certs        Generate TLS certificates"
	@echo ""
	@echo "  Development:"
	@echo "    make test             Run tests and vet"
	@echo "    make clean            Remove build artifacts"
	@echo ""

.PHONY: build build-core build-agent build-agent-arm build-agent-windows build-all \
        dev prod stop status logs doctor backup reset update gen-certs \
        test clean help
