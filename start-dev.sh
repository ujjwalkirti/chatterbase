#!/usr/bin/env bash
# ==============================================================================
# ChatterBase Development Server Automation Script (Bash)
# Launches 3 tabs in Windows Terminal (or separate windows):
#   - Tab 1: Frontend (Next.js - npm run dev)
#   - Tab 2: Redis Server (local native Windows binary)
#   - Tab 3: Backend Go (waits for Redis, then starts air or go run main.go)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# If running on Windows / Git Bash / MSYS2 / WSL, invoke the PowerShell orchestrator
if command -v powershell.exe &>/dev/null; then
    PS_SCRIPT="$SCRIPT_DIR/start-dev.ps1"
    if command -v cygpath &>/dev/null; then
        PS_SCRIPT="$(cygpath -w "$PS_SCRIPT")"
    fi
    exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PS_SCRIPT"
elif command -v pwsh &>/dev/null; then
    exec pwsh -NoProfile -File "$SCRIPT_DIR/start-dev.ps1"
fi

# Native Linux / POSIX fallback (e.g. if run directly inside WSL/Linux without host Windows powershell)
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_GO_DIR="$SCRIPT_DIR/backend-go"

echo "Starting ChatterBase development services..."

# Check for tmux
if command -v tmux &>/dev/null; then
    SESSION="chatterbase-dev"
    tmux new-session -d -s "$SESSION" -n "frontend" "cd '$FRONTEND_DIR' && npm run dev"
    tmux new-window -t "$SESSION" -n "redis" "redis-server"
    tmux new-window -t "$SESSION" -n "backend-go" "cd '$BACKEND_GO_DIR' && sleep 2 && (air || go run main.go)"
    echo "Started tmux session: $SESSION. Attach with: tmux attach -t $SESSION"
    exit 0
fi

# Background processes fallback
(cd "$FRONTEND_DIR" && npm run dev) &
redis-server &
sleep 2
(cd "$BACKEND_GO_DIR" && (air || go run main.go)) &

wait
