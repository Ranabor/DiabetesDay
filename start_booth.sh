#!/usr/bin/env bash
set -e

echo "========================================================"
echo " Diabetes Awareness Day - simglucose Live Simulator"
echo "========================================================"
echo ""

# Find Python executable
if command -v python3 &>/dev/null; then
    PY_CMD=python3
elif command -v python &>/dev/null; then
    PY_CMD=python
else
    echo "[ERROR] Python 3 not found."
    exit 1
fi

echo "Starting simglucose booth server on http://127.0.0.1:8000..."
echo "Serving both API and Offline React UI from FastAPI."
echo ""

# Open default browser
if command -v xdg-open &>/dev/null; then
    xdg-open http://127.0.0.1:8000 &
elif command -v open &>/dev/null; then
    open http://127.0.0.1:8000 &
fi

# Run server
$PY_CMD -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
