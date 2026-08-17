#!/usr/bin/env bash
# ==============================================================================
# PRGI TitleGuard — Fast Local Development Runner (No-Docker Path)
# ==============================================================================
# NOTE: The ML Docker image can take 15+ minutes to build on a laptop (downloading
# PyTorch, BGE-M3 models, and tokenizers). This non-Docker script starts in under
# 30 seconds by using local Python and Node environments directly.
#
# Having this fast non-Docker path saves crucial time during demos and local testing.
# ==============================================================================
#
# To run manually across 3 separate terminal tabs:
#
# Terminal 1 (Database - if using local postgres):
#   psql -U postgres -d prgi -f data/datasets/dataset1/database/01_schema.sql
#
# Terminal 2 (FastAPI Backend - Port 8000):
#   cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
#
# Terminal 3 (Vite Frontend - Port 5173):
#   cd frontend && npm install && npm run dev -- --host 0.0.0.0 --port 5173
# ==============================================================================

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "========================================================"
echo "  🚀 PRGI TitleGuard — Starting Local Dev Environment"
echo "========================================================"

# Trap SIGINT / SIGTERM to cleanly kill background subprocesses
cleanup() {
  echo ""
  echo "🛑 Shutting down local development processes..."
  kill $(jobs -p) 2>/dev/null || true
  wait 2>/dev/null || true
  echo "✅ All processes stopped."
}
trap cleanup EXIT INT TERM

# 1. Check Python requirements
echo "📦 [1/2] Starting FastAPI Backend on http://localhost:8000..."
export PYTHONPATH="$REPO_ROOT/backend:$REPO_ROOT"
export STUB_MODE=1

python3 -m uvicorn app.main:app --app-dir "$REPO_ROOT/backend" --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend health check
sleep 1.5
echo "   Backend running (PID: $BACKEND_PID)"

# 2. Start Frontend Dev Server
echo "⚡ [2/2] Starting Vite Frontend on http://localhost:5173..."
cd "$REPO_ROOT/frontend"
npm run dev -- --host 127.0.0.1 --port 5173 &
FRONTEND_PID=$!

echo ""
echo "========================================================"
echo "  ✨ PRGI TitleGuard is LIVE!"
echo "  • Frontend:  http://localhost:5173"
echo "  • API Docs:  http://localhost:8000/docs"
echo "  • Health:    http://localhost:8000/v1/health"
echo "========================================================"
echo "Press Ctrl+C to stop all servers."
echo ""

# Wait for background jobs
wait
