#!/bin/bash
# Sentinel Status — Quick health check for all services
# Usage: ./scripts/status.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
GRAY='\033[0;90m'
NC='\033[0m'

echo -e "${BLUE}📊 Sentinel Status${NC}"
echo "================================================"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

# Container status
CONTAINERS=("sentinel_core" "sentinel_web" "sentinel_influx")
ALL_RUNNING=true

for CONTAINER in "${CONTAINERS[@]}"; do
    STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null)
    UPTIME=$(docker inspect -f '{{.State.StartedAt}}' "$CONTAINER" 2>/dev/null)

    if [ "$STATUS" = "running" ]; then
        # Calculate uptime
        if [ -n "$UPTIME" ]; then
            START_TS=$(date -d "$UPTIME" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "$UPTIME" +%s 2>/dev/null)
            NOW_TS=$(date +%s)
            if [ -n "$START_TS" ]; then
                DIFF=$((NOW_TS - START_TS))
                HOURS=$((DIFF / 3600))
                MINS=$(( (DIFF % 3600) / 60 ))
                if [ $HOURS -gt 24 ]; then
                    DAYS=$((HOURS / 24))
                    UPTIME_STR="${DAYS}d $((HOURS % 24))h"
                elif [ $HOURS -gt 0 ]; then
                    UPTIME_STR="${HOURS}h ${MINS}m"
                else
                    UPTIME_STR="${MINS}m"
                fi
            else
                UPTIME_STR="unknown"
            fi
        fi

        # Get port info
        PORTS=$(docker port "$CONTAINER" 2>/dev/null | awk '{print $NF}' | tr '\n' ', ' | sed 's/,$//')
        echo -e "${GREEN}🟢${NC} ${CONTAINER}  ${GRAY}Up ${UPTIME_STR}  ${PORTS}${NC}"
    elif [ "$STATUS" = "exited" ]; then
        EXIT_CODE=$(docker inspect -f '{{.State.ExitCode}}' "$CONTAINER" 2>/dev/null)
        echo -e "${RED}🔴${NC} ${CONTAINER}  ${GRAY}Exited (code $EXIT_CODE)${NC}"
        ALL_RUNNING=false
    elif [ -z "$STATUS" ]; then
        echo -e "${YELLOW}⚪${NC} ${CONTAINER}  ${GRAY}Not found${NC}"
        ALL_RUNNING=false
    else
        echo -e "${YELLOW}🟡${NC} ${CONTAINER}  ${GRAY}$STATUS${NC}"
        ALL_RUNNING=false
    fi
done

echo ""

# Resource usage
echo -e "${BLUE}Resource Usage:${NC}"
docker stats --no-stream --format "  {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
    sentinel_core sentinel_web sentinel_influx 2>/dev/null | column -t

echo ""

# InfluxDB check
if docker exec sentinel_influx curl -sf http://localhost:8086/ping &> /dev/null; then
    echo -e "${GREEN}✅${NC} InfluxDB responding"
else
    echo -e "${RED}❌${NC} InfluxDB not responding"
fi

# Core API check
CORE_HEALTH=$(curl -sf http://localhost:8080/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅${NC} Core API responding"
else
    echo -e "${RED}❌${NC} Core API not responding (port 8080)"
fi

# Docker volumes
echo ""
echo -e "${BLUE}Storage:${NC}"
docker system df --format "  {{.Type}}\t{{.Size}}\t{{.Reclaimable}}" 2>/dev/null | head -4

echo ""
echo "================================================"
if [ "$ALL_RUNNING" = true ]; then
    echo -e "${GREEN}🎉 All services operational${NC}"
else
    echo -e "${YELLOW}⚠️  Some services are not running. Check logs: ./scripts/logs.sh${NC}"
fi
