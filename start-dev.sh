#!/usr/bin/env bash
# ==============================================================================
# ChatterBase Development Server Automation Script (Bash)
# Launches:
#   - Frontend (Next.js - http://localhost:3000)
#   - Redis Server (Port 6379)
#   - Backend (Go or Node.js - Port 8000)
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="go"
SEPARATE_WINDOWS=0

while [[ $# -gt 0 ]]; do
    case "$1" in
        --backend|-b)
            BACKEND="$2"
            shift 2
            ;;
        --windows|-w|--separate-windows)
            SEPARATE_WINDOWS=1
            shift
            ;;
        go|js)
            BACKEND="$1"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# If running on Windows / Git Bash / MSYS2 / WSL with Windows PowerShell access
if command -v powershell.exe &>/dev/null; then
    PS_SCRIPT="$SCRIPT_DIR/start-dev.ps1"
    if command -v cygpath &>/dev/null; then
        PS_SCRIPT="$(cygpath -w "$PS_SCRIPT")"
    fi
    PS_ARGS=("-Backend" "$BACKEND")
    if [[ $SEPARATE_WINDOWS -eq 1 ]]; then
        PS_ARGS+=("-SeparateWindows")
    fi
    exec powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PS_SCRIPT" "${PS_ARGS[@]}"
elif command -v pwsh &>/dev/null; then
    PS_ARGS=("-Backend" "$BACKEND")
    if [[ $SEPARATE_WINDOWS -eq 1 ]]; then
        PS_ARGS+=("-SeparateWindows")
    fi
    exec pwsh -NoProfile -File "$SCRIPT_DIR/start-dev.ps1" "${PS_ARGS[@]}"
fi

# Native Linux / POSIX fallback (e.g. running directly inside Linux container or VM)
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend-$BACKEND"

echo "Starting ChatterBase development services (Backend: $BACKEND)..."

if [[ "$BACKEND" == "go" ]]; then
    BACKEND_CMD="air || go run main.go"
else
    BACKEND_CMD="npm run dev"
fi

# Check for tmux
if command -v tmux &>/dev/null; then
    SESSION="chatterbase-dev"
    tmux new-session -d -s "$SESSION" -n "frontend" "cd '$FRONTEND_DIR' && npm run dev"
    tmux new-window -t "$SESSION" -n "redis" "redis-server"
    tmux new-window -t "$SESSION" -n "backend" "cd '$BACKEND_DIR' && sleep 2 && ($BACKEND_CMD)"
    echo "Started tmux session: $SESSION. Attach with: tmux attach -t $SESSION"
    exit 0
fi

# Background processes fallback
(cd "$FRONTEND_DIR" && npm run dev) &
redis-server &
sleep 2
(cd "$BACKEND_DIR" && eval "$BACKEND_CMD") &

wait
