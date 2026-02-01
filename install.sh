#!/bin/bash
# HamTab — Linux install script
# Usage: clone the repo anywhere, then run: bash install.sh

set -e

INSTALL_DIR="/opt/hamtab"
SERVICE_NAME="hamtab"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# --- Require root ---
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run with sudo:"
  echo "  sudo bash install.sh"
  exit 1
fi

# --- Detect the calling user (not root) ---
REAL_USER="${SUDO_USER:-$(logname 2>/dev/null || echo $USER)}"
REAL_HOME=$(eval echo "~$REAL_USER")

echo "==================================="
echo "  HamTab Installer"
echo "==================================="
echo ""
echo "  Install dir:  $INSTALL_DIR"
echo "  Run as user:  $REAL_USER"
echo ""

# --- Check for Node.js ---
if ! command -v node &>/dev/null; then
  echo "Node.js not found. Installing via NodeSource ..."
  curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
  apt-get install -y nodejs
fi

NODE_VER=$(node --version)
echo "Node.js $NODE_VER found."
echo ""

# --- Copy to standard location ---
if [ "$SCRIPT_DIR" != "$INSTALL_DIR" ]; then
  echo "Copying files to $INSTALL_DIR ..."
  mkdir -p "$INSTALL_DIR"
  rsync -a --delete \
    --exclude node_modules \
    --exclude .git \
    --exclude .env \
    "$SCRIPT_DIR/" "$INSTALL_DIR/"
  chown -R "$REAL_USER":"$REAL_USER" "$INSTALL_DIR"
else
  echo "Already in $INSTALL_DIR, skipping copy."
fi

# --- .env setup ---
if [ ! -f "$INSTALL_DIR/.env" ]; then
  echo ""
  read -rp "Use Weather Underground for weather data? [y/N] " WU_CHOICE
  WU_CHOICE="${WU_CHOICE:-N}"

  if [[ "$WU_CHOICE" =~ ^[Yy] ]]; then
    read -rp "Enter your WU API key (or press Enter to add later): " WU_KEY
    echo "WU_API_KEY=$WU_KEY" > "$INSTALL_DIR/.env"
    if [ -z "$WU_KEY" ]; then
      echo ".env created. Add your key later in $INSTALL_DIR/.env"
    else
      echo ".env created with API key."
    fi
  else
    echo "WU_API_KEY=" > "$INSTALL_DIR/.env"
    echo ".env created (WU disabled)."
  fi
  chown "$REAL_USER":"$REAL_USER" "$INSTALL_DIR/.env"
else
  echo "Existing .env found, keeping it."
fi

# --- Install dependencies ---
echo ""
echo "Installing npm dependencies ..."
cd "$INSTALL_DIR"
sudo -u "$REAL_USER" npm install

# --- Build client bundle ---
echo "Building client ..."
sudo -u "$REAL_USER" npm run build

# --- Systemd service ---
echo ""
read -rp "Start HamTab on boot? [Y/n] " BOOT_CHOICE
BOOT_CHOICE="${BOOT_CHOICE:-Y}"

if [[ "$BOOT_CHOICE" =~ ^[Yy] ]]; then
  cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=HamTab POTA/SOTA Dashboard
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$REAL_USER
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5
Environment=NODE_ENV=production

StandardOutput=journal
StandardError=journal
SyslogIdentifier=hamtab

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl restart "$SERVICE_NAME"

  echo ""
  echo "Service installed and started."
  echo ""
  echo "  Status:   sudo systemctl status $SERVICE_NAME"
  echo "  Logs:     sudo journalctl -u $SERVICE_NAME -f"
  echo "  Restart:  sudo systemctl restart $SERVICE_NAME"
  echo "  Stop:     sudo systemctl stop $SERVICE_NAME"
else
  echo ""
  echo "Skipping boot service. Start manually with:"
  echo "  cd $INSTALL_DIR && npm start"
fi

echo ""
echo "Install complete."
