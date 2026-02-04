#!/bin/bash
# HamTab — Linux uninstall script
# Usage: sudo bash uninstall.sh

set -e

INSTALL_DIR="/opt/hamtab"
SERVICE_NAME="hamtab"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

# --- Require root ---
if [ "$(id -u)" -ne 0 ]; then
  echo "This script must be run with sudo:"
  echo "  sudo bash uninstall.sh"
  exit 1
fi

echo "==================================="
echo "  HamTab Uninstaller"
echo "==================================="
echo ""

# --- Stop and disable systemd service ---
if [ -f "$SERVICE_FILE" ]; then
  echo "Stopping $SERVICE_NAME service ..."
  systemctl stop "$SERVICE_NAME" 2>/dev/null || true
  systemctl disable "$SERVICE_NAME" 2>/dev/null || true
  rm -f "$SERVICE_FILE"
  systemctl daemon-reload
  echo "Service removed."
else
  echo "No systemd service found, skipping."
fi
echo ""

# --- Handle .env backup ---
if [ -f "$INSTALL_DIR/.env" ]; then
  echo "Your .env file contains configuration (API keys, ports)."
  read -rp "Keep a backup of .env? [Y/n] " KEEP_ENV
  KEEP_ENV="${KEEP_ENV:-Y}"

  if [[ "$KEEP_ENV" =~ ^[Yy] ]]; then
    BACKUP_PATH="/tmp/hamtab-env-backup-$(date +%Y%m%d%H%M%S)"
    cp "$INSTALL_DIR/.env" "$BACKUP_PATH"
    echo "Backed up to: $BACKUP_PATH"
  else
    echo ".env will be removed with the install directory."
  fi
fi
echo ""

# --- Remove install directory ---
if [ -d "$INSTALL_DIR" ]; then
  read -rp "Remove $INSTALL_DIR and all its contents? [y/N] " REMOVE_DIR
  REMOVE_DIR="${REMOVE_DIR:-N}"

  if [[ "$REMOVE_DIR" =~ ^[Yy] ]]; then
    rm -rf "$INSTALL_DIR"
    echo "Removed $INSTALL_DIR"
  else
    echo "Keeping $INSTALL_DIR"
  fi
else
  echo "$INSTALL_DIR not found, nothing to remove."
fi

# --- Summary ---
echo ""
echo "==================================="
echo "  Uninstall complete"
echo "==================================="
echo ""
if [ -n "${BACKUP_PATH:-}" ]; then
  echo "  .env backup: $BACKUP_PATH"
fi
echo "  Service:     removed"
echo "  Install dir: $([ -d "$INSTALL_DIR" ] && echo 'kept' || echo 'removed')"
echo ""
