#!/bin/bash
# Sentinel Logs — Filtered, colored log viewer
# Usage: ./scripts/logs.sh [service] [--errors] [--lines N]

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVICE=""
ERRORS_ONLY=false
LINES=100

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        core|web|influx|influxdb)
            if [ "$1" = "influxdb" ]; then
                SERVICE="sentinel_influx"
            else
                SERVICE="sentinel_$1"
            fi
            ;;
        --errors|-e)
            ERRORS_ONLY=true
            ;;
        --lines|-n)
            shift
            LINES=$1
            ;;
        -f|--follow)
            FOLLOW=true
            ;;
        -h|--help)
            echo "Usage: $0 [service] [options]"
            echo ""
            echo "Services:"
            echo "  core       Core server logs"
            echo "  web        Web frontend logs"
            echo "  influx     InfluxDB logs"
            echo "  (none)     All services"
            echo ""
            echo "Options:"
            echo "  --errors, -e     Show only errors and warnings"
            echo "  --lines N, -n N  Number of lines to show (default: 100)"
            echo "  --follow, -f     Follow log output in real-time"
            echo "  -h, --help       Show this help"
            exit 0
            ;;
        *) echo "Unknown: $1. Use -h for help."; exit 1;;
    esac
    shift
done

# Check Docker
if ! docker info &> /dev/null; then
    echo -e "${YELLOW}❌ Docker is not running${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Sentinel Logs${NC}"
if [ -n "$SERVICE" ]; then
    echo -e "   Service: ${GREEN}$SERVICE${NC}"
fi
echo "================================================"

# Build command
CMD="docker compose logs"

if [ -n "$SERVICE" ]; then
    # Extract service name from container name (sentinel_core -> core)
    SVC_NAME=${SERVICE#sentinel_}
    CMD="$CMD $SVC_NAME"
fi

if [ "$FOLLOW" = true ]; then
    CMD="$CMD -f"
else
    CMD="$CMD --tail=$LINES"
fi

# Execute with optional filtering
if [ "$ERRORS_ONLY" = true ]; then
    $CMD 2>&1 | grep -iE "error|fail|fatal|panic|warn|401|403|500|❌" --color=always
else
    $CMD 2>&1
fi
