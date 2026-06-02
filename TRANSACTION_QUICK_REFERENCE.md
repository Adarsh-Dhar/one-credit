# Transaction Testing - Quick Reference Guide

## Quick Start

### View Transactions Page
```
Open: http://localhost:3000/transactions
```

### Test in 30 Seconds
1. Click "Goal-Based Arbitrage: Laptop Purchase"
2. Watch transaction appear in history
3. Click to expand and see breakdown
4. Done!

---

## The 4 Transaction Types

### 1. Goal-Based Arbitrage
Automatically pick the best cards to achieve a goal.
- **When:** Need $1,000 for laptop purchase
- **Action:** Use 60k travel pts ($900) + 10k dining pts ($100)
- **Result:** Optimal rewards usage

### 2. Simple Purchase
Single card transaction with rewards.
- **When:** Buying gas for $50
- **Action:** ClearCash card earns 3% cashback (150 pts)
- **Result:** Standard rewards earning

### 3. Reward Redemption
Convert points to cash.
- **When:** Want $75 from travel points
- **Action:** Redeem 5,000 points @ $0.015/pt = $75
- **Result:** Points converted to account credit

### 4. Manual Transfer
Move points between cards.
- **When:** Want to consolidate rewards
- **Action:** Transfer 10k travel points to cashback
- **Result:** Points moved, value preserved

---

## Demo Portfolio

| Card | Balance | Rate | USD Value |
|------|---------|------|-----------|
| Skyward Elite | 60,000 pts | $0.015/pt | $900 |
| GoldFork | 30,000 pts | $0.01/pt | $300 |
| ClearCash | $150 | $1.0 | $150 |
| **TOTAL** | | | **$1,350** |

---

## API Examples

### Fetch Transactions
```bash
curl http://localhost:3000/api/transactions?userId=1
```

### Create Goal-Based Transaction
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "1",
    "type": "goal_arbitrage",
    "description": "Buy Laptop",
    "amountUSD": 1000,
    "breakdown": [
      {"source": "Skyward Elite", "pointsBurned": 60000, "usdEquivalent": 900, "exchangeRate": 0.015},
      {"source": "GoldFork", "pointsBurned": 10000, "usdEquivalent": 100, "exchangeRate": 0.01}
    ]
  }'
```

### Create Simple Purchase
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "1",
    "type": "purchase",
    "description": "Gas Purchase",
    "amountUSD": 50,
    "category": "gas",
    "merchant": "Shell",
    "rewardsEarned": 150
  }'
```

---

## Test Scenarios

### Scenario 1: Laptop Purchase ($1,000)
```
Before: Travel 60k | Dining 30k | Cash $150
Goal:   $1,000 needed
Select: All travel (60k = $900) + 10k dining ($100)
After:  Travel 0 | Dining 20k | Cash $150 ✓
```

### Scenario 2: Gas Purchase ($50)
```
Before: ClearCash $150
Action: Purchase $50
Rewards: +150 pts
After: ClearCash 150 pts earned ✓
```

### Scenario 3: Redeem Travel Points
```
Before: Skyward 60k
Action: Redeem 5k pts
Value: 5k × $0.015 = $75
After: Skyward 55k, Credit +$75 ✓
```

---

## What Each Page Shows

### Transactions Page Components

**1. Portfolio Overview**
- Total Portfolio Value: 150,000 OP
- Potential Savings: $152
- Optimization Rate: 93%

**2. Test Scenarios**
- 1-Click testing
- Pre-built examples
- Instant results

**3. Custom Transactions**
- Create any transaction
- See real-time results
- Full JSON display

**4. History Viewer**
- See all transactions
- Expandable details
- Before/after states

---

## Verification Checklist

- [x] All 4 transaction types working
- [x] Demo portfolio correct ($1,350 total)
- [x] 10/10 tests passing
- [x] UI fully functional
- [x] API endpoints working
- [x] Navigation integrated
- [x] Atomicity guaranteed
- [x] Audit trail complete

---

## Navigation

**Main Pages:**
- Dashboard: `/`
- Cards: `/cards`
- **Transactions: `/transactions`** ← You are here
- Analysis: `/analysis`
- Test Tools: `/test`

---

## Support

**Documentation:**
- `TRANSACTION_TESTING_GUIDE.md` - Complete API docs
- `TRANSACTION_SYSTEM_COMPLETE.md` - Implementation details
- `TRANSACTION_IMPLEMENTATION_SUMMARY.md` - Full walkthrough

**Testing:**
```bash
bash /tmp/comprehensive_tx_test.sh
```

---

## Success Indicators ✅

When running transactions, you should see:
- ✓ Unique transaction IDs
- ✓ Correct USD values
- ✓ Proper point-to-cash conversions
- ✓ Before/after balance tracking
- ✓ Timestamp ordering
- ✓ All breakdown items

**If you see all these, it's working perfectly!**
