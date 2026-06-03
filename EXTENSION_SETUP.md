# OneCredit Extension Setup Guide

## Overview

OneCredit is a Chrome browser extension that integrates with the Omni-Wallet app to help users optimize their credit card rewards on shopping sites. The extension automatically detects products on Amazon, Walmart, Best Buy, and Target, then analyzes which of your credit cards costs the least in **OP (Optimal Points) tokens** to make the purchase.

## Architecture

### Main Components

1. **React Component**: `OneCreditTxPortal` - The main UI component with 5 distinct states
2. **Browser Extension**: Chrome extension files for product detection and UI injection
3. **API Endpoints**: Backend routes for analysis and data sync
4. **Bridge Layer**: TypeScript bridge for secure communication between extension and main app

### Technology Stack

- **Frontend**: React 19, Framer Motion, Tailwind CSS, Lucide Icons
- **Backend**: Next.js 16, TypeScript
- **Animation**: Framer Motion
- **Browser**: Chrome Extension Manifest v3

## File Structure

```
.
├── components/
│   └── OneCreditTxPortal.tsx          # Main React component (630 lines)
├── app/
│   ├── api/extension/
│   │   ├── analyze/route.ts           # Product analysis endpoint
│   │   ├── checkout/route.ts          # Checkout recording
│   │   └── status/route.ts            # Connection status
│   └── extension/
│       └── page.tsx                   # Extension demo & docs page
└── extension/
    ├── manifest.json                  # Extension configuration
    ├── background.js                  # Service worker (messaging)
    ├── content.js                     # Product detection script
    ├── popup.html                     # Extension popup
    ├── popup.js                       # Popup logic
    ├── sidepanel.html                 # Portal container
    ├── bridge.ts                      # Extension-app bridge
    └── README.md                      # Extension documentation
```

## Installation & Setup

### Step 1: Install Dependencies

The project already has all required dependencies installed:

```bash
cd /vercel/share/v0-project
pnpm install
```

Required packages (already in package.json):
- `framer-motion` - Animations
- `lucide-react` - Icons
- `next` - Framework
- `react` - UI library
- `tailwindcss` - Styling

### Step 2: Run Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

### Step 3: Load Extension in Chrome

1. Open `chrome://extensions` in your browser
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `/vercel/share/v0-project/extension` folder
5. The OneCredit extension is now installed!

### Step 4: View Extension Demo

Visit `http://localhost:3000/extension` to see:
- Interactive demo of the OneCreditTxPortal component
- All 5 states with dev state switcher
- Feature overview and architecture details
- API endpoint documentation
- Integration instructions

## How It Works

### Product Detection Flow

```
User visits shopping site
    ↓
Content script runs (content.js)
    ↓
Detects product (name, price, category, image)
    ↓
Sends to background worker
    ↓
Background worker notifies popup
    ↓
User sees "Product detected: [Product Name]"
```

### Analysis Flow

```
User clicks "Analyze with AI"
    ↓
Portal state: idle → detected → calculating
    ↓
Frontend calculates OP costs (mock data for demo)
    ↓
Portal state: calculating → results
    ↓
User sees ranked cards with OP costs
    ↓
User clicks "Use [Card] →"
    ↓
Portal state: results → confirmed
    ↓
Success message with savings summary
```

### Real Integration Flow (When Connected to Main App)

```
Extension detects product
    ↓
Calls OneCreditBridge.analyzeProduct()
    ↓
Bridge makes POST to /api/extension/analyze
    ↓
Backend fetches user's cards from /api/fiat-cards
    ↓
Backend calculates OP costs using card data
    ↓
Returns ranked cards with detailed breakdowns
    ↓
Extension displays results in portal
```

## Component States

The `OneCreditTxPortal` component has 5 distinct states:

### 1. **Idle State**
- Collapsed pill (40px × 80px) anchored to right edge
- Shows OneCredit logo (✦)
- Hovers to show "OneCredit" label
- Positioned: `fixed right-0 top-1/2 -translate-y-1/2`

### 2. **Detected State**
- Preview card (280px wide) slides in from right
- Shows product name, price, and site badge
- "Analyze with AI →" CTA button
- Small X button to dismiss back to idle

### 3. **Calculating State**
- Full sidebar (380px) slides in from right
- Shows product summary
- Animated loading steps with staggered timing:
  - "Fetching your card portfolio..." (0.8s)
  - "Running OP cost model..." (1.6s)
  - "Evaluating opportunity costs..." (2.4s)
- Auto-transitions to results after 2.8s total

### 4. **Results State**
- Full sidebar with scrollable content
- Winner banner (gradient green background)
- Card list with collapsible rows
- Each card shows: rank, name, issuer, OP cost
- First card expanded by default showing:
  - Rewards earned
  - Net dollar cost
  - Token value here vs best alternative use
  - AI reasoning
  - Why button
- Footer CTA: "Use [Card] →"
- Recalculate link

### 5. **Confirmed State**
- Full sidebar centered on success screen
- Animated checkmark (SVG stroke animation)
- "Card selected!" heading
- Selected card name
- OP savings summary
- "Done" button (returns to idle)

## Dev State Switcher

In development mode, a state switcher appears in the bottom-left corner:

```
[idle] [detected] [calculating] [results] [confirmed]
```

Click any button to jump directly to that state. This helps with testing all states and animations.

## API Endpoints

### POST `/api/extension/analyze`

Analyzes a product and calculates OP costs for all user cards.

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/extension/analyze \
  -H "Content-Type: application/json" \
  -H "X-Extension-ID: abc123..." \
  -H "X-User-ID: usr_88374" \
  -d '{
    "product": {
      "name": "Apple MacBook Pro 14\" M3 Pro",
      "price": 1999.00,
      "category": "electronics",
      "site": "amazon"
    },
    "userId": "usr_88374"
  }'
```

**Response:**
```json
{
  "product": {
    "name": "Apple MacBook Pro 14\" M3 Pro",
    "price": 1999.00,
    "category": "electronics",
    "site": "amazon"
  },
  "cards": [
    {
      "key": "chase-sapphire",
      "name": "Chase Sapphire Reserve",
      "issuer": "Chase",
      "currency": "UR Points",
      "opCost": 4157,
      "rank": 1,
      "rewardsEarned": 1999,
      "netDollarCost": 1979.01,
      "opportunityMultiplier": 2.1
    },
    ...
  ],
  "winner": { ... },
  "savings": 2073
}
```

### POST `/api/extension/checkout`

Records when user selects a card at checkout.

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/extension/checkout \
  -H "Content-Type: application/json" \
  -H "X-Extension-ID: abc123..." \
  -H "X-User-ID: usr_88374" \
  -d '{
    "product": { ... },
    "selectedCard": "chase-sapphire",
    "userId": "usr_88374",
    "savings": 2073
  }'
```

### GET `/api/extension/status`

Checks extension connection status.

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/extension/status \
  -H "X-Extension-ID: abc123..." \
  -H "X-User-ID: usr_88374"
```

**Response:**
```json
{
  "status": "connected",
  "version": "1.0.0",
  "supportedSites": ["amazon", "walmart", "bestbuy", "target"],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Testing the Extension

### Method 1: Extension Demo Page
Visit `http://localhost:3000/extension` to see the component in action with:
- Interactive demo
- Dev state switcher
- Full documentation
- Integration architecture details

### Method 2: Load Actual Extension
1. Load the extension in Chrome (see Installation Step 3)
2. Visit a supported shopping site (Amazon, Walmart, Best Buy, Target)
3. Click the OneCredit extension icon
4. Click "Open Transaction Portal"
5. The sidepanel opens with the OneCreditTxPortal component

### Method 3: Console Testing
In browser DevTools console:

```javascript
// Check if extension is loaded
console.log(chrome.runtime.id);

// Check stored product data
chrome.storage.local.get(['lastDetectedProduct'], (result) => {
  console.log('Product:', result.lastDetectedProduct);
});
```

## Animations

All animations use Framer Motion with these specs:

| Transition | Duration | Easing |
|---|---|---|
| Pill → Preview | 0.3s | easeOut |
| Preview → Calculating | 0.35s | easeOut |
| Loading steps | 0.8s stagger | easeInOut |
| Results cards | 0.1s stagger | easeOut |
| Card expand | 0.2s | easeInOut |
| Winner banner | 0.3s spring | spring |
| Checkmark draw | 0.6s | easeInOut |
| Fade transitions | 0.2s | easeInOut |

## Troubleshooting

### Extension not detecting products

**Problem**: Visit a product page but extension doesn't show detection.

**Solutions**:
1. Verify you're on Amazon, Walmart, Best Buy, or Target
2. Wait 2 seconds for content script to run
3. Check browser console for errors
4. Reload the extension (chrome://extensions → OneCredit → Reload)

### Portal not loading

**Problem**: Click "Open Transaction Portal" but nothing appears.

**Solutions**:
1. Verify dev server is running: `pnpm dev`
2. Check if localhost:3000 is accessible
3. Open DevTools and check console for errors
4. Clear extension storage: chrome://extensions → OneCredit → Clear data

### OP costs show as "undefined"

**Problem**: Portal calculates but shows incorrect OP costs.

**Solutions**:
1. Check that user ID is correct
2. Verify cards are properly linked in main app
3. Check `/api/fiat-cards` response in network tab
4. Click "Recalculate" button to retry

## Performance Tips

- Extension loads only 46KB total
- Sidepanel renders efficiently with React 19 and Framer Motion
- Product detection runs only on supported domains
- Background worker sleeps when idle
- All animations use GPU-accelerated transforms

## Browser Compatibility

- Chrome 120+
- Edge 120+ (same engine as Chrome)
- Chromium-based browsers with Manifest v3 support

## Next Steps

1. ✅ **Extension Files Created** - Manifest, scripts, and popup UI
2. ✅ **React Component Created** - Full OneCreditTxPortal with 5 states
3. ✅ **API Endpoints Created** - Analysis, checkout, status
4. ✅ **Documentation Created** - Setup guide and README
5. **Next**: Connect to real authentication and card data
6. **Next**: Deploy to Chrome Web Store
7. **Next**: Add more supported shopping sites
8. **Next**: Implement real-time sync and notifications

## Support & Issues

- Extension demo: http://localhost:3000/extension
- Main app: http://localhost:3000
- Extension README: `/vercel/share/v0-project/extension/README.md`
- API Routes: `/vercel/share/v0-project/app/api/extension/`
