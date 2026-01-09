#!/bin/bash

# Configuration
SERVICE_NAME="sentinel-agent"
INSTALL_DIR="/usr/local/bin"
BINARY_NAME="sentinel-agent"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME.service"

# 1. Check Root Privileges
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: This script must be run as root. Use 'sudo'."
  exit 1
fi

echo "🗑️  Sentinel Agent Uninstaller"
echo "-----------------------------------"

# 2. Stop and Disable Service
if systemctl is-active --quiet $SERVICE_NAME; then
    echo "⏹️  Stopping service..."
    systemctl stop $SERVICE_NAME
fi

if systemctl is-enabled --quiet $SERVICE_NAME; then
    echo "🔌 Disabling service..."
    systemctl disable $SERVICE_NAME
fi

# 3. Remove Service File
if [ -f "$SERVICE_FILE" ]; then
    echo "📄 Removing service file..."
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload
else
    echo "⚠️  Service file not found, skipping."
fi

# 4. Remove Binary
if [ -f "$INSTALL_DIR/$BINARY_NAME" ]; then
    echo "📦 Removing binary..."
    rm -f "$INSTALL_DIR/$BINARY_NAME"
else
    echo "⚠️  Binary not found, skipping."
fi

echo "✅ Uninstall Complete. Sentinel Agent has been removed."
