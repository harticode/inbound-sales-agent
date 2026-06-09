#!/usr/bin/env bash
# Smoke-test a deployed instance. Usage: ./scripts/verify-deployment.sh https://your-app.up.railway.app
set -euo pipefail

BASE_URL="${1:-http://localhost}"
API_KEY="${API_KEY:-}"

echo "Checking health at ${BASE_URL}/api/health ..."
curl -sf "${BASE_URL}/api/health" | grep -q '"status":"ok"' && echo "  OK" || { echo "  FAIL"; exit 1; }

if [[ -n "$API_KEY" ]]; then
  echo "Checking metrics at ${BASE_URL}/api/metrics ..."
  curl -sf -H "X-API-Key: ${API_KEY}" "${BASE_URL}/api/metrics?period=today" > /dev/null && echo "  OK" || { echo "  FAIL"; exit 1; }
else
  echo "Skipping metrics check (set API_KEY to verify authenticated endpoints)"
fi

echo "All checks passed."
