#!/bin/bash

# Monitor rewards sync - shows live drift in MongoDB
# Run this in a terminal while pnpm dev is running

echo "Starting rewards sync monitor (press Ctrl+C to stop)..."
echo "Make sure FIVETRAN_REWARDS_SYNC_INTERVAL_SECONDS is set in .env (default: 300s)"
echo ""

while true; do
  echo ""
  echo "--- $(date) ---"

  # Query rewards offers via tools API
  response=$(curl -sL -w "\n%{http_code}" -X POST http://localhost:3000/api/tools/execute \
    -H "Content-Type: application/json" \
    -d '{"toolName": "get_rewards_offers", "toolInput": {"category": "dining", "limit": 3}}')

  # Extract HTTP code (last line) and body (everything except last line)
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" != "200" ]; then
    echo "Error: HTTP $http_code"
    echo "Response: $body"
  else
    echo "$body" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    if 'error' in data:
        print(f\"Error: {data['error']}\")
    else:
        for o in data.get('offers', []):
            print(f\"{o['merchantName']:<25} {o['source']:<12} rate={o['rewardRate']:.4f}  synced={o['lastSyncedAt']}\")
except json.JSONDecodeError as e:
    print(f\"JSON decode error: {e}\")
    print(f\"Raw response: {sys.stdin.read()}\")
"
  fi

  sleep 10
done
