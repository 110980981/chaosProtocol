#!/usr/bin/env bash

PORT=${1:-8080}
DIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$DIR/.server.pid"

# Try PID file first
if [ -f "$PIDFILE" ]; then
  PID=$(cat "$PIDFILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping server on port $PORT (PID: $PID)..."
    kill "$PID" 2>/dev/null
    sleep 0.5
    if kill -0 "$PID" 2>/dev/null; then
      echo "Force killing..."
      kill -9 "$PID" 2>/dev/null
    fi
    rm -f "$PIDFILE"
    echo "✓ Server stopped"
    exit 0
  fi
  rm -f "$PIDFILE"
fi

# Fallback: kill any python/npx http server on this port
pkill -f "python3 -m http.server $PORT" 2>/dev/null && echo "✓ Server stopped" && exit 0
pkill -f "python -m http.server $PORT" 2>/dev/null && echo "✓ Server stopped" && exit 0
pkill -f "http-server.*$PORT" 2>/dev/null && echo "✓ Server stopped" && exit 0

echo "No server running on port $PORT"
