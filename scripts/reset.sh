#!/bin/bash
# Sentinel Reset — Clean reset of all data and containers
# Usage: ./scripts/reset.sh [--force]

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

FORCE=false
if [ "$1" = "--force" ] || [ "$1" = "-f" ]; then
    FORCE=true
fi

echo -e "${RED}🗑️  Sentinel Reset${NC}"
echo "================================================"
echo ""
echo "This will:"
echo "  1. Stop all Sentinel containers"
echo "  2. Remove containers and images"
echo "  3. Delete InfluxDB data volume"
echo "  4. Delete SQLite data volume"
echo "  5. Keep your .env file and certificates"
echo ""

if [ "$FORCE" != true ]; then
    echo -e "${YELLOW}⚠️  This action is IRREVERSIBLE. All monitoring data will be lost.${NC}"
    echo ""
    read -p "Type 'RESET' to confirm: " confirm
    if [ "$confirm" != "RESET" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo ""

# 1. Stop containers
echo "⏹️  Stopping containers..."
docker compose down 2>/dev/null

# 2. Remove volumes
echo "🗄️  Removing data volumes..."
docker volume rm sentinel_influxdb_data 2>/dev/null && \
    echo -e "${GREEN}   ✅ InfluxDB data removed${NC}" || \
    echo -e "${YELLOW}   ⚠️  InfluxDB volume not found${NC}"

docker volume rm sentinel_sentinel_data 2>/dev/null && \
    echo -e "${GREEN}   ✅ SQLite data removed${NC}" || \
    echo -e "${YELLOW}   ⚠️  SQLite volume not found${NC}"

# 3. Remove images (optional)
echo "🐳 Removing Sentinel images..."
docker rmi $(docker images --filter "reference=sentinel*" -q) 2>/dev/null && \
    echo -e "${GREEN}   ✅ Images removed${NC}" || \
    echo -e "${YELLOW}   ⚠️  No Sentinel images found${NC}"

# 4. Clean local data directory
if [ -d "./data" ]; then
    rm -rf ./data
    echo -e "${GREEN}   ✅ Local data directory removed${NC}"
fi

echo ""
echo "================================================"
echo -e "${GREEN}✅ Reset complete!${NC}"
echo ""
echo "To start fresh:"
echo "  ./compile_and_run.sh --dev   (development)"
echo "  ./compile_and_run.sh --prod  (production)"
