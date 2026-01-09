#!/bin/bash
# Production Environment Startup Script

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Sentinel in PRODUCTION mode${NC}"
echo "------------------------------------------------"

# Check required files
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "   Please copy .env.production.example to .env and configure it."
    exit 1
fi

# Warn about default values
if grep -q "CHANGE_THIS\|sentinel123\|your-private" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Warning: Default values detected in .env!${NC}"
    echo "   Please update passwords and secrets before production deployment."
    read -p "   Continue anyway? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        exit 1
    fi
fi

# Start with production overrides
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo ""
echo -e "${GREEN}✅ Production environment ready!${NC}"
echo ""
echo "🌐 Dashboard: http://localhost:80"
echo ""
echo "📋 Useful commands:"
echo "   docker compose logs -f         # View all logs"
echo "   docker compose ps              # Check service status"
echo "   docker compose down            # Stop all services"
