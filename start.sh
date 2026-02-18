#!/bin/bash
# ─────────────────────────────────────────────────────────
# start.sh — Launch the Campus Housing Finder (dev mode)
#
# Usage:
#   ./start.sh          # Start both backend and frontend
#   ./start.sh --setup  # Also create .env if missing
# ─────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
ENV_FILE="$BACKEND/.env"

# ── Colors ────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Campus Housing Finder — Dev Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Check for .env ────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${YELLOW}⚠  .env file not found at $ENV_FILE${NC}"

  if [[ "$1" == "--setup" ]]; then
    echo -e "${GREEN}→ Creating .env file...${NC}"
    cat > "$ENV_FILE" << 'EOF'
DB_NAME=LIVIO
DB_USER=admin
DB_PASSWORD=LivioMarketplaceApp2025$
DB_HOST=livio-rds.c3euemwmm60k.us-west-1.rds.amazonaws.com
DB_PORT=3306
SECRET_KEY=django-insecure-dev-key
DEBUG=True
EOF
    echo -e "${GREEN}✓  .env created${NC}"
  else
    echo -e "${RED}✗  Backend will fail without it. Run:  ./start.sh --setup${NC}"
    echo ""
  fi
fi

# ── Kill any existing servers on those ports ──────────────
echo "→ Clearing ports 8000 and 8001..."
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null
sleep 0.5

# ── Start Backend ─────────────────────────────────────────
echo -e "${GREEN}→ Starting Django backend on http://localhost:8001${NC}"
cd "$BACKEND"
python manage.py runserver 8001 &> /tmp/housing_backend.log &
BACKEND_PID=$!

# Wait briefly and check it started
sleep 2
if kill -0 $BACKEND_PID 2>/dev/null; then
  echo -e "${GREEN}✓  Backend running (PID $BACKEND_PID)${NC}"
else
  echo -e "${RED}✗  Backend failed to start. Check log: cat /tmp/housing_backend.log${NC}"
fi

# ── Start Frontend ────────────────────────────────────────
echo -e "${GREEN}→ Starting frontend on http://localhost:8000${NC}"
cd "$FRONTEND"
python -m http.server 8000 &> /tmp/housing_frontend.log &
FRONTEND_PID=$!

sleep 1
if kill -0 $FRONTEND_PID 2>/dev/null; then
  echo -e "${GREEN}✓  Frontend running (PID $FRONTEND_PID)${NC}"
else
  echo -e "${RED}✗  Frontend failed to start. Check log: cat /tmp/housing_frontend.log${NC}"
fi

# ── Done ──────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Open in browser:${NC} http://localhost:8000"
echo -e "  ${GREEN}API:${NC}             http://localhost:8001/api/"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Logs:"
echo "    Backend:  tail -f /tmp/housing_backend.log"
echo "    Frontend: tail -f /tmp/housing_frontend.log"
echo ""
echo "  To stop both servers:"
echo "    kill $BACKEND_PID $FRONTEND_PID"
echo "  Or just close this terminal."
echo ""

# Keep script running so Ctrl+C kills both servers
wait
