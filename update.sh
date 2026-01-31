#!/usr/bin/env bash
# Manual update — pulls latest code and installs dependencies.

cd "$(dirname "$0")"

echo "Pulling latest changes..."
git pull || { echo "git pull failed"; exit 1; }

echo "Installing dependencies..."
npm install --production || { echo "npm install failed"; exit 1; }

echo "Update complete."
