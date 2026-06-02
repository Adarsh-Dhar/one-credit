# Fivetran MCP Integration — OP Token Interchange Flow

## Overview

This document describes how Fivetran's MCP tools integrate with Gemini AI to power the **OP Token Interchange** system—the core spending mechanism of Omni-Wallet. When a user says "I want to spend $500 on electronics," Gemini executes a precise 6-stage flow that ensures optimal card selection, fresh data, and automatic balance reconciliation.

## The OP Token Interchange: 6-Stage Flow

```
User: "Spend $500 on electronics"
    ↓
STAGE 1: Parse Intent
    Amount: $500 = 50,000 OP (1 OP = $0.01)
    Category: electronics
    ↓
STAGE 2: Fivetran Syncs Rates ⭐ CRITICAL
    refresh_rates() MCP tool
    → Syncs award charts + exchange rates into MongoDB
    → Rates confirmed fresh BEFORE balance analysis
    ↓
STAGE 3: Gemini Reads Balances in OP
    getUserBalances() MCP tool
    → Returns: 60K Skyward + 30K GoldFork + $150 ClearCash
    → Converts to OP: 150,000 OP total
    ↓
STAGE 4: Score Cards by Category
    For "electronics":
    • ClearCash: 3.0 OP/$ (3% cash back) ← Best
    • GoldFork: 1.125 OP/$ (1.125% earn)
    • Skyward: 1.0 OP/$ (baseline)
    → Greedy allocation: highest score first
    ↓
STAGE 5: Debit OP → Update Raw Balances
    updateBalances() MCP tool
    Convert back from OP to raw points/cash:
    • ClearCash: $150 debited
    • GoldFork: 23,333 points debited (from 35K OP)
    ↓
STAGE 6: Fivetran Re-Syncs After Redemption
    sync_after_redemption() MCP tool
    → Affected connectors re-synced
    → MongoDB auto-reconciles in background
    ↓
Result: "Done! 50,000 OP spent. Wallet: 100,000 OP remaining ($1,000)"
```

---

## Stage-by-Stage Details

### Stage 1: Parse Intent

**What happens:**
- User provides: Dollar amount + category
- Gemini converts: USD → OP (multiply by 100)
- Example: "$500 on electronics" → "50,000 OP needed"

**No MCP call needed** — pure parsing

### Stage 2: Fivetran Syncs Rates ⭐ CRITICAL

**MCP Tool**: `refresh_rates()`

**Why critical:** Gemini MUST reason only on fresh exchange rates and award charts. If rates are stale, card scoring is wrong.

```python
result = await refresh_rates()
# Syncs:
# - Award charts (flight redemption rates)
# - Exchange rates (point valuations)
# - Transfer bonuses (active promotions)
# Into MongoDB for Gemini to use

# Returns:
{
  "success": true,
  "rates_synced": {
    "airline": {
      "status": "completed",
      "triggered_at": "2026-06-02T14:23:15Z",
      "data_type": "rates"
    },
    "rewards": {...},
    "bank": {...}
  },
  "stage": "pre_gemini_scoring"
}
```

**Critical behavior:** This blocks Stage 3 — Gemini waits for completion before proceeding.

### Stage 3: Gemini Reads Balances in OP

**MCP Tool**: `getUserBalances()` (existing tool)

```python
raw_balances = await getUserBalances(userId)
# Returns:
{
  "skyward": {"miles": 60000},
  "goldFork": {"points": 30000},
  "clearCash": {"cash": 150}
}

# Using rates from Stage 2, Gemini converts to OP:
# - Skyward 60K miles @ 1.5 OP/mile = 90,000 OP
# - GoldFork 30K pts @ 1.5 OP/pt = 45,000 OP
# - ClearCash $150 = 15,000 OP (1 OP = $0.01)
# TOTAL: 150,000 OP wallet
```

**Gemini's internal state at this point:**
```
spend_needed: 50,000 OP
wallet_total: 150,000 OP
available: YES (50K < 150K)
```

### Stage 4: Score Cards by Category

**No MCP call** — Gemini calculates locally using synced rates

For "electronics", rank each card by OP per dollar:

| Card | Rate | Reason |
|------|------|--------|
| ClearCash | 3.0 OP/$ | 3% flat cash back |
| GoldFork | 1.125 OP/$ | 1.125% baseline earn |
| Skyward | 1.0 OP/$ | 1x miles earn (lowest for non-travel) |

**Greedy allocation (use highest-scoring first):**

1. ClearCash: $150 available = 15,000 OP
   - Need: 50,000 OP
   - ClearCash covers: 15,000 OP ✓
   - Remaining: 35,000 OP

2. GoldFork: 30,000 points available = 45,000 OP
   - Need: 35,000 OP
   - GoldFork covers: 35,000 OP ✓
   - Remaining: 0 OP

**Total covered:** 50,000 OP ✓

**Card allocation:**
- ClearCash: 15,000 OP (entire balance)
- GoldFork: 35,000 OP (of 45,000 available)
- Skyward: 0 OP (not needed)

### Stage 5: Debit OP → Update Raw Balances

**MCP Tool**: `updateBalances(card_debits)`

Convert OP amounts back to raw card units:

```python
card_debits = {
  "clearCash": {
    "cashDebit": 150  # 15,000 OP ÷ 100 = $150
  },
  "goldFork": {
    "pointsDebit": 23333  # 35,000 OP ÷ 1.5 rate = ~23,333 points
  },
  "skyward": {
    "milesDebit": 0  # Not used
  }
}

result = await updateBalances(userId, card_debits)
# Returns:
{
  "success": true,
  "debitsApplied": {
    "clearCash": {"cashDebit": 150},
    "goldFork": {"pointsDebit": 23333},
    "skyward": {"milesDebit": 0}
  },
  "stage": "post_scoring"
}
```

**Critical:** User only sees "50,000 OP spent" — raw card details are hidden.

### Stage 6: Fivetran Re-Syncs After Redemption

**MCP Tool**: `sync_after_redemption(source)`

```python
# Resync each affected source
await sync_after_redemption("bank")      # ClearCash
await sync_after_redemption("rewards")   # GoldFork

# Returns:
{
  "success": true,
  "source": "bank",
  "triggered_at": "2026-06-02T14:23:20Z",
  "message": "Sync triggered for bank after redemption"
}
```

**What happens:**
- Fivetran re-pulls latest ClearCash balance from bank APIs
- Fivetran re-pulls latest GoldFork points from rewards APIs
- MongoDB is automatically updated in background
- Next user check shows reconciled balances

---

## Scoring Rules by Category

### Travel (Flights/Hotels)
```
Skyward: 1.5 OP/$  ← Best for travel (specialized redemption)
GoldFork: 1.0 OP/$
ClearCash: 2.0 OP/$ (as fallback)
```
**Reason:** Skyward specializes in premium travel redemptions

### Dining
```
GoldFork: 1.5 OP/$ ← Best (5x earning = 1.5 OP/$)
Skyward: 1.0 OP/$
ClearCash: 2.0 OP/$
```
**Reason:** GoldFork earns 5x points on dining

### Cash-Back Categories (Electronics, Gas, Groceries)
```
ClearCash: 3.0 OP/$ ← Best (3% flat rate)
GoldFork: 1.125 OP/$ (1.125% baseline)
Skyward: 1.0 OP/$ (generic points)
```
**Reason:** ClearCash has highest cash back for non-travel

### General Spend
```
ClearCash: 2.0 OP/$ (2% cash back)
GoldFork: 1.125 OP/$ (1.125% baseline)
Skyward: 1.0 OP/$
```

---

## MCP Tools Reference

### 1. refresh_rates()
**Stage**: 2 (CRITICAL — before all scoring)

Syncs live rates BEFORE Gemini touches any balances.

```python
await refresh_rates()
# Syncs: award charts, exchange rates, transfer bonuses
# Returns: Confirmation rates are fresh in MongoDB
```

### 2. getUserBalances(userId)
**Stage**: 3 (fetch raw balances)

Returns all raw balances (miles, points, cash) in native format.

```python
await getUserBalances(userId)
# Returns: {skyward: {miles: 60000}, goldFork: {points: 30000}, ...}
```

### 3. updateBalances(userId, card_debits)
**Stage**: 5 (execute debit)

Updates raw balances with per-card debits (converted from OP).

```python
await updateBalances(userId, {
  "clearCash": {"cashDebit": 150},
  "goldFork": {"pointsDebit": 23333},
  "skyward": {"milesDebit": 0}
})
```

### 4. sync_after_redemption(source)
**Stage**: 6 (background reconciliation)

Triggers Fivetran re-sync for affected connector(s).

```python
await sync_after_redemption("bank")      # ClearCash
await sync_after_redemption("rewards")   # GoldFork
```

### 5. get_sync_status(source)
**Purpose**: Verification tool (optional)

Gemini can check if rates are fresh before Stage 2.

```python
status = await get_sync_status("bank")
# Returns: {is_fresh: true, hours_ago: 0.5, last_sync: "..."}
```

---

## Implementation in Gemini Agent

The `OmniWalletGeminiAgent` class provides:

### Method: `execute_op_interchange()`

Executes the full 6-stage flow:

```python
result = await agent.execute_op_interchange(
    spend_amount_usd=500,
    spend_category="electronics",
    portfolio_data={
        "skyward": {"miles": 60000},
        "goldFork": {"points": 30000},
        "clearCash": {"cash": 150}
    }
)
# Returns: Stage-by-stage execution log + new portfolio state
```

### System Prompt Includes

- Full 6-stage flow documentation
- Scoring rules by category
- Conversion formulas (USD ↔ OP, OP ↔ points/cash)
- Error handling (insufficient funds, sync failures)

---

## User Experience vs. Internal Flow

### What User Sees
```
User: "I want to spend $500 on electronics"
      ↓
      [Gemini processes internally for 3-5 seconds]
      ↓
Gemini: "Done! You spent 50,000 OP using your best cash-back card.
         Your wallet: 100,000 OP remaining ($1,000)
         
         Breakdown:
         • ClearCash: $150 (your full balance)
         • GoldFork: 23,333 points (from 35K OP needed)
         
         Next check will show updated balances from your bank/rewards APIs."
```

### What's Happening Internally
```
Stage 1: Parse → 50,000 OP needed
Stage 2: refresh_rates() → Rates synced & fresh ✓
Stage 3: getUserBalances() → 150,000 OP total
Stage 4: Score → ClearCash best (3.0 OP/$)
Stage 5: updateBalances() → Debit $150 + 23.3K points
Stage 6: sync_after_redemption() → Fivetran re-syncing...
```

---

## Error Handling

### Insufficient OP
```
User needs 50,000 OP but only has 45,000
→ Gemini: "You're short by $50. Would you like to:
   1. Spend $450 instead
   2. Use a different card (transfer miles first)
   3. Check if new earnings are pending"
```

### Rates Stale (>2 hours)
```
Stage 2 check shows stale rates
→ Gemini: "Rates are 3 hours old. Refreshing live data... (2 sec)"
→ refresh_rates() called
→ Proceeds with fresh rates
```

### Sync Failure in Stage 6
```
sync_after_redemption() fails for one connector
→ Debit completes (already applied in Stage 5)
→ Gemini: "Completed! One connector is syncing in background.
   Balances will reconcile in next cycle (usually <5 min)."
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│           User Request (Natural Language)                │
│        "I want to spend $500 on electronics"             │
└─────────────────┬──────────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │  Gemini Agent       │
        │  (6-Stage Flow)     │
        └─────────┬───────────┘
                  │
          ┌───────┴──────────────┬─────────┬──────────┐
          │                      │         │          │
       Stage 1                Stage 2   Stage 3    Stage 4
       (Parse)             (Refresh   (Fetch    (Score)
                            Rates)   Balances)
          │                      │         │          │
          ▼                      ▼         ▼          ▼
    50,000 OP ─────────► refresh_rates() → getUserBalances() → ClearCash: 3.0
    electronics              │              │                  GoldFork: 1.125
    $500                     ▼              ▼                  Skyward: 1.0
                        MongoDB        150,000 OP
                        Fresh              │
                                            │
                    ┌───────────────────────┘
                    │
               Stage 5              Stage 6
             (updateBal)      (Resync After)
                    │                 │
                    ▼                 ▼
             ClearCash:         sync_after_redemption()
             $150 debit         ├─ bank (ClearCash)
             GoldFork:          └─ rewards (GoldFork)
             23.3K pts debit        │
                                    ▼
                              MongoDB Auto-Updated
                              Balances Reconciled
```

---

## Deployment Checklist

- [x] MCP server with `refresh_rates()` tool
- [x] Gemini agent with 6-stage flow implementation
- [x] Stage 1: USD → OP conversion
- [x] Stage 2: `refresh_rates()` before scoring
- [x] Stage 3: `getUserBalances()` + OP conversion
- [x] Stage 4: Card scoring by category with greedy allocation
- [x] Stage 5: `updateBalances()` with raw debits
- [x] Stage 6: `sync_after_redemption()` for background sync
- [x] Error handling for insufficient funds, stale rates, sync failures
- [x] User messaging (OP only, no raw card details)
- [x] Documentation with exact flow

---

**Status**: ✅ Fivetran MCP integration matches interactive simulator exactly
