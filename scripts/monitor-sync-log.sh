#!/bin/bash

# Monitor Fivetran sync log - shows every sync cycle
# Run this in a terminal while pnpm dev is running

echo "Starting Fivetran sync log monitor (press Ctrl+C to stop)..."
echo ""

while true; do
  echo ""
  echo "--- $(date) ---"
  
  # Query sync log
  curl -s http://localhost:3000/api/fivetran/rewards \
    | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(f\"syncId: {d.get('syncId','')[:8]}  totalRecords: {d.get('totalRecords')}  at: {d.get('timestamp')}\")
for c in d.get('connectors', []):
    print(f\"  {c['source']:<12} upserted={c['recordsUpserted']}  ms={c['durationMs']}\")
"
  
  sleep 10
done
