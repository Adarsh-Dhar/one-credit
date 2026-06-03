# OneCredit Extension - Visual Architecture

## Component State Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   OneCreditTxPortal Component                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ State: idle                                              │  │
│  │ ┌────────────────────────────────────────────────────┐  │  │
│  │ │                                                    │  │  │
│  │ │     ✦                                              │  │  │
│  │ │   OneCredit Pill                                  │  │  │
│  │ │   (40px × 80px)                                   │  │  │
│  │ │   fixed right-0 top-1/2                           │  │  │
│  │ │                                                    │  │  │
│  │ │      [CLICK] → detected                           │  │  │
│  │ └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ State: detected                                          │  │
│  │ ┌────────────────────────────────────────────────────┐  │  │
│  │ │ ✦ OneCredit              X                         │  │  │
│  │ │                                                    │  │  │
│  │ │ Product: Apple MacBook Pro 14" M3 Pro             │  │  │
│  │ │ $1,999.00            🛒 amazon                     │  │  │
│  │ │                                                    │  │  │
│  │ │ ┌──────────────────────────────────────────────┐  │  │  │
│  │ │ │  Analyze with AI →                       │  │  │  │
│  │ │ └──────────────────────────────────────────────┘  │  │  │
│  │ │                                                    │  │  │
│  │ │      (280px width)    [CLICK] → calculating       │  │  │
│  │ └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ State: calculating                                       │  │
│  │ ┌────────────────────────────────────────────────────┐  │  │
│  │ │ ✦ OneCredit                                 X      │  │  │
│  │ │ Analyzing purchase...                              │  │  │
│  │ │                                                    │  │  │
│  │ │ 💻 MacBook Pro 14" | $1,999.00                    │  │  │
│  │ │ ─────────────────────────────────────────────────  │  │  │
│  │ │                                                    │  │  │
│  │ │ ⟳ Fetching your card portfolio... ✓              │  │  │
│  │ │ ⟳ Running OP cost model... ✓                      │  │  │
│  │ │ ⟳ Evaluating opportunity costs... ✓              │  │  │
│  │ │                                                    │  │  │
│  │ │      (380px width)  [AUTO] → results (2.8s)       │  │  │
│  │ └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ State: results                                           │  │
│  │ ┌────────────────────────────────────────────────────┐  │  │
│  │ │ ✦ OneCredit                                 X      │  │  │
│  │ │                                                    │  │  │
│  │ │ 🛒 MacBook Pro 14" · $1,999 · electronics          │  │  │
│  │ │ ─────────────────────────────────────────────────  │  │  │
│  │ │                                                    │  │  │
│  │ │ ┌──────────────────────────────────────────────┐  │  │  │
│  │ │ │ 🏆 Best card: Chase Sapphire Reserve         │  │  │  │
│  │ │ │    Saves 2,073 OP vs. worst option           │  │  │  │
│  │ │ └──────────────────────────────────────────────┘  │  │  │
│  │ │                                                    │  │  │
│  │ │ 🥇 Chase Sapphire Reserve    4,157 OP   ▼        │  │  │
│  │ │    Chase • UR Points                              │  │  │
│  │ │    ┌──────────────────────────────────────────┐   │  │  │
│  │ │    │ Rewards: 1,999 UR Points                 │   │  │  │
│  │ │    │ Net cost: $1,979.01                       │   │  │  │
│  │ │    │ Best use: Hyatt 2.1¢/pt                  │   │  │  │
│  │ │    │ Why: Premium tokens worth more elsewhere  │   │  │  │
│  │ │    └──────────────────────────────────────────┘   │  │  │
│  │ │                                                    │  │  │
│  │ │ 🥈 Amex Gold Card              5,494 OP   ▶        │  │  │
│  │ │    American Express • MR Points                    │  │  │
│  │ │                                                    │  │  │
│  │ │ 🥉 Citi Double Cash             5,897 OP   ▶       │  │  │
│  │ │    Citi • Cash Back                               │  │  │
│  │ │                                                    │  │  │
│  │ │ 4️⃣ Apple Card                  6,230 OP   ▶       │  │  │
│  │ │    Goldman Sachs • Daily Cash                      │  │  │
│  │ │ ─────────────────────────────────────────────────  │  │  │
│  │ │                                                    │  │  │
│  │ │ ┌──────────────────────────────────────────────┐  │  │  │
│  │ │ │  Use Chase Sapphire Reserve →            │  │  │  │
│  │ │ │  Tap to highlight this card at checkout      │  │  │  │
│  │ │ │  Recalculate                                 │  │  │  │
│  │ │ └──────────────────────────────────────────────┘  │  │  │
│  │ │                                                    │  │  │
│  │ │      (380px width)    [CLICK] → confirmed         │  │  │
│  │ └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ State: confirmed                                         │  │
│  │ ┌────────────────────────────────────────────────────┐  │  │
│  │ │                                                    │  │  │
│  │ │                   ✓ (animated)                    │  │  │
│  │ │                                                    │  │  │
│  │ │              Card selected!                        │  │  │
│  │ │     Chase Sapphire Reserve highlighted            │  │  │
│  │ │            at checkout                            │  │  │
│  │ │                                                    │  │  │
│  │ │ ┌──────────────────────────────────────────────┐  │  │  │
│  │ │ │          OP Savings                          │  │  │  │
│  │ │ │      2,073 OP                                 │  │  │  │
│  │ │ │     vs worst option                           │  │  │  │
│  │ │ └──────────────────────────────────────────────┘  │  │  │
│  │ │                                                    │  │  │
│  │ │ ┌──────────────────────────────────────────────┐  │  │  │
│  │ │ │              Done                        │  │  │  │
│  │ │ └──────────────────────────────────────────────┘  │  │  │
│  │ │                                                    │  │  │
│  │ │      (380px width)    [CLICK] → idle              │  │  │
│  │ └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Extension Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Chrome Browser                                │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Shopping Site (amazon.com, etc.)                        │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────┐               │   │
│  │  │ Content Script (content.js)         │               │   │
│  │  │ - Detects product                  │               │   │
│  │  │ - Extracts name, price, image      │               │   │
│  │  └────────────────────────────────────┘               │   │
│  │           ↓                                            │   │
│  │  ┌────────────────────────────────────┐               │   │
│  │  │ Sidebar Frame                       │               │   │
│  │  │ - Loads sidepanel.html             │               │   │
│  │  │ - Renders OneCreditTxPortal        │               │   │
│  │  │ - 5 animated states                │               │   │
│  │  └────────────────────────────────────┘               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Background Service Worker (background.js)              │   │
│  │ - Listens for messages                                │   │
│  │ - Coordinates extension ↔ main app                    │   │
│  │ - Manages storage                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Popup (popup.html/js)                                 │   │
│  │ - Shows product detected status                        │   │
│  │ - Button to open sidebar                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Options Page (options.html/js)                         │   │
│  │ - User preferences                                     │   │
│  │ - Enable/disable shopping sites                        │   │
│  │ - Privacy settings                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                                  ↕
                          ┌─────────────────┐
                          │   Bridge (TS)   │
                          │ Communication   │
                          │   Layer         │
                          └─────────────────┘
                                  ↕
┌──────────────────────────────────────────────────────────────────┐
│                    Main App (Next.js)                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ API Routes (/api/extension/)                            │   │
│  │                                                          │   │
│  │  POST /analyze         Calculate OP costs               │   │
│  │  POST /checkout        Record card selection            │   │
│  │  GET /status           Connection status                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                  ↓                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Backend Services                                         │   │
│  │ - Fetch user cards (/api/fiat-cards)                    │   │
│  │ - Calculate OP costs                                     │   │
│  │ - Log analytics                                          │   │
│  │ - Database interactions                                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Demo Page (/extension)                                   │   │
│  │ - Interactive component demo                            │   │
│  │ - Dev state switcher                                    │   │
│  │ - Documentation                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Product Detection & Analysis

```
User visits shopping site
         ↓
Content script loads (runs only on approved domains)
         ↓
Detects product: {name, price, category, image, site}
         ↓
Sends to background worker via chrome.runtime.sendMessage()
         ↓
Background worker stores in chrome.storage.local
         ↓
Popup shows "Product detected" status
         ↓
User clicks "Open Transaction Portal"
         ↓
Sidebar opens (fixed right edge, 380px width)
         ↓
OneCreditTxPortal component renders → idle state
         ↓
User sees detected state preview
         ↓
User clicks "Analyze with AI"
         ↓
Portal transitions: idle → detected → calculating
         ↓
Loading animation shows 3 steps (0.8s each):
  ⟳ Fetching cards... ✓
  ⟳ Running OP model... ✓
  ⟳ Evaluating costs... ✓
         ↓
Auto-transitions to results state
         ↓
Portal displays: 🏆 Winner banner + 4 ranked cards
         ↓
Cards sorted by OP cost (lowest first)
         ↓
User clicks "Use [Card] →"
         ↓
Portal transitions: results → confirmed
         ↓
Success screen with savings summary
         ↓
User clicks "Done"
         ↓
Portal transitions: confirmed → idle
         ↓
Sidebar collapses back to pill
```

### Real Integration Flow (When Connected to Backend)

```
Portal in calculating state
         ↓
Calls OneCreditBridge.analyzeProduct(product, userId)
         ↓
Bridge makes: POST /api/extension/analyze
         ↓
Backend fetches: GET /api/fiat-cards?userId=xxx
         ↓
Backend maps cards to OP cost model:
  For each card:
    - earnRate = rewards_structure.base_multiplier
    - rewardsEarned = price × earnRate
    - bestRedemptionCpp = card.best_redemption_cpp
    - opportunityMultiplier = bestRedemptionCpp
    - netDollarCost = price - rewardsEarned × points_value
    - opCost = netDollarCost × opportunityMultiplier × 100
         ↓
Backend sorts by opCost (ascending)
         ↓
Returns: {cards: [...], winner: {...}, savings: 2073}
         ↓
Frontend displays results
         ↓
User selects card
         ↓
Bridge calls: POST /api/extension/checkout
         ↓
Backend logs transaction for analytics
         ↓
Portal shows confirmed state
```

## Animation Timeline

```
Pill → Preview (0.3s)
  width: 40px → 280px
  opacity: 0 → 1
  
Preview → Calculating (0.35s)
  slide in from right
  x: 380 → 0
  
Loading Step 1 (0.8s)
  ⟳ Fetch → ✓ 
  
Loading Step 2 (1.6s total)
  ⟳ Model → ✓
  
Loading Step 3 (2.4s total)
  ⟳ Evaluate → ✓
  
Auto transition to results (2.8s total)
  opacity fade
  
Results cards stagger (0.1s each)
  y: 20 → 0
  opacity: 0 → 1
  
Winner banner scale-in (0.3s)
  scale: 0.95 → 1
  
Card expand/collapse
  height: 0 → auto (0.2s)
  
Checkmark draw (0.6s)
  stroke-dashoffset animation
  circle + path
  
Confirmed → Idle (0.3s)
  fade out
  collapse
```

---

This architecture enables a seamless shopping experience where users can instantly see which credit card saves them the most in OP tokens without leaving the shopping site.
