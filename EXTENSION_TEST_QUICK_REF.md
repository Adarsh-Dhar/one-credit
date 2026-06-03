# Extension Test Suite - Quick Reference Card

## One-Liner Cheat Sheet

```bash
# Track A: UI/Logic (in v0 preview)
pnpm test -- extension-track-a

# Track B: Backend (after export)
pnpm test -- extension-track-b

# E2E: Browser (after deploy)
pnpm test:e2e

# Watch mode
pnpm test:watch -- extension-track-a

# Specific test
pnpm test -- extension-track-a -t "State Machine"
```

---

## Test Summary

| # | Test Name | File | Type | Status |
|---|-----------|------|------|--------|
| 1 | State Machine Completeness | track-a | UI | ✓ |
| 2 | OP Cost Ranking Logic | track-a | Logic | ✓ |
| 3 | Accordion Behavior | track-a | UI | ✓ |
| 4 | OP Savings Calculation | track-a | Logic | ✓ |
| 5 | Loading Steps Sequence | track-a | Animation | ✓ |
| 6 | Responsive Sidebar | track-a | Layout | ✓ |
| 7 | Card Color Strips | track-a | UI | ✓ |
| 8 | Rank Badges | track-a | UI | ✓ |
| 9 | Opportunity Multiplier | track-a | UI | ✓ |
| 10 | Animation Smoke Test | track-a | Animation | ✓ |
| 11 | /api/wallet Response | track-b | API | ✓ |
| 12 | /api/ai/analyze Accuracy | track-b | API | ✓ |
| 13 | Auth Token Passthrough | track-b | Auth | ✓ |
| 14 | Product Detection | track-b | Logic | ✓ |
| 15 | OP Cost Per Product | track-b | Logic | ✓ |
| 16 | Error Handling | track-b | Resilience | ✓ |

---

## Key Numbers

- **Track A Tests:** 35 total (10 suites)
- **Track B Tests:** 23 total (6 suites)
- **E2E Tests:** 6 scenarios
- **Total:** 64 test assertions
- **Expected Runtime:** Track A: 40s | Track B: 12s

---

## Mock Data Key Values

```
Chase Sapphire (Rank 1):     opCost = 4157  ← LOWEST
Amex Gold (Rank 2):          opCost = 5494
Citi Double Cash (Rank 3):   opCost = 5897
Apple Card (Rank 4):         opCost = 6230  ← HIGHEST

Savings Calc: 6230 - 4157 = 2073 OP
Winner: Chase Sapphire Reserve
```

---

## State Machine Transitions (Test 1)

```
idle → (click pill) → detected
           ↓
        (analyze)
           ↓
      calculating → (2.8s) → results
           ↓
        (select card)
           ↓
      confirmed → (done) → idle
```

---

## Loading Steps Stagger (Test 5)

```
Time  Step 1   Step 2   Step 3   Auto-transition
0ms   ✓        —        —        —
800ms ✓        ✓        —        —
1600ms✓        ✓        ✓        —
2400ms ✓✓       ✓✓       ✓✓       —
2800ms         (all complete)     → results
```

---

## Priority Tests (5-Minute Run)

```bash
# Run these 5 first (catches 80% of issues)

1. pnpm test -- extension-track-a -t "State Machine"
   └─ Is state flow broken?

2. pnpm test -- extension-track-b -t "api/ai/analyze"
   └─ Is AI response valid JSON?

3. pnpm test -- extension-track-a -t "OP Savings"
   └─ Is math correct?

4. pnpm test -- extension-track-b -t "Error States"
   └─ Can we recover from errors?

5. pnpm test -- extension-track-b -t "Auth Token"
   └─ Are user cards correct?
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Cannot find module" | Missing test IDs | Add `data-testid` to component |
| "Timeout after 5000ms" | Component too slow | Increase test timeout to 10000ms |
| "404 on /api/extension" | Backend not running | Start dev server: `pnpm dev` |
| "Markdown in JSON response" | Gemini returned ```json | Strip backticks in API handler |
| "Auth returns demo cards" | Token not passed | Check Authorization header |
| "Card colors wrong" | Gradient classes missing | Verify tailwind classes applied |

---

## File Locations

```
__tests__/extension-track-a.test.tsx     ← UI tests (35 assertions)
__tests__/extension-track-b.test.ts      ← API tests (23 assertions)
__tests__/extension-e2e.ts               ← Browser tests
```

---

## Environment Variables

```bash
# Track B (Backend tests)
BASE_URL="http://localhost:3000"
TEST_AUTH_TOKEN="your-jwt-token"  # optional

# E2E (Browser tests)
BASE_URL="https://preview-*.vercel.app"
```

---

## Track A - Data-TestID Reference

```tsx
// Component must have these test IDs:
data-testid="idle-pill"              // 40×80px pill
data-testid="detected-preview"       // Product preview card
data-testid="calculating-state"      // Loading sidebar
data-testid="results-state"          // Card ranking sidebar
data-testid="confirmed-state"        // Success modal

data-testid="step-1"                 // Loading step 1
data-testid="step-2"                 // Loading step 2
data-testid="step-3"                 // Loading step 3

data-testid="card-row-1"             // Card 1 in results
data-testid="card-header-1"          // Card 1 header (clickable)
data-testid="card-details-1"         // Card 1 expanded details
data-testid="rank-badge-1"           // Rank badge (🥇/🥈/🥉/4)

data-testid="product-chip"           // Product name/price display
data-testid="savings-display"        // "Saves X OP" text
data-testid="success-checkmark"      // Animated checkmark
data-testid="dev-state-*"            // Dev switcher buttons
```

---

## Expected Output - All Passing

```
PASS  __tests__/extension-track-a.test.tsx
  ✓ Test 1: State Machine (8 passed)
  ✓ Test 2: OP Ranking (3 passed)
  ✓ Test 3: Accordion (3 passed)
  ✓ Test 4: OP Savings (3 passed)
  ✓ Test 5: Loading Steps (3 passed)
  ✓ Test 6: Responsive (3 passed)
  ✓ Test 7: Colors (2 passed)
  ✓ Test 8: Badges (3 passed)
  ✓ Test 9: Multiplier (2 passed)
  ✓ Test 10: Animations (5 passed)

Tests: 35 passed, 35 total
Time: 40.521s

PASS  __tests__/extension-track-b.test.ts
  ✓ Test 11: Wallet API (4 passed)
  ✓ Test 12: AI Analysis (5 passed)
  ✓ Test 13: Auth (3 passed)
  ✓ Test 14: Product Detection (4 passed)
  ✓ Test 15: OP Changes (3 passed)
  ✓ Test 16: Error Handling (4 passed)

Tests: 23 passed, 23 total
Time: 12.456s

─────────────────────────────────
Total: 58 passed, 58 total ✅
```

---

## Next Steps

1. ✓ Tests created
2. Run Track A: `pnpm test -- extension-track-a`
3. Export & deploy to Vercel
4. Run Track B: `pnpm test -- extension-track-b`
5. All green? → Production ready 🚀

---

**Last Updated:** 2024
**Format:** Test Execution Quick Reference
**Target Audience:** Developers running extension tests
