#!/bin/bash

# Setup Log file
LOG_FILE="/tmp/sentinel_install.log"
exec > >(tee -a $LOG_FILE) 2>&1

echo "--- Install Log Started at $(date) ---"

# Usage: curl ... | sudo bash -s <SERVER_IP> [WEB_PORT]
SERVER_IP=$1
WEB_PORT=${2:-80}  # Default to port 80 (production), can override with second arg
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

# Check IP
if [ -z "$SERVER_IP" ]; then
    # If no IP provided and service file EXISTS, extract IP from it (Update scenario)
    if [ -f "$SERVICE_FILE" ]; then
        echo "⚠️  No IP provided, trying to detect from existing service..."
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
        echo "  WEB_PORT defaults to 80. Use 3000 for development."
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

# 3. Download (To temp file)
# Try specified port first, then fallback
DOWNLOAD_URL="http://$SERVER_IP:$WEB_PORT/downloads/$REMOTE_BINARY"
if [ "$WEB_PORT" == "80" ]; then
    DOWNLOAD_URL="http://$SERVER_IP/downloads/$REMOTE_BINARY"
fi
TEMP_FILE="/tmp/$BINARY_NAME-update"

echo "⬇️  Downloading Agent from $DOWNLOAD_URL..."
curl --progress-bar -f -L -o $TEMP_FILE $DOWNLOAD_URL

if [ $? -ne 0 ]; then
    echo "❌ Download failed! Check URL or Server."
    rm -f $TEMP_FILE
    exit 1
fi

chmod +x $TEMP_FILE

# --- DECISION: UPDATE vs FRESH INSTALL ---
# Check Method: Check for physical existence of the service file.
if [ -f "$SERVICE_FILE" ]; then
    # === UPDATE MODE ===
    echo "🔄 Update Mode Detected (Service file exists)."
    
    # Stop service if running
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo "⏹️  Stopping service..."
        systemctl stop $SERVICE_NAME
    fi
    
    echo "📦 Replacing binary..."
    mv -f $TEMP_FILE $INSTALL_DIR/$BINARY_NAME
    chmod +x $INSTALL_DIR/$BINARY_NAME

    # Reload daemon in case service file is corrupted
    echo "♻️  Reloading & Starting Service..."
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    systemctl start $SERVICE_NAME
    
    echo "✅ Agent Updated Successfully!"

else
    # === FRESH INSTALL MODE ===
    echo "✨ Fresh Install Mode Detected."
    
    echo "📦 Installing binary..."
    mv $TEMP_FILE $INSTALL_DIR/$BINARY_NAME
    chmod +x $INSTALL_DIR/$BINARY_NAME

    echo "🔧 Creating Systemd Service..."
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

[Install]
WantedBy=multi-user.target
EOF

    echo "▶️  Enabling & Starting Service..."
    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    systemctl start $SERVICE_NAME
    
    echo "✅ Agent Installed & Started!"
fi

# Status Check
sleep 2
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "STATUS: 🟢 Active (Running)"
else
    echo "STATUS: 🔴 Failed (Check logs: sudo journalctl -u $SERVICE_NAME -n 20)"
    exit 1
fi