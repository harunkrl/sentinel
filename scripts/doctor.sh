#!/bin/bash
# Sentinel Doctor — Diagnose common issues
# Usage: ./scripts/doctor.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS="${GREEN}✅${NC}"
WARN="${YELLOW}⚠️${NC}"
FAIL="${RED}❌${NC}"

echo -e "${BLUE}🩺 Sentinel Doctor${NC}"
echo "================================================"

ISSUES=0

# 1. Docker
if command -v docker &> /dev/null; then
    DOCKER_VER=$(docker --version | grep -oP '\d+\.\d+\.\d+' | head -1)
    echo -e "$PASS Docker $DOCKER_VER"
else
    echo -e "$FAIL Docker not installed"
    ((ISSUES++))
fi

# 2. Docker Compose
if docker compose version &> /dev/null; then
    COMPOSE_VER=$(docker compose version --short 2>/dev/null)
    echo -e "$PASS Docker Compose $COMPOSE_VER"
else
    echo -e "$FAIL Docker Compose not available"
    ((ISSUES++))
fi

# 3. Go (optional — only needed for compilation)
if command -v go &> /dev/null; then
    GO_VER=$(go version | grep -oP '\d+\.\d+(\.\d+)?' | head -1)
    echo -e "$PASS Go $GO_VER"
else
    echo -e "$WARN Go not installed (needed only for agent compilation)"
fi

# 4. protoc (optional)
if command -v protoc &> /dev/null; then
    PROTO_VER=$(protoc --version | grep -oP '\d+\.\d+(\.\d+)?' | head -1)
    echo -e "$PASS protoc $PROTO_VER"
else
    echo -e "$WARN protoc not installed (needed for proto generation)"
fi

echo ""

# 5. .env file
if [ -f .env ]; then
    echo -e "$PASS .env file exists"

    # Check for placeholder values
    if grep -qE "CHANGE_THIS|GENERATE_A|SAME_AS_INIT|your-super-secret" .env 2>/dev/null; then
        echo -e "$WARN .env contains placeholder values — update before production!"
        ((ISSUES++))
    fi

    # Check InfluxDB token matching
    INIT_TOKEN=$(grep "^DOCKER_INFLUXDB_INIT_ADMIN_TOKEN=" .env | cut -d'=' -f2)
    INFLUX_TOKEN=$(grep "^INFLUXDB_TOKEN=" .env | cut -d'=' -f2)
    if [ -n "$INIT_TOKEN" ] && [ -n "$INFLUX_TOKEN" ]; then
        if [ "$INIT_TOKEN" = "$INFLUX_TOKEN" ]; then
            echo -e "$PASS INFLUXDB_TOKEN matches DOCKER_INFLUXDB_INIT_ADMIN_TOKEN"
        else
            echo -e "$FAIL INFLUXDB_TOKEN does NOT match DOCKER_INFLUXDB_INIT_ADMIN_TOKEN"
            echo "       This will cause 401 Unauthorized errors from InfluxDB"
            ((ISSUES++))
        fi
    else
        echo -e "$WARN Could not read InfluxDB tokens from .env"
    fi

    # Check JWT_SECRET
    JWT=$(grep "^JWT_SECRET=" .env | cut -d'=' -f2)
    if [ -z "$JWT" ] || [ "$JWT" = "your-super-secret-jwt-key-change-this" ]; then
        echo -e "$WARN JWT_SECRET is empty or default — change it for production!"
        ((ISSUES++))
    else
        echo -e "$PASS JWT_SECRET is set"
    fi
else
    echo -e "$FAIL .env file not found"
    echo "       Run: cp .env.example .env"
    ((ISSUES++))
fi

echo ""

# 6. Port availability
check_port() {
    local port=$1
    local name=$2
    if ss -tlnp 2>/dev/null | grep -q ":$port "; then
        # Check if it's our container
        if docker ps --format '{{.Ports}}' 2>/dev/null | grep -q "$port->"; then
            echo -e "$PASS Port $port ($name) — in use by Sentinel container"
        else
            echo -e "$WARN Port $port ($name) — in use by another process"
            ((ISSUES++))
        fi
    else
        echo -e "$PASS Port $port ($name) — available"
    fi
}

check_port 80 "Web UI (prod)"
check_port 3000 "Web UI (dev)"
check_port 8080 "HTTP API"
check_port 8086 "InfluxDB"
check_port 50051 "gRPC"

echo ""

# 7. Disk space
DISK_FREE=$(df -h . | awk 'NR==2 {print $4}')
DISK_PERCENT=$(df . | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_PERCENT" -gt 90 ]; then
    echo -e "$FAIL Disk space: $DISK_FREE free ($DISK_PERCENT% used) — critically low!"
    ((ISSUES++))
elif [ "$DISK_PERCENT" -gt 80 ]; then
    echo -e "$WARN Disk space: $DISK_FREE free ($DISK_PERCENT% used) — running low"
    ((ISSUES++))
else
    echo -e "$PASS Disk space: $DISK_FREE free ($DISK_PERCENT% used)"
fi

# 8. Container status
echo ""
if docker ps &> /dev/null; then
    RUNNING=$(docker ps --filter "name=sentinel" --format "{{.Names}}: {{.Status}}" 2>/dev/null)
    if [ -n "$RUNNING" ]; then
        echo -e "${BLUE}Running Containers:${NC}"
        while IFS= read -r line; do
            echo -e "  $PASS $line"
        done <<< "$RUNNING"
    else
        echo -e "$WARN No Sentinel containers running"
    fi
fi

# 9. TLS certificates
echo ""
if [ -f "certs/server-cert.pem" ] && [ -f "certs/server-key.pem" ]; then
    echo -e "$PASS TLS certificates found in certs/"
    EXPIRY=$(openssl x509 -enddate -noout -in certs/server-cert.pem 2>/dev/null | cut -d= -f2)
    if [ -n "$EXPIRY" ]; then
        echo "       Expires: $EXPIRY"
    fi
else
    echo -e "$WARN No TLS certificates (certs/server-cert.pem, certs/server-key.pem)"
    echo "       gRPC will run in INSECURE (plaintext) mode"
    echo "       Run: ./scripts/generate-certs.sh to create self-signed certs"
fi

echo ""
echo "================================================"
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 No issues found! Everything looks healthy.${NC}"
else
    echo -e "${YELLOW}Found $ISSUES issue(s). Review warnings above.${NC}"
fi
