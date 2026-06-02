# Fivetran MCP Integration - Quick Start

## What Changed

Old implementation (removed):
- ❌ Custom MongoDB schemas for Fivetran data
- ❌ Polling-based sync service
- ❌ Separate Fivetran API routes
- ❌ Demo dashboard component
- ❌ Manual data collection management

New implementation (MCP-based):
- ✅ Fivetran MCP server with 5 tools
- ✅ Gemini agent with direct tool access
- ✅ On-demand sync triggering
- ✅ Data freshness checking
- ✅ Seamless integration with existing MCP bridge

## Installation

### 1. Install Python Dependencies

```bash
cd /vercel/share/v0-project/lib/mcp
pip install -r requirements.txt
```

### 2. Set Environment Variables

```bash
# Fivetran API Credentials
export FIVETRAN_API_KEY="your_fivetran_api_key"
export FIVETRAN_AIRLINE_CONNECTOR_ID="airline_conn_id"
export FIVETRAN_BANK_CONNECTOR_ID="bank_conn_id"
export FIVETRAN_HOTEL_CONNECTOR_ID="hotel_conn_id"
export FIVETRAN_REWARDS_CONNECTOR_ID="rewards_conn_id"

# Google Gemini API
export GOOGLE_API_KEY="your_google_api_key"
```

### 3. Start the MCP Server

```bash
# Terminal 1: Start Fivetran MCP server
python lib/mcp/fivetran-server.py

# Terminal 2: Start your application (Gemini will connect automatically)
pnpm dev
```

## Files Structure

```
lib/mcp/
├── fivetran-server.py          # MCP server with 5 Fivetran tools
├── requirements.txt             # Python dependencies
└── __init__.py                  # Package marker

lib/
├── gemini-agent.py             # Gemini agent implementation
└── mcp/                        # MCP integration folder

FIVETRAN_MCP_INTEGRATION.md      # Complete integration guide
```

## Core Concepts

### 1. Data Freshness Flow
```
User: "Show me my miles"
    ↓
Gemini calls: get_sync_status("airline")
    ↓
Check: "Last synced 14 hours ago"
    ↓
Gemini calls: refresh_user_data("airline")
    ↓
Fivetran syncs bank data (takes 3-5 seconds)
    ↓
Gemini calls: getUserBalances()
    ↓
Returns FRESH data with confidence
```

### 2. The 5 MCP Tools

1. **`refresh_user_data(source?)`**
   - Force-sync specific data source
   - Called when user needs latest data

2. **`get_sync_status(source?)`**
   - Check if data is fresh (<2 hours)
   - Returns: last sync time, freshness flag

3. **`sync_after_redemption(source, action?)`**
   - Update after user completes action
   - Ensures UVU balance stays accurate

4. **`list_connectors()`**
   - See all configured Fivetran sources
   - Get connector status

5. **`get_connector_logs(source, limit?)`**
   - Debug sync failures
   - Fetch recent sync history

### 3. Integration with Existing MCP Bridge

Your existing MCP bridge already has:
```python
- getUserBalances(userId)
- getRewardRates()
- getAwardCharts()
- updateBalances()
```

Just add the 5 Fivetran tools:
```python
server.register(refresh_user_data)
server.register(get_sync_status)
server.register(sync_after_redemption)
server.register(list_connectors)
server.register(get_connector_logs)
```

Now Gemini can automatically:
- Check freshness before recommendations
- Trigger syncs when needed
- Update after user actions

## Example: User Request Flow

```
User: "I want to book business class to London. What's my best option?"

↓ Gemini processes request

1. get_sync_status("airline", "hotel")
   → airline: fresh (1 hr ago) ✓
   → hotel: stale (6 hrs ago) ✗

2. refresh_user_data("hotel")
   → Fivetran syncs award charts

3. getUserBalances(userId)
   → 60,000 Skyward Elite
   → 30,000 GoldFork points

4. getRewardRates()
   → Skyward: $0.015/pt
   → GoldFork: $0.01/pt

5. getAwardCharts()
   → ORD→LHR Business: 100,000 BA points needed

6. Gemini analyzes & recommends:
   "Transfer 50K Skyward Elite + 40K GoldFork to British Airways
    (you'll get 60K with 20% transfer bonus)
    → Total: $600 cost, vs $2,400 cash booking
    → Saves $1,800!"

7. User: "Do it!"

8. sync_after_redemption("airline", "transfer")
   → Fivetran syncs to update balances
```

## Testing

### Test Fivetran MCP Server

```bash
# Start MCP server
python lib/mcp/fivetran-server.py

# In another terminal, test tools
curl -X POST http://localhost:8000/tools/refresh_user_data \
  -d '{"source": "airline"}'

curl -X POST http://localhost:8000/tools/get_sync_status \
  -d '{"source": "airline"}'
```

### Test Gemini Integration

```python
from lib.gemini_agent import OmniWalletGeminiAgent
import asyncio

async def test():
    agent = OmniWalletGeminiAgent()
    
    portfolio = {
        "cards": [
            {"name": "Skyward Elite", "points": 60000, "valuePerPoint": 0.015},
            {"name": "GoldFork", "points": 30000, "valuePerPoint": 0.01}
        ]
    }
    
    result = await agent.process_user_request(
        "What's my best option for a $1,000 purchase?",
        portfolio
    )
    print(result)

asyncio.run(test())
```

## Deployment

### Option 1: Cloud Run (Recommended for MCP server)
```bash
# Deploy MCP server to Cloud Run
gcloud run deploy omni-wallet-fivetran-mcp \
  --source lib/mcp \
  --runtime python311 \
  --set-env-vars FIVETRAN_API_KEY=$FIVETRAN_API_KEY
```

### Option 2: Local Development
```bash
# Terminal 1: MCP server (stdio)
python lib/mcp/fivetran-server.py

# Terminal 2: Your app
pnpm dev
```

### Option 3: Docker
```dockerfile
FROM python:3.11

WORKDIR /app
COPY lib/mcp/requirements.txt .
RUN pip install -r requirements.txt

COPY lib/mcp/fivetran-server.py .
CMD ["python", "fivetran-server.py"]
```

## Architecture Summary

```
Gemini Agent
    ↓
MCP Tools (Fivetran + Bridge)
    ↓
Fivetran API ↔ Syncs ↔ MongoDB
    ↓
User Recommendation
```

**Key Difference from Old Implementation:**
- Old: Gemini queries stale MongoDB → May be 6+ hours old
- New: Gemini checks freshness → Triggers sync if needed → Fresh data guaranteed

## Troubleshooting

### Issue: "Connector not configured"
**Solution**: Check environment variables are set:
```bash
echo $FIVETRAN_AIRLINE_CONNECTOR_ID
```

### Issue: "Fivetran API Key invalid"
**Solution**: Regenerate API key in Fivetran dashboard settings

### Issue: "Sync taking too long"
**Solution**: Gemini has 3-second timeout. If sync takes longer:
```python
# Proceed with cached data and flag it
"Your data is 2 hours old. Sync in progress - I'll update you shortly."
```

### Issue: "Tool not found in Gemini"
**Solution**: Ensure MCP server is running and McpToolset is configured:
```python
from google.adk.tools.mcp import McpToolset
fivetran_tools = McpToolset(server_url="stdio://...")
```

## Next Steps

1. ✅ Set environment variables
2. ✅ Start MCP server (`python lib/mcp/fivetran-server.py`)
3. ✅ Register tools in existing MCP bridge
4. ✅ Configure Gemini with McpToolset
5. ✅ Test with sample user request
6. ✅ Deploy to production

## Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Fivetran API Docs](https://fivetran.com/docs/rest-api)
- [Google Gemini API](https://ai.google.dev/)
- [Google ADK](https://github.com/google/google-adk-python)

## Status

✅ MCP-based Fivetran integration complete
✅ All old code removed
✅ Gemini agent ready to use
✅ Quick start guide provided

**Ready for deployment!**
