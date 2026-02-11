#!/bin/bash
# Sentinel Backup — Backup InfluxDB data, SQLite database, and settings
# Usage: ./scripts/backup.sh [backup_directory]

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_NAME="sentinel-backup-$TIMESTAMP"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

echo -e "${BLUE}💾 Sentinel Backup${NC}"
echo "================================================"

# Create backup directory
mkdir -p "$BACKUP_PATH"

# 1. Backup .env (contains configuration)
if [ -f .env ]; then
    echo "📋 Backing up .env configuration..."
    cp .env "$BACKUP_PATH/env.backup"
fi

# 2. Backup SQLite database from Docker volume
echo "🗄️  Backing up SQLite database..."
docker cp sentinel_core:/data/sentinel.db "$BACKUP_PATH/sentinel.db" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ SQLite database backed up${NC}"
else
    echo -e "${YELLOW}   ⚠️  SQLite database not found or container not running${NC}"
fi

# 3. Backup settings
docker cp sentinel_core:/data/settings.json "$BACKUP_PATH/settings.json" 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Settings backed up${NC}"
else
    echo -e "${YELLOW}   ⚠️  Settings file not found${NC}"
fi

# 4. Backup InfluxDB data
echo "📊 Backing up InfluxDB data..."
docker exec sentinel_influx influx backup /tmp/influx-backup --token "$DOCKER_INFLUXDB_INIT_ADMIN_TOKEN" 2>/dev/null
if [ $? -eq 0 ]; then
    docker cp sentinel_influx:/tmp/influx-backup "$BACKUP_PATH/influxdb/" 2>/dev/null
    docker exec sentinel_influx rm -rf /tmp/influx-backup 2>/dev/null
    echo -e "${GREEN}   ✅ InfluxDB data backed up${NC}"
else
    echo -e "${YELLOW}   ⚠️  InfluxDB backup failed (container may not be running)${NC}"
fi

# 5. Compress
echo "📦 Compressing backup..."
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" -C "$BACKUP_DIR" "$BACKUP_NAME" 2>/dev/null
if [ $? -eq 0 ]; then
    rm -rf "$BACKUP_PATH"
    FINAL_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME.tar.gz" | awk '{print $1}')
    echo ""
    echo "================================================"
    echo -e "${GREEN}✅ Backup complete!${NC}"
    echo "   📁 $BACKUP_DIR/$BACKUP_NAME.tar.gz ($FINAL_SIZE)"
else
    echo -e "${RED}❌ Compression failed. Uncompressed backup at: $BACKUP_PATH${NC}"
fi
