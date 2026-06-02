#!/usr/bin/env python3
"""
Fivetran MCP Server for Omni-Wallet

Exposes Fivetran connector management and sync operations as MCP tools
for Gemini AI to control data pipeline freshness and trigger on-demand syncs.
"""

import os
import json
import asyncio
import httpx
from typing import Any, Dict
from datetime import datetime

# MCP Server setup (uses stdio transport)
from mcp.server import Server
from mcp.types import Tool, TextContent, ToolResponse

# Add after the existing imports at the top
import pymongo
from bson import ObjectId

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/omni-wallet")

def get_mongo_db():
    client = pymongo.MongoClient(MONGODB_URI)
    return client["omni-wallet"]


# Fivetran API configuration
FIVETRAN_API_KEY = os.environ.get("FIVETRAN_API_KEY")
FIVETRAN_API_BASE = "https://api.fivetran.com/v1"

# Connector ID mappings for Omni-Wallet sources
CONNECTORS = {
    "airline": os.environ.get("FIVETRAN_AIRLINE_CONNECTOR_ID"),
    "bank": os.environ.get("FIVETRAN_BANK_CONNECTOR_ID"),
    "hotel": os.environ.get("FIVETRAN_HOTEL_CONNECTOR_ID"),
    "rewards": os.environ.get("FIVETRAN_REWARDS_CONNECTOR_ID"),
}


async def call_fivetran_api(
    method: str,
    endpoint: str,
    payload: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """
    Call Fivetran REST API with proper authentication.
    
    Args:
        method: HTTP method (GET, POST, etc.)
        endpoint: API endpoint path (e.g. "/connectors/{id}/force")
        payload: Optional JSON payload for POST/PATCH requests
    
    Returns:
        JSON response from Fivetran API
    """
    headers = {
        "Authorization": f"Bearer {FIVETRAN_API_KEY}",
        "Content-Type": "application/json"
    }
    
    url = f"{FIVETRAN_API_BASE}{endpoint}"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        if method == "GET":
            response = await client.get(url, headers=headers)
        elif method == "POST":
            response = await client.post(url, headers=headers, json=payload)
        elif method == "PATCH":
            response = await client.patch(url, headers=headers, json=payload)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return response.json()


async def refresh_rates() -> Dict[str, Any]:
    """
    Sync award charts and exchange rates BEFORE Gemini scores spending.
    
    Stage 2 of OP interchange: Fivetran syncs live rates from APIs
    into MongoDB before the agent touches user balances. This ensures
    Gemini only reasons on fresh data.
    
    Returns:
        Sync status with rate freshness confirmation
    """
    results = {}
    
    # Sync rates sources (typically lower priority/fast)
    for src in ["airline", "rewards", "bank"]:
        connector_id = CONNECTORS.get(src)
        if not connector_id:
            results[src] = {"error": "Connector not configured"}
            continue
        
        try:
            response = await call_fivetran_api(
                "POST",
                f"/connectors/{connector_id}/force"
            )
            
            sync_data = response.get("data", {})
            results[src] = {
                "status": sync_data.get("status", {}).get("sync_state", "unknown"),
                "triggered_at": datetime.now().isoformat(),
                "connector_id": connector_id,
                "data_type": "rates"
            }
        except Exception as e:
            results[src] = {"error": str(e)}
    
    return {
        "success": all("error" not in v for v in results.values()),
        "rates_synced": results,
        "stage": "pre_gemini_scoring"
    }


async def refresh_user_data(source: str | None = None) -> Dict[str, Any]:
    """
    Force-sync user bank/airline/hotel data before fetching balances.
    
    Triggered by Gemini when user requests fresh rewards/miles data.
    
    Args:
        source: Optional specific source to sync (airline, bank, hotel, rewards)
                If None, syncs all connectors
    
    Returns:
        Sync status for each connector
    """
    results = {}
    
    sources_to_sync = [source] if source and source in CONNECTORS else list(CONNECTORS.keys())
    
    for src in sources_to_sync:
        connector_id = CONNECTORS.get(src)
        if not connector_id:
            results[src] = {"error": "Connector not configured"}
            continue
        
        try:
            response = await call_fivetran_api(
                "POST",
                f"/connectors/{connector_id}/force"
            )
            
            sync_data = response.get("data", {})
            results[src] = {
                "status": sync_data.get("status", {}).get("sync_state", "unknown"),
                "triggered_at": datetime.now().isoformat(),
                "connector_id": connector_id
            }
        except Exception as e:
            results[src] = {"error": str(e)}
    
    return {
        "success": all("error" not in v for v in results.values()),
        "syncs": results
    }


async def get_sync_status(source: str | None = None) -> Dict[str, Any]:
    """
    Check when connector data was last synced.
    
    Gemini uses this before fetching balances to determine if data is fresh.
    If data is >2 hours old, Gemini can trigger a refresh.
    
    Args:
        source: Specific source (airline, bank, hotel, rewards)
                If None, checks all
    
    Returns:
        Sync status with last sync timestamp and freshness
    """
    results = {}
    
    sources_to_check = [source] if source and source in CONNECTORS else list(CONNECTORS.keys())
    
    for src in sources_to_check:
        connector_id = CONNECTORS.get(src)
        if not connector_id:
            results[src] = {"error": "Connector not configured"}
            continue
        
        try:
            response = await call_fivetran_api(
                "GET",
                f"/connectors/{connector_id}"
            )
            
            data = response.get("data", {})
            last_sync = data.get("succeeded_at")
            status = data.get("status", {}).get("sync_state", "unknown")
            
            # Calculate freshness
            if last_sync:
                last_sync_dt = datetime.fromisoformat(last_sync.replace("Z", "+00:00"))
                now = datetime.now(last_sync_dt.tzinfo)
                hours_ago = (now - last_sync_dt).total_seconds() / 3600
            else:
                hours_ago = None
            
            results[src] = {
                "last_sync": last_sync,
                "status": status,
                "hours_ago": hours_ago,
                "is_fresh": hours_ago < 2 if hours_ago else False,
                "connector_id": connector_id
            }
        except Exception as e:
            results[src] = {"error": str(e)}
    
    return {
        "success": all("error" not in v for v in results.values()),
        "sync_status": results
    }


async def sync_after_redemption(sources: list[str], action: str = "redemption") -> Dict[str, Any]:
    """
    Trigger UVU balance reconciliation sync after a user action.

    Called after a user redeems points/miles or earns rewards to ensure
    the consolidated UVU balance reflects the latest changes.

    Args:
        sources: List of data sources to resync (airline, bank, hotel, rewards)
        action: Context for the sync (redemption, transfer, earning)

    Returns:
        Sync trigger confirmation for all sources
    """
    results: Dict[str, Any] = {}

    for source in sources:
        connector_id = CONNECTORS.get(source)
        if not connector_id:
            results[source] = {"error": f"Unknown source: {source}"}
            continue

        try:
            response = await call_fivetran_api(
                "POST",
                f"/connectors/{connector_id}/force"
            )

            results[source] = {
                "success": True,
                "connector_id": connector_id,
                "response": response,
            }
        except Exception as e:
            results[source] = {"error": str(e)}

    return {
        "success": all("error" not in r for r in results.values()),
        "sources": sources,
        "action": action,
        "triggered_at": datetime.now().isoformat(),
        "results": results,
    }


async def list_connectors() -> Dict[str, Any]:
    """
    List all configured Fivetran connectors for Omni-Wallet.
    
    Returns:
        List of connector IDs, sources, and their current status
    """
    connectors_info = {}
    
    for source, connector_id in CONNECTORS.items():
        if not connector_id:
            connectors_info[source] = {"status": "not_configured"}
            continue
        
        try:
            response = await call_fivetran_api("GET", f"/connectors/{connector_id}")
            data = response.get("data", {})
            
            connectors_info[source] = {
                "connector_id": connector_id,
                "status": data.get("status", {}).get("sync_state", "unknown"),
                "created_at": data.get("created_at"),
                "last_successful_sync": data.get("succeeded_at"),
                "paused": data.get("paused", False)
            }
        except Exception as e:
            connectors_info[source] = {
                "connector_id": connector_id,
                "error": str(e)
            }
    
    return {
        "connectors": connectors_info,
        "configured": sum(1 for cid in CONNECTORS.values() if cid)
    }


async def get_connector_logs(source: str, limit: int = 10) -> Dict[str, Any]:
    """
    Fetch recent sync logs for a connector.

    Useful for debugging sync failures or understanding data freshness.

    Args:
        source: Data source (airline, bank, hotel, rewards)
        limit: Number of recent logs to fetch

    Returns:
        List of recent sync logs
    """
    connector_id = CONNECTORS.get(source)
    if not connector_id:
        return {"error": f"Unknown source: {source}"}

    try:
        response = await call_fivetran_api(
            "GET",
            f"/connectors/{connector_id}/logs?limit={limit}"
        )

        logs = response.get("data", {}).get("logs", [])
        return {
            "source": source,
            "connector_id": connector_id,
            "logs": logs[-limit:] if logs else []
        }
    except Exception as e:
        return {
            "error": str(e),
            "source": source
        }


async def get_user_balances(user_id: str) -> Dict[str, Any]:
    """
    [STAGE 3] Fetch all raw card balances from MongoDB.
    Called by Gemini after refresh_rates() confirms data is fresh.
    Converts raw points/miles/cash to OP using current rates.
    """
    db = get_mongo_db()
    user = db.users.find_one({"email": user_id}) or db.users.find_one({"_id": ObjectId(user_id)})

    if not user:
        return {"error": f"User not found: {user_id}"}

    cards = user.get("portfolio", {}).get("cards", {
        "skyward":   {"miles": 60000},
        "goldFork":  {"points": 30000},
        "clearCash": {"cash": 150},
    })

    # Fetch live rates from MongoDB rates collection
    rates_doc = db.rates.find_one({"source": "current"}) or {}
    rates = rates_doc.get("values", {
        "skyward": 1.5,
        "goldFork": 1.5,
        "clearCash": 100,
    })

    skyward_miles  = cards.get("skyward", {}).get("miles", 0)
    goldfork_pts   = cards.get("goldFork", {}).get("points", 0)
    clearcash_cash = cards.get("clearCash", {}).get("cash", 0)

    total_op = (
        skyward_miles * rates["skyward"] +
        goldfork_pts  * rates["goldFork"] +
        clearcash_cash * rates["clearCash"]
    )

    return {
        "skyward":   {"miles": skyward_miles,  "rateOp": rates["skyward"]},
        "goldFork":  {"points": goldfork_pts,  "rateOp": rates["goldFork"]},
        "clearCash": {"cash": clearcash_cash,  "rateOp": rates["clearCash"]},
        "totalOp":   total_op,
        "lastSync":  datetime.now().isoformat(),
    }


async def update_balances(user_id: str, card_debits: Dict[str, Any]) -> Dict[str, Any]:
    """
    [STAGE 5] Apply raw per-card debits after Gemini's OP allocation.
    Converts OP back to native units and writes to MongoDB atomically.
    """
    db = get_mongo_db()

    inc_ops = {}
    if "clearCash" in card_debits:
        inc_ops["portfolio.cards.clearCash.cash"]    = -card_debits["clearCash"]["cashDebit"]
    if "goldFork" in card_debits:
        inc_ops["portfolio.cards.goldFork.points"]   = -card_debits["goldFork"]["pointsDebit"]
    if "skyward" in card_debits:
        inc_ops["portfolio.cards.skyward.miles"]     = -card_debits["skyward"]["milesDebit"]

    result = db.users.update_one(
        {"$or": [{"email": user_id}, {"_id": ObjectId(user_id)}]},
        {
            "$inc": inc_ops,
            "$set": {"portfolio.lastSyncTime": datetime.now()},
        },
    )

    if result.matched_count == 0:
        return {"error": f"User not found: {user_id}"}

    return {
        "success": True,
        "debitsApplied": card_debits,
        "timestamp": datetime.now().isoformat(),
    }


async def sync_reward_networks(source: str | None = None) -> Dict[str, Any]:
    """
    Proxy to the Next.js Fivetran rewards connector.
    Triggers a sync of Cardlytics, Visa/MC, and Rakuten/Impact mock APIs into MongoDB.
    """
    next_url = os.environ.get("NEXTAUTH_URL", "http://localhost:3000")
    payload = {}
    if source:
        # map legacy single-source string to the array format the TS route expects
        source_map = {
            "cardlytics": "cardlytics",
            "visa_mastercard": "network",
            "affiliate": "affiliate",
            "rewards": None,  # None = sync all
        }
        mapped = source_map.get(source)
        if mapped:
            payload["sources"] = [mapped]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{next_url}/api/fivetran/rewards",
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_reward_offers(
    layer: str = "all",
    category: str | None = None,
    network: str | None = None,
    country: str | None = None,
    min_cashback: float | None = None,
    min_epc: float | None = None,
) -> Dict[str, Any]:
    """
    Query active rewards offers from MongoDB via the Next.js offers API.
    """
    next_url = os.environ.get("NEXTAUTH_URL", "http://localhost:3000")
    params: Dict[str, str] = {"layer": layer}
    if category:    params["category"] = category
    if network:     params["network"] = network
    if country:     params["country"] = country
    if min_cashback is not None: params["minCashback"] = str(min_cashback)
    if min_epc is not None:      params["minEpc"] = str(min_epc)

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{next_url}/api/rewards/offers",
                params=params,
            )
            resp.raise_for_status()
            return resp.json()
    except Exception as e:
        return {"error": str(e)}


# Initialize MCP Server
server = Server("omni-wallet-fivetran")


@server.list_tools()
async def list_tools() -> list[Tool]:
    """Expose all Fivetran tools to Gemini."""
    return [
        Tool(
            name="refresh_rates",
            description="[STAGE 2] Sync live award charts and exchange rates from APIs into MongoDB BEFORE Gemini scores spending. This is the critical first step to ensure fresh data.",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="refresh_user_data",
            description="Force-sync bank/airline/hotel data before fetching user balances. Called when user requests fresh rewards/miles data.",
            inputSchema={
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "enum": ["airline", "bank", "hotel", "rewards"],
                        "description": "Specific source to sync. If not provided, syncs all connectors."
                    }
                }
            }
        ),
        Tool(
            name="get_sync_status",
            description="Check when connector data was last synced and if it's fresh (<2 hours old). Use before recommending rewards.",
            inputSchema={
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "enum": ["airline", "bank", "hotel", "rewards"],
                        "description": "Specific source to check. If not provided, checks all."
                    }
                }
            }
        ),
        Tool(
            name="sync_after_redemption",
            description="Trigger UVU balance reconciliation sync after a user redeems points or transfers miles. Accepts array of sources.",
            inputSchema={
                "type": "object",
                "properties": {
                    "sources": {
                        "type": "array",
                        "items": {"type": "string", "enum": ["airline", "bank", "hotel", "rewards"]},
                        "description": "List of data sources to resync after the action."
                    },
                    "action": {
                        "type": "string",
                        "description": "Context (redemption, transfer, earning, etc.)"
                    }
                },
                "required": ["sources"]
            }
        ),
        Tool(
            name="list_connectors",
            description="List all configured Fivetran connectors and their current status.",
            inputSchema={"type": "object", "properties": {}}
        ),
        Tool(
            name="get_connector_logs",
            description="Fetch recent sync logs for troubleshooting connector failures.",
            inputSchema={
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "enum": ["airline", "bank", "hotel", "rewards"],
                        "description": "Data source to fetch logs for."
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of recent logs to fetch (default: 10)"
                    }
                },
                "required": ["source"]
            }
        ),
        Tool(
            name="getUserBalances",
            description="[STAGE 3] Fetch all raw card balances from MongoDB after rates are confirmed fresh. Returns miles, points, cash with OP conversion rates.",
            inputSchema={
                "type": "object",
                "properties": {
                    "userId": {
                        "type": "string",
                        "description": "User email or MongoDB _id"
                    }
                },
                "required": ["userId"]
            }
        ),
        Tool(
            name="updateBalances",
            description="[STAGE 5] Apply per-card raw debits after Gemini OP allocation. Writes atomically to MongoDB.",
            inputSchema={
                "type": "object",
                "properties": {
                    "userId": {"type": "string"},
                    "cardDebits": {
                        "type": "object",
                        "properties": {
                            "clearCash": {"type": "object", "properties": {"cashDebit":    {"type": "number"}}},
                            "goldFork":  {"type": "object", "properties": {"pointsDebit": {"type": "number"}}},
                            "skyward":   {"type": "object", "properties": {"milesDebit":  {"type": "number"}}},
                        }
                    }
                },
                "required": ["userId", "cardDebits"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> ToolResponse:
    """Handle tool calls from Gemini."""
    try:
        if name == "refresh_rates":
            result = await refresh_rates()
        elif name == "refresh_user_data":
            result = await refresh_user_data(
                source=arguments.get("source")
            )
        elif name == "get_sync_status":
            result = await get_sync_status(
                source=arguments.get("source")
            )
        elif name == "sync_after_redemption":
            result = await sync_after_redemption(
                sources=arguments["sources"],
                action=arguments.get("action", "redemption")
            )
        elif name == "list_connectors":
            result = await list_connectors()
        elif name == "get_connector_logs":
            result = await get_connector_logs(
                source=arguments["source"],
                limit=arguments.get("limit", 10)
            )
        elif name == "getUserBalances":
            result = await get_user_balances(arguments["userId"])
        elif name == "updateBalances":
            result = await update_balances(arguments["userId"], arguments["cardDebits"])
        elif name == "sync_reward_networks":
            result = await sync_reward_networks(arguments.get("source"))
        elif name == "get_reward_offers":
            result = await get_reward_offers(
                layer=arguments.get("layer", "all"),
                category=arguments.get("category"),
                network=arguments.get("network"),
                country=arguments.get("country"),
                min_cashback=arguments.get("minCashback"),
                min_epc=arguments.get("minEpc")
            )
        elif name == "get_best_offer_for_merchant":
            result = await get_best_offer_for_merchant(
                merchant_name=arguments["merchantName"],
                card_networks=arguments.get("cardNetworks")
            )
        else:
            result = {"error": f"Unknown tool: {name}"}
        
        return ToolResponse(
            content=[TextContent(type="text", text=json.dumps(result, indent=2))]
        )
    
    except Exception as e:
        return ToolResponse(
            content=[TextContent(type="text", text=json.dumps({"error": str(e)}))]
        )


async def main():
    """Run the MCP server."""
    async with server:
        print("Omni-Wallet Fivetran MCP Server running on stdio...")
        await server.run()


if __name__ == "__main__":
    asyncio.run(main())
