#!/bin/bash

# Setup Log file
LOG_FILE="/tmp/sentinel_install.log"
exec > >(tee -a $LOG_FILE) 2>&1

echo "--- Install Log Started at $(date) ---"

# Usage: curl ... | sudo bash -s <SERVER_IP> [WEB_PORT]
SERVER_IP=$1
WEB_PORT=${2:-80}
SERVER_PORT="50051"
BINARY_NAME="sentinel-agent"
INSTALL_DIR="/usr/local/bin"
SERVICE_NAME="sentinel-agent"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: This script must be run as root. Use 'sudo'."
  exit 1
fi

# IP Logic: If provided, use it. If not, try to detect.
if [ -z "$SERVER_IP" ]; then
    if [ -f "$SERVICE_FILE" ]; then
        echo "⚠️  No IP provided, detecting from existing service..."
        EXISTING_IP=$(grep "CORE_ADDRESS=" "$SERVICE_FILE" | cut -d'=' -f3 | cut -d':' -f1)
        if [ -n "$EXISTING_IP" ]; then
            SERVER_IP=$EXISTING_IP
            echo "✅ Detected Server IP: $SERVER_IP"
        else
            echo "❌ Error: Server IP is required."
            exit 1
        fi
    else
        echo "❌ Error: Server IP is required for fresh install."
        echo "Usage: curl ... | sudo bash -s <SERVER_IP> [WEB_PORT]"
        exit 1
    fi
fi

echo "🚀 Sentinel Agent Setup"
echo "Target: $SERVER_IP (Port: $WEB_PORT)"
echo "-----------------------------------"

# 2. Detect Architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
REMOTE_BINARY=""

if [[ "$OS" == "linux" ]]; then
    if [[ "$ARCH" == "x86_64" ]]; then
        REMOTE_BINARY="sentinel-agent-linux-amd64"
    elif [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
        REMOTE_BINARY="sentinel-agent-linux-arm64"
    else
        echo "❌ Unsupported Architecture: $ARCH"
        exit 1
    fi
else
    echo "❌ Unsupported OS: $OS"
    exit 1
fi

echo "✅ System: $OS / $ARCH"

# 3. Download
# 3. Download
DOWNLOAD_URL="http://$SERVER_IP:$WEB_PORT/downloads/$REMOTE_BINARY"
CA_URL="http://$SERVER_IP:$WEB_PORT/downloads/ca-cert.pem"

if [ "$WEB_PORT" == "80" ]; then
    DOWNLOAD_URL="http://$SERVER_IP/downloads/$REMOTE_BINARY"
    CA_URL="http://$SERVER_IP/downloads/ca-cert.pem"
fi
TEMP_FILE="/tmp/$BINARY_NAME-update"
CA_FILE="/etc/sentinel/ca-cert.pem"

# Ensure config dir exists
mkdir -p /etc/sentinel

echo "⬇️  Downloading CA Certificate from $CA_URL..."
curl -s -L -o $CA_FILE $CA_URL
if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Failed to download CA Cert. Agent might not trust the server."
else
    echo "✅ CA Certificate downloaded to $CA_FILE"
fi

echo "⬇️  Downloading Agent from $DOWNLOAD_URL..."
curl --progress-bar -f -L -o $TEMP_FILE $DOWNLOAD_URL

if [ $? -ne 0 ]; then
    echo "❌ Download failed! Check URL/IP ($SERVER_IP) or Firewall."
    rm -f $TEMP_FILE
    exit 1
fi

chmod +x $TEMP_FILE

# 4. Stop Service if running
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "⏹️  Stopping existing service..."
    systemctl stop $SERVICE_NAME
fi

# 5. Install Binary
echo "📦 Installing binary..."
mv -f $TEMP_FILE $INSTALL_DIR/$BINARY_NAME
chmod +x $INSTALL_DIR/$BINARY_NAME

# 6. Update/Create Service File (ALWAYS UPDATE to fix IP/Env issues)
echo "🔧 Configuring Systemd Service..."
cat <<EOF > $SERVICE_FILE
[Unit]
Description=Sentinel System Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart=$INSTALL_DIR/$BINARY_NAME
Restart=always
Environment="CORE_ADDRESS=$SERVER_IP:$SERVER_PORT"
# Professional Mode: Use CA File for verification
# Environment="SENTINEL_SKIP_TLS_VERIFY=true"
Environment="SENTINEL_CA_FILE=/etc/sentinel/ca-cert.pem"
# Agent hostname override (Optional)
# Environment="AGENT_HOSTNAME=$(hostname)"

[Install]
WantedBy=multi-user.target
EOF

# 7. Reload & Start
echo "♻️  Reloading & Starting Service..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl start $SERVICE_NAME

# 8. Status Check
sleep 2
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "STATUS: 🟢 Active (Running)"
    echo "Logs:"
    journalctl -u $SERVICE_NAME -n 5 --no-pager
else
    echo "STATUS: 🔴 Failed"
    journalctl -u $SERVICE_NAME -n 10 --no-pager
    exit 1
fi
