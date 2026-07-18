#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_FILE="/etc/systemd/system/wirevault-core.service"
USER_NAME="${SUDO_USER:-$USER}"

sudo tee "$SERVICE_FILE" >/dev/null <<EOF
[Unit]
Description=WireVault Core
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER_NAME
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/bin/python3 $PROJECT_DIR/backend/wirevault_core.py --host 127.0.0.1 --port 8080
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now wirevault-core.service
echo "WireVault Core installed and started."