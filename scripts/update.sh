#!/bin/bash
# Sentinel Update — Pull latest code, rebuild, and restart
# Usage: ./scripts/update.sh [--no-backup]

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NO_BACKUP=false
if [ "$1" = "--no-backup" ]; then
    NO_BACKUP=true
fi

echo -e "${BLUE}🔄 Sentinel Update${NC}"
echo "================================================"

# Check for uncommitted changes
if ! git diff --quiet 2>/dev/null; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
    git status --short
    echo ""
    read -p "Continue anyway? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Cancelled. Commit or stash your changes first."
        exit 0
    fi
fi

# 1. Backup before update
if [ "$NO_BACKUP" != true ]; then
    echo "💾 Creating backup before update..."
    if [ -f "./scripts/backup.sh" ]; then
        bash ./scripts/backup.sh
        echo ""
    else
        echo -e "${YELLOW}   ⚠️  Backup script not found, skipping${NC}"
    fi
fi

# 2. Pull latest
echo "⬇️  Pulling latest code..."
git pull
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed. Resolve conflicts and try again.${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Code updated${NC}"

# 3. Detect current mode
if docker ps --format '{{.Ports}}' 2>/dev/null | grep -q "0.0.0.0:80->"; then
    MODE="prod"
elif docker ps --format '{{.Ports}}' 2>/dev/null | grep -q "0.0.0.0:3000->"; then
    MODE="dev"
else
    MODE="dev"
    echo -e "${YELLOW}   ⚠️  Could not detect mode, defaulting to dev${NC}"
fi

echo "   Detected mode: $MODE"

# 4. Rebuild and restart
echo "🔨 Rebuilding and restarting ($MODE mode)..."
./compile_and_run.sh --$MODE

echo ""
echo "================================================"
echo -e "${GREEN}✅ Update complete!${NC}"
echo ""
echo "Check status: ./scripts/status.sh"
echo "View logs:    ./scripts/logs.sh"
