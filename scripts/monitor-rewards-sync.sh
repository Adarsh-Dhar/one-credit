#!/bin/bash

# Monitor rewards sync - shows live drift in MongoDB
# Run this in a terminal while pnpm dev is running

echo "Starting rewards sync monitor (press Ctrl+C to stop)..."
echo "Make sure FIVETRAN_REWARDS_SYNC_INTERVAL_SECONDS is set in .env (default: 300s)"
echo ""

# Store previous state for comparison
PREV_STATE_FILE=$(mktemp)
echo "{}" > "$PREV_STATE_FILE"

while true; do
  echo ""
  echo "--- $(date) ---"

  # Query rewards offers via tools API
  response=$(curl -sL -w "\n%{http_code}" -X POST http://localhost:3000/api/tools/execute \
    -H "Content-Type: application/json" \
    -d '{"toolName": "get_rewards_offers", "toolInput": {"category": "dining"}}')

  # Extract HTTP code (last line) and body (everything except last line)
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" != "200" ]; then
    echo "Error: HTTP $http_code"
    echo "Response: $body"
  else
    # Process and compare with previous state
    echo "$body" | python3 -c "
import json, sys
from datetime import datetime

try:
    data = json.load(sys.stdin)
    if 'error' in data:
        print(f\"Error: {data['error']}\")
    else:
        # Load previous state
        with open('$PREV_STATE_FILE', 'r') as f:
            prev_state = json.load(f)
        
        # Build current state map
        curr_state = {}
        for o in data.get('offers', []):
            key = f\"{o['merchantName']}_{o['source']}\"
            curr_state[key] = {
                'merchantName': o['merchantName'],
                'source': o['source'],
                'rate': o['rewardRate'],
                'synced': o['lastSyncedAt']
            }
        
        # Detect changes
        changes_found = False
        
        # Check for new offers
        for key, curr in curr_state.items():
            if key not in prev_state:
                print(f\"[NEW] {curr['merchantName']:<25} {curr['source']:<12} rate={curr['rate']:.4f}  synced={curr['synced']}\")
                changes_found = True
        
        # Check for rate changes
        for key, curr in curr_state.items():
            if key in prev_state:
                prev = prev_state[key]
                if abs(curr['rate'] - prev['rate']) > 0.0001:
                    delta = curr['rate'] - prev['rate']
                    delta_str = f\"{delta:+.4f}\" if delta >= 0 else f\"{delta:.4f}\"
                    print(f\"[RATE CHANGE] {curr['merchantName']:<25} {curr['source']:<12} {prev['rate']:.4f} → {curr['rate']:.4f} ({delta_str})  synced={curr['synced']}\")
                    changes_found = True
        
        # Check for removed offers
        for key, prev in prev_state.items():
            if key not in curr_state:
                print(f\"[REMOVED] {prev['merchantName']:<25} {prev['source']:<12} rate={prev['rate']:.4f}\")
                changes_found = True
        
        if not changes_found:
            print(\"No changes detected\")
        
        # Save current state for next iteration
        with open('$PREV_STATE_FILE', 'w') as f:
            json.dump(curr_state, f)
        
except json.JSONDecodeError as e:
    print(f\"JSON decode error: {e}\")
    print(f\"Raw response: {sys.stdin.read()}\")
except Exception as e:
    print(f\"Error: {e}\")
"
  fi

  sleep 10
done
