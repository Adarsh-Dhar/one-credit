# OneCredit Extension - Complete Test Suite Execution Guide

## Overview

Your extension now has **16 comprehensive tests** split across **Track A (UI/Logic)** and **Track B (Backend Integration)** plus E2E tests.

- **Track A:** 10 tests for UI/component behavior (run in v0 preview)
- **Track B:** 6 tests for backend API integration (run after export)
- **E2E:** Browser-based interaction tests (run with agent-browser)

---

## Track A: UI/Logic Tests

**Location:** `__tests__/extension-track-a.test.tsx`

**Run in v0 Preview Environment**

These tests verify component states, animations, and UI logic without needing a backend.

### How to Run

```bash
cd /vercel/share/v0-project

# Run all Track A tests
pnpm test -- extension-track-a

# Run with watch mode (auto-rerun on changes)
pnpm test:watch -- extension-track-a

# Run specific test suite
pnpm test -- extension-track-a -t "State Machine Completeness"
```

### Test Breakdown

| Test # | Name | What It Verifies | Time |
|--------|------|------------------|------|
| 1 | State Machine Completeness | All 8 state transitions work correctly | 5s |
| 2 | OP Cost Ranking Logic | Cards always sorted ascending by opCost | 3s |
| 3 | Accordion Behavior | Only one card expanded at a time | 4s |
| 4 | OP Savings Calculation | Formula: worst - best = savings | 3s |
| 5 | Loading Steps Sequence | 3 steps stagger at 0.8s intervals | 10s |
| 6 | Responsive Sidebar | No overflow at 1280px width | 2s |
| 7 | Card Color Strips | Each card has unique gradient color | 2s |
| 8 | Rank Badges | Correct emoji/numbers for ranks 1-4 | 2s |
| 9 | Opportunity Multiplier | All 5 detail fields display correctly | 3s |
| 10 | Animation Smoke Test | No layout shift, no ghost elements | 5s |

**Total Time:** ~40 seconds

### Example Output

```
PASS  __tests__/extension-track-a.test.tsx
  Track A - UI/Logic Tests
    Test 1: State Machine Completeness
      ✓ should transition from idle to detected when pill is clicked (145ms)
      ✓ should transition from detected to calculating when analyze button is clicked (238ms)
      ...
    Test 2: OP Cost Ranking Logic
      ✓ should always rank cards by ascending opCost (89ms)
      ✓ should compute winner based on sorted opCost (rank 1 card) (125ms)
      ...

Test Suites: 1 passed, 1 total
Tests:       32 passed, 32 total
Snapshots:   0 total
Time:        40.521 s
```

### Debugging Failed Tests

If a test fails:

1. **Read the error message** - it will say which assertion failed
2. **Check the component** - verify the test data matches your component's mock data
3. **Add console.logs** - edit the test to log snapshots:
   ```tsx
   const { container } = render(<OneCreditTxPortal />);
   console.log(container.innerHTML); // Debug output
   ```
4. **Check data-testid attributes** - ensure component has all required test IDs

---

## Track B: Backend Integration Tests

**Location:** `__tests__/extension-track-b.test.ts`

**Run After Exporting from v0**

These tests verify API responses, auth, and backend calculations.

### Prerequisites

1. **Export from v0** - Download the code from v0 as a zip
2. **Deploy backend** - Push to a branch with `/api/extension/analyze` and `/api/wallet` routes
3. **Set environment variables**:
   ```bash
   export BASE_URL="http://localhost:3000"  # or your deployed URL
   export TEST_AUTH_TOKEN="your-real-token"  # optional, for auth tests
   ```

### How to Run

```bash
# Run all Track B tests
pnpm test -- extension-track-b

# Run specific test
pnpm test -- extension-track-b -t "api/wallet Response Shape"

# Run with custom BASE_URL
BASE_URL="https://preview-abc.vercel.app" pnpm test -- extension-track-b
```

### Test Breakdown

| Test # | Name | What It Verifies | Depends On |
|--------|------|------------------|-----------|
| 11 | /api/wallet Response Shape | Returns correct field names and types | Backend |
| 12 | /api/ai/analyze OP Calculation | JSON is valid, fields are correct, sorted ascending | AI/Backend |
| 13 | Auth Token Passthrough | Authorization header used, user cards returned | Auth setup |
| 14 | Product Detection Per Site | Handles Amazon, Walmart, Best Buy, Target data | Scraping logic |
| 15 | OP Cost Changes Per Product | Different purchases return different results | AI model |
| 16 | Graceful Error States | Timeouts, errors don't freeze UI | Error handling |

### Example Output

```
PASS  __tests__/extension-track-b.test.ts
  Track B - Backend Integration Tests
    Test 11: /api/wallet Response Shape
      ✓ should return cards array with required fields (234ms)
      ✓ should have correct shape for each card object (156ms)
      ...
    Test 12: /api/ai/analyze OP Calculation Accuracy
      ✓ should return valid JSON (not markdown-wrapped) (1245ms)
      ✓ should include all 8 required fields for each card (1189ms)
      ...

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Time:        12.456 s
```

### Debugging Failed Tests

If a test fails:

1. **Check the API response** - open a new terminal and test manually:
   ```bash
   curl -X POST http://localhost:3000/api/extension/analyze \
     -H "Content-Type: application/json" \
     -d '{"prompt":"Analyze OP costs"}'
   ```
2. **Check response format** - is it JSON? Any markdown backticks?
3. **Verify field names** - use the correct names (`key` not `card_id`, `name` not `display_name`)
4. **Check auth** - is the token being sent? Are user cards different from demo cards?

---

## E2E Tests: Browser Interaction

**Location:** `__tests__/extension-e2e.ts`

**Run After Deploying to Preview**

These tests verify real browser interactions using the agent-browser CLI.

### Prerequisites

1. **Deploy to preview** - `git push origin main` (or create PR)
2. **Wait for preview URL** - Vercel will create a preview deployment
3. **Set BASE_URL** environment variable to preview URL

### How to Run

```bash
# Single test
agent-browser open http://localhost:3000/extension && \
  agent-browser snapshot && \
  agent-browser screenshot

# Full automation (all 6 E2E tests)
pnpm test:e2e

# Or manually with agent-browser
agent-browser batch \
  "open http://localhost:3000/extension" \
  "screenshot" \
  "snapshot"
```

### Test Scenarios

1. **Test 1 - State Machine** - Click through all states
2. **Test 3 - Accordion** - Expand/collapse cards
3. **Test 5 - Loading** - Verify 3-step loading sequence
4. **Test 6 - Responsive** - Check sidebar at different widths
5. **Test 7 - Colors** - Verify card gradient colors render
6. **Test 8 - Badges** - Check rank emoji display
7. **Test 10 - Animations** - Verify smooth animations, no jank

### Manual E2E Walkthrough

If you prefer to test manually:

1. **Open dev server**: `pnpm dev`
2. **Visit extension demo**: `http://localhost:3000/extension`
3. **Use dev state switcher** (bottom-left) to jump to each state
4. **Verify each state renders correctly**:
   - Idle: 40×80px pill on right edge
   - Detected: Product preview card (280px)
   - Calculating: Full sidebar with 3 loading steps
   - Results: Cards ranked by OP cost
   - Confirmed: Success modal with checkmark

---

## Priority Test Order (If Short on Time)

Run these 5 first — they catch the most critical issues:

```bash
# 1. State machine (foundation)
pnpm test -- extension-track-a -t "State Machine"

# 2. AI parsing (core value)
pnpm test -- extension-track-b -t "api/ai/analyze"

# 3. OP calculation (user trust)
pnpm test -- extension-track-a -t "OP Savings"

# 4. Error handling (prevents hangs)
pnpm test -- extension-track-b -t "Error States"

# 5. Auth (prevents wrong cards)
pnpm test -- extension-track-b -t "Auth Token"
```

**Time:** ~5 minutes for all 5

---

## Continuous Testing

### Run All Tests

```bash
# Track A + Track B (no E2E)
pnpm test

# Track A only
pnpm test -- extension-track-a

# Track B only (requires backend)
pnpm test -- extension-track-b

# E2E only
pnpm test:e2e
```

### Watch Mode (Auto-Rerun)

```bash
pnpm test:watch -- extension-track-a
```

On file changes, tests automatically re-run.

### CI/CD Integration

Add to `.github/workflows/test.yml`:

```yaml
name: Extension Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test -- extension-track-a
      - run: pnpm build
      - run: |
          export BASE_URL="http://localhost:3000"
          pnpm dev &
          sleep 5
          pnpm test -- extension-track-b
```

---

## Test Data & Fixtures

### Mock Card Data (Used in Track A)

The tests use 4 mock cards with these properties:

```typescript
mockCards = [
  {
    key: 'chase-sapphire',
    name: 'Chase Sapphire Reserve',
    balance: 87400,
    opCost: 4157, // LOWEST (rank 1)
    bestRedemptionCpp: 2.1,
  },
  {
    key: 'amex_gold',
    name: 'Amex Gold Card',
    balance: 42000,
    opCost: 5494, // rank 2
    bestRedemptionCpp: 1.8,
  },
  {
    key: 'citi-double-cash',
    name: 'Citi Double Cash',
    balance: 284.5,
    opCost: 5897, // rank 3
    bestRedemptionCpp: 1.0,
  },
  {
    key: 'apple_card',
    name: 'Apple Card',
    balance: 12.3,
    opCost: 6230, // HIGHEST (rank 4)
    bestRedemptionCpp: 1.0,
  },
];
```

**Key values used in tests:**
- Savings calculation: `6230 - 4157 = 2073 OP`
- Winner: Chase Sapphire (rank 1, opCost 4157)

If you modify the component's mock data, update these values in the tests.

---

## Expected Test Results

### Track A: All 10 Suites Should Pass

```
Test 1: State Machine Completeness        ✓ 8/8 passed
Test 2: OP Cost Ranking Logic             ✓ 3/3 passed
Test 3: Accordion Behavior                ✓ 3/3 passed
Test 4: OP Savings Calculation            ✓ 3/3 passed
Test 5: Loading Steps Sequence            ✓ 3/3 passed
Test 6: Responsive Sidebar Width          ✓ 3/3 passed
Test 7: Card Color Strip Rendering        ✓ 2/2 passed
Test 8: Rank Badge Display                ✓ 3/3 passed
Test 9: Opportunity Multiplier Display    ✓ 2/2 passed
Test 10: Animation Smoke Test             ✓ 5/5 passed
```

**Total: 35/35 ✓**

### Track B: All 6 Suites Should Pass

```
Test 11: /api/wallet Response Shape       ✓ 4/4 passed
Test 12: /api/ai/analyze Accuracy        ✓ 5/5 passed
Test 13: Auth Token Passthrough          ✓ 3/3 passed
Test 14: Product Detection Per Site      ✓ 4/4 passed
Test 15: OP Cost Changes Per Product     ✓ 3/3 passed
Test 16: Graceful Error States           ✓ 4/4 passed
```

**Total: 23/23 ✓**

---

## Troubleshooting

### "Cannot find module @/components/OneCreditTxPortal"

**Fix:** Check that the component file has the correct test IDs:
```tsx
<div data-testid="idle-pill">...</div>
<div data-testid="detected-preview">...</div>
```

### "Test times out after 5000ms"

**Fix:** Increase Jest timeout in test:
```tsx
it('should...', async () => {
  // ...
}, 10000); // 10 second timeout
```

### "/api/extension/analyze returns 404"

**Fix:** Backend route not deployed. Check:
```bash
curl http://localhost:3000/api/extension/analyze
# Should return error (POST required), not 404
```

### Mock data doesn't match

**Fix:** Ensure component mock data matches test constants:
```tsx
// If component uses different opCost values, update test expectations
const expectedSavings = 6230 - 4157; // Update this line
```

---

## Next Steps

1. **Run Track A tests now** - should all pass in v0 preview
2. **Export and deploy** - push to Vercel for preview
3. **Run Track B tests** - verify backend integration
4. **Run E2E tests** - verify browser interactions
5. **Fix any failures** - use debug guide above

**All 16 tests passing = Production Ready ✅**

---

## Test File Locations

```
/vercel/share/v0-project/
├── __tests__/
│   ├── extension-track-a.test.tsx    (35 tests, UI/Logic)
│   ├── extension-track-b.test.ts     (23 tests, Backend)
│   └── extension-e2e.ts              (E2E scenarios)
├── package.json                       (test scripts)
├── jest.config.js                     (Jest configuration)
└── EXTENSION_TEST_EXECUTION_GUIDE.md  (this file)
```

---

## Questions?

Refer to:
- `EXTENSION_SETUP.md` - Full extension setup
- `EXTENSION_QUICKSTART.md` - 5-minute overview
- `EXTENSION_ARCHITECTURE.md` - System design
- Individual test files for inline comments

**Happy testing! 🚀**
