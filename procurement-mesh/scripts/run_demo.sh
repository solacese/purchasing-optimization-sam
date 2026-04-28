#!/usr/bin/env bash
set -euo pipefail

# ── Procurement Intelligence Mesh — Start All Services ──────────────
# Run from the project root: ./scripts/run_demo.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "═══════════════════════════════════════════════════"
echo "  Procurement Intelligence Mesh — Demo"
echo "═══════════════════════════════════════════════════"
echo ""

# ── Check prerequisites ────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "[ERROR] python3 not found. Install Python 3.11+."
  exit 1
fi

if ! command -v node &>/dev/null; then
  echo "[ERROR] node not found. Install Node.js 18+."
  exit 1
fi

if ! command -v docker &>/dev/null; then
  echo "[WARN] docker not found. Start Solace broker manually."
fi

# ── Load environment ───────────────────────────────────────────
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "[1/6] Loading .env"
  set -a; source "$PROJECT_ROOT/.env"; set +a
else
  echo "[WARN] No .env file found. Copy .env.example to .env and configure API keys."
fi

# ── Start Solace broker ────────────────────────────────────────
echo "[2/6] Starting Solace PubSub+ broker..."
if command -v docker &>/dev/null; then
  cd "$PROJECT_ROOT"
  docker compose up -d solace-broker 2>/dev/null || docker-compose up -d solace-broker 2>/dev/null || echo "[WARN] Could not start Solace via docker-compose"
  echo "       Waiting 20s for broker to initialize..."
  sleep 20
else
  echo "       [SKIP] Docker not available — ensure Solace is running on localhost:8008"
fi

# ── Start Procurement API ──────────────────────────────────────
echo "[3/6] Starting Procurement API (FastAPI) on port 8090..."
cd "$PROJECT_ROOT/services/procurement-api"
pip install -q -r requirements.txt 2>/dev/null
uvicorn main:app --host 0.0.0.0 --port 8090 &
API_PID=$!
echo "       PID: $API_PID"
sleep 3

# ── Start Price Feed Simulator ─────────────────────────────────
echo "[4/6] Starting Price Feed Simulator..."
cd "$PROJECT_ROOT/services/price-feed-simulator"
pip install -q -r requirements.txt 2>/dev/null
python3 main.py &
PRICE_PID=$!
echo "       PID: $PRICE_PID"

# ── Start Risk Feed Simulator ──────────────────────────────────
echo "[5/6] Starting Risk Feed Simulator..."
cd "$PROJECT_ROOT/services/risk-feed-simulator"
pip install -q -r requirements.txt 2>/dev/null
python3 main.py &
RISK_PID=$!
echo "       PID: $RISK_PID"

# ── Start UI dev server ───────────────────────────────────────
echo "[6/6] Starting React UI on port 5173..."
cd "$PROJECT_ROOT/ui"
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run dev &
UI_PID=$!
echo "       PID: $UI_PID"

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo "  All services started!"
echo ""
echo "  UI:              http://localhost:5173"
echo "  API:             http://localhost:8090"
echo "  API Health:      http://localhost:8090/api/health"
echo "  Solace Console:  http://localhost:8080"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "═══════════════════════════════════════════════════"

# ── Cleanup on exit ────────────────────────────────────────────
cleanup() {
  echo ""
  echo "Stopping services..."
  kill $API_PID $PRICE_PID $RISK_PID $UI_PID 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

# Keep script running
wait
