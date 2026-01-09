#!/bin/bash
# Development Environment Startup Script

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 Starting Sentinel in DEVELOPMENT mode${NC}"
echo "------------------------------------------------"

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating .env from .env.example..."
    cp .env.example .env
fi

# Start with dev overrides
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

echo ""
echo -e "${GREEN}✅ Development environment ready!${NC}"
echo ""
echo "🌐 Dashboard:    http://localhost:3000"
echo "📡 API:          http://localhost:8080"
echo "🗄️  InfluxDB:     http://localhost:8086"
echo ""
echo "📋 Useful commands:"
echo "   docker compose logs -f core    # View core logs"
echo "   docker compose logs -f web     # View web logs"
echo "   docker compose down            # Stop all services"
