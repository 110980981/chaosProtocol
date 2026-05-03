#!/usr/bin/env bash

PORT=${1:-8080}
DIR="$(cd "$(dirname "$0")" && pwd)"
URL="http://localhost:$PORT"
PIDFILE="$DIR/.server.pid"

echo "=========================================="
echo "  Chaos Protocol — Starting Dev Server"
echo "  Port: $PORT"
echo "=========================================="

# Check PID file
if [ -f "$PIDFILE" ]; then
  OLD_PID=$(cat "$PIDFILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Server already running (PID: $OLD_PID). Run ./stop.sh first."
    exit 1
  fi
  rm -f "$PIDFILE"
fi

# Pick the first available server
SERVER=""
if command -v python3 &>/dev/null; then
  SERVER="python3 -m http.server $PORT"
elif command -v python &>/dev/null; then
  SERVER="python -m http.server $PORT"
elif command -v npx &>/dev/null; then
  SERVER="npx http-server -p $PORT -c-1"
else
  echo "Error: install Python or Node.js to run the dev server."
  exit 1
fi

echo "→ $SERVER"
cd "$DIR"

# Start server in background
$SERVER &
PID=$!
echo "$PID" > "$PIDFILE"

# Wait for server to be ready
for i in $(seq 1 10); do
  if curl -s -o /dev/null "$URL" 2>/dev/null; then
    echo "✓ Server ready at $URL"
    break
  fi
  sleep 0.5
done

# Open browser (platform-dependent)
case "$(uname)" in
  Linux)
    if command -v termux-open &>/dev/null; then
      termux-open "$URL"
    elif command -v xdg-open &>/dev/null; then
      xdg-open "$URL"
    fi
    ;;
  Darwin)
    open "$URL"
    ;;
  MINGW*|MSYS*)
    start "$URL"
    ;;
esac

# Wait for server to exit, then clean up PID file
wait $PID 2>/dev/null
rm -f "$PIDFILE"
