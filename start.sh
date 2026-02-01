#!/usr/bin/env bash
# Start wrapper — runs node server.js in a restart loop.
# Clean exit (code 0) restarts after 1s; crash restarts after 3s.

cd "$(dirname "$0")"
export RESTART_WRAPPER=1

while true; do
  echo "=== Starting server ==="
  node esbuild.mjs
  node server.js
  EXIT_CODE=$?
  if [ "$EXIT_CODE" -eq 0 ]; then
    echo "Server exited cleanly (code 0). Restarting in 1s..."
    sleep 1
  else
    echo "Server crashed (code $EXIT_CODE). Restarting in 3s..."
    sleep 3
  fi
done
