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

# --- Port validation helper ---
validate_port() {
  local port="$1"
  local label="$2"
  if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
    echo "Invalid port: $port (must be 1-65535). Using default." >&2
    return 1
  fi
  if [ "$port" -lt 1024 ]; then
    echo "  Warning: port $port < 1024 requires root to bind." >&2
  fi
  return 0
}

# --- .env setup ---
if [ ! -f "$INSTALL_DIR/.env" ]; then
  echo ""
  echo "--- Port Configuration ---"
  read -rp "HTTP port [3000]: " HTTP_PORT
  HTTP_PORT="${HTTP_PORT:-3000}"
  if ! validate_port "$HTTP_PORT" "HTTP"; then
    HTTP_PORT=3000
  fi

  read -rp "HTTPS port [3443]: " TLS_PORT
  TLS_PORT="${TLS_PORT:-3443}"
  if ! validate_port "$TLS_PORT" "HTTPS"; then
    TLS_PORT=3443
  fi

  echo ""
  read -rp "Use Weather Underground for weather data? [y/N] " WU_CHOICE
  WU_CHOICE="${WU_CHOICE:-N}"

  WU_KEY=""
  if [[ "$WU_CHOICE" =~ ^[Yy] ]]; then
    read -rp "Enter your WU API key (or press Enter to add later): " WU_KEY
  fi

  # Write .env with port and API key settings
  {
    echo "PORT=$HTTP_PORT"
    echo "HTTPS_PORT=$TLS_PORT"
    echo "WU_API_KEY=$WU_KEY"
  } > "$INSTALL_DIR/.env"

  if [ -n "$WU_KEY" ]; then
    echo ".env created with API key."
  else
    echo ".env created."
  fi
  chown "$REAL_USER":"$REAL_USER" "$INSTALL_DIR/.env"
else
  echo "Existing .env found, keeping it."
  # Read existing port values for display
  HTTP_PORT=$(grep -oP '^PORT=\K[0-9]+' "$INSTALL_DIR/.env" 2>/dev/null || echo "3000")
  TLS_PORT=$(grep -oP '^HTTPS_PORT=\K[0-9]+' "$INSTALL_DIR/.env" 2>/dev/null || echo "3443")
  echo "  HTTP port:  $HTTP_PORT"
  echo "  HTTPS port: $TLS_PORT"
fi

# --- Install dependencies ---
echo ""
echo "Installing npm dependencies ..."
cd "$INSTALL_DIR"
sudo -u "$REAL_USER" npm install

# --- Build client bundle ---
echo "Building client ..."
sudo -u "$REAL_USER" npm run build

# --- Optional: VOACAP propagation engine ---
echo ""
echo "HamTab includes an optional HF propagation prediction engine (VOACAP)."
echo "This requires Python 3 and the dvoacap-python library (~50 MB)."
echo "Without it, HamTab uses a simplified propagation model."
echo ""
read -rp "Install VOACAP propagation engine? [y/N] " VOACAP_CHOICE
VOACAP_CHOICE="${VOACAP_CHOICE:-N}"

if [[ "$VOACAP_CHOICE" =~ ^[Yy] ]]; then
  if command -v python3 &>/dev/null; then
    echo "Installing Python dependencies..."
    sudo -u "$REAL_USER" pip3 install --user numpy
    sudo -u "$REAL_USER" pip3 install --user git+https://github.com/skyelaird/dvoacap-python.git
    echo "VOACAP engine installed."
  else
    echo "Python 3 not found. Skipping VOACAP installation."
    echo "Install Python 3 manually, then run:"
    echo "  pip3 install numpy"
    echo "  pip3 install git+https://github.com/skyelaird/dvoacap-python.git"
  fi
else
  echo "Skipping VOACAP. You can install it later with:"
  echo "  pip3 install numpy"
  echo "  pip3 install git+https://github.com/skyelaird/dvoacap-python.git"
fi

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
KillSignal=SIGTERM
KillMode=mixed
TimeoutStopSec=15
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
echo "==================================="
echo "  Install complete!"
echo "==================================="
echo ""
echo "  HTTP:   http://localhost:${HTTP_PORT}"
echo "  HTTPS:  https://localhost:${TLS_PORT}"
echo ""
echo "  Uninstall: sudo bash $INSTALL_DIR/uninstall.sh"
echo ""
