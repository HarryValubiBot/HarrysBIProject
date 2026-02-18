#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/create_star_schema.js >/dev/null
echo "Starting API on :8787"
node backend/server.js &
API_PID=$!
trap 'kill $API_PID' EXIT
echo "Starting web app on :8080"
python3 -m http.server 8080
