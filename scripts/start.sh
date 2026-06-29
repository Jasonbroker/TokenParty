#!/bin/bash

cd "$(dirname "$0")/.."

echo "========================================="
echo "  TokenParty - Starting Services"
echo "========================================="
echo ""

# Ensure config exists
if [ ! -f ~/.tokenparty/config.yaml ]; then
  echo "[init] ~/.tokenparty/config.yaml not found, will be auto-created on first start."
  echo ""
fi

# Kill any existing processes on our ports
lsof -ti:3456 | xargs kill -9 2>/dev/null
lsof -ti:3457 | xargs kill -9 2>/dev/null
sleep 1

# Start proxy
echo "[proxy] Starting on http://localhost:3456 ..."
pnpm --filter @tokenparty/tokenparty dev > /tmp/tokenparty-proxy.log 2>&1 &
PROXY_PID=$!

# Start dashboard
echo "[dashboard] Starting on http://localhost:3457 ..."
pnpm --filter dashboard dev > /tmp/tokenparty-dashboard.log 2>&1 &
DASHBOARD_PID=$!

# Wait for services to be ready
sleep 3

# Check proxy health
if curl -s http://localhost:3456/health > /dev/null 2>&1; then
  echo "[proxy] Ready"
else
  echo "[proxy] Failed to start! Check /tmp/tokenparty-proxy.log"
fi

echo ""
echo "========================================="
echo "  Proxy:     http://localhost:3456"
echo "  Dashboard: http://localhost:3457"
echo "========================================="
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Trap Ctrl+C to cleanup
cleanup() {
  echo ""
  echo "Shutting down..."
  kill $PROXY_PID $DASHBOARD_PID 2>/dev/null
  wait $PROXY_PID $DASHBOARD_PID 2>/dev/null
  echo "Done."
  exit 0
}
trap cleanup SIGINT SIGTERM

# Tail logs from both services
tail -f /tmp/tokenparty-proxy.log /tmp/tokenparty-dashboard.log
