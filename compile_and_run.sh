#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DOWNLOAD_DIR="./deploy/downloads"
VERSION=$(git describe --tags --always 2>/dev/null || echo "dev")
BUILD_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Parse arguments
MODE="dev"
SKIP_COMPILE=false

while [[ "$#" -gt 0 ]]; do
    case $1 in
        --prod|--production) MODE="prod";;
        --dev|--development) MODE="dev";;
        --skip-compile) SKIP_COMPILE=true;;
        -h|--help) 
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --dev, --development   Development mode (default)"
            echo "  --prod, --production   Production mode"
            echo "  --skip-compile         Skip agent compilation"
            echo "  -h, --help             Show this help"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1;;
    esac
    shift
done

mkdir -p $DOWNLOAD_DIR

echo -e "${BLUE}🚀 Sentinel Server Setup${NC}"
echo -e "Mode: ${YELLOW}$MODE${NC} | Version: ${GREEN}$VERSION${NC}"
echo "------------------------------------------------"

# --- 0. PROTO GENERATION ---
echo -e "${GREEN}⚙️  Generating gRPC Code...${NC}"

if ! command -v protoc-gen-go &> /dev/null; then
    echo "   - Installing protoc plugins..."
    go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
    export PATH=$PATH:$(go env GOPATH)/bin
fi

protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    proto/service.proto

if [ $? -eq 0 ]; then
    echo "   ✅ Proto files generated successfully."
else
    echo -e "   ${RED}❌ Proto generation failed! Check protoc installation.${NC}"
    exit 1
fi

# --- 1. COMPILE AGENTS ---
if [ "$SKIP_COMPILE" = false ]; then
    echo -e "${GREEN}🔨 Compiling Agents for Multi-Architecture...${NC}"
    
    LDFLAGS="-X main.Version=$VERSION -X main.BuildDate=$BUILD_DATE"
    
    echo "   - Building Linux AMD64..."
    GOOS=linux GOARCH=amd64 go build -ldflags "$LDFLAGS" -o $DOWNLOAD_DIR/sentinel-agent-linux-amd64 ./cmd/agent
    
    echo "   - Building Linux ARM64..."
    GOOS=linux GOARCH=arm64 go build -ldflags "$LDFLAGS" -o $DOWNLOAD_DIR/sentinel-agent-linux-arm64 ./cmd/agent
    
    echo "   - Building Windows AMD64..."
    GOOS=windows GOARCH=amd64 go build -ldflags "$LDFLAGS" -o $DOWNLOAD_DIR/sentinel-agent-windows-amd64.exe ./cmd/agent
    
    echo -e "${GREEN}✅ Compilation Complete. Binaries are in $DOWNLOAD_DIR${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping agent compilation${NC}"
fi

# --- 2. START DOCKER ---
echo -e "${GREEN}📦 Starting Backend Services ($MODE mode)...${NC}"

# Ensure .env file exists (Docker Compose reads it automatically)
if [ ! -f .env ]; then
    if [ "$MODE" = "prod" ] && [ -f .env.production.example ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.production.example...${NC}"
        cp .env.production.example .env
        echo -e "${RED}   ⚠️  IMPORTANT: Edit .env and change ALL placeholder values before production use!${NC}"
    elif [ -f .env.example ]; then
        echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
        cp .env.example .env
    else
        echo -e "${RED}❌ No .env or .env.example found! Create a .env file with required variables.${NC}"
        echo "   See README.md for required environment variables."
        exit 1
    fi
fi

if [ "$MODE" = "prod" ]; then
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
else
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
fi

echo ""
echo -e "${BLUE}🎉 System Ready! (${MODE} mode)${NC}"

# Auto-detect server IP for install instructions
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
if [ -z "$SERVER_IP" ]; then
    SERVER_IP="<SERVER_IP>"
fi

if [ "$MODE" = "prod" ]; then
    echo "Dashboard: http://$SERVER_IP"
    echo "------------------------------------------------"
    echo "To install agent on other devices:"
    echo -e "${GREEN}curl -sL http://$SERVER_IP/downloads/install.sh | sudo bash -s $SERVER_IP${NC}"
else
    echo "Dashboard: http://$SERVER_IP:3000"
    echo "API Debug: http://$SERVER_IP:8080"
    echo "InfluxDB:  http://$SERVER_IP:8086"
    echo "------------------------------------------------"
    echo "To install agent on other devices:"
    echo -e "${GREEN}curl -sL http://$SERVER_IP:3000/downloads/install.sh | sudo bash -s $SERVER_IP${NC}"
fi