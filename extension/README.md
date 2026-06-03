# OneCredit Browser Extension

A Chrome extension that detects products on shopping sites and helps users figure out which credit card costs the least in **OP tokens** to make the purchase.

## Features

### 🛍️ Product Detection
- Automatically detects products on Amazon, Walmart, Best Buy, and Target
- Extracts product name, price, category, and image
- Works seamlessly in the background without user interaction

### 🎯 Smart Analysis
- Analyzes user's entire credit card portfolio
- Calculates OP (Optimal Points) costs for each card
- Factors in opportunity costs and token scarcity
- Provides AI-powered reasoning for each recommendation

### 💎 OP Token System
OP tokens represent a unified cost unit that factors in:
- **Net dollar cost** after rewards earned back
- **Opportunity cost** if tokens are rare/valuable elsewhere
- **Category earn multipliers** (3x vs 1x on specific categories)
- **Token scarcity** penalties for hard-to-earn points

### 🏆 Ranked Recommendations
- Displays all cards ranked by OP cost
- Winner banner highlighting the best option
- Expandable card details with earnings and token values
- Savings summary showing how much you save vs worst option

## Directory Structure

```
extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker handling messaging
├── content.js             # Product detection script
├── popup.html & popup.js  # Extension popup UI
├── sidepanel.html         # Portal container
└── bridge.ts              # Main app communication layer
```

## Component Architecture

### `OneCreditTxPortal` (React Component)
The main UI component with 5 distinct states:

1. **idle** - Collapsed pill on right edge (40px × 80px)
2. **detected** - Preview card with product info (280px wide)
3. **calculating** - Full sidebar with loading animation (380px wide)
4. **results** - Card ranking with expandable details
5. **confirmed** - Success screen with savings summary

### State Transitions

```
idle
  ↓ (click pill)
detected
  ↓ (click "Analyze with AI")
calculating (auto-transitions after 2.8s)
  ↓
results
  ↓ (click "Use [Card] →")
confirmed
  ↓ (click "Done")
idle
```

## API Integration

The extension connects to the main app via three API endpoints:

### `POST /api/extension/analyze`
Analyzes a product and calculates OP costs for all user cards.

**Request:**
```json
{
  "product": {
    "name": "Apple MacBook Pro 14\" M3 Pro",
    "price": 1999.00,
    "category": "electronics",
    "site": "amazon"
  },
  "userId": "usr_88374"
}
```

**Response:**
```json
{
  "product": { ... },
  "cards": [ ... ],
  "winner": { ... },
  "savings": 2073
}
```

### `POST /api/extension/checkout`
Records when user selects a card at checkout.

**Request:**
```json
{
  "product": { ... },
  "selectedCard": "chase-sapphire",
  "userId": "usr_88374",
  "savings": 2073
}
```

### `GET /api/extension/status`
Checks extension connection status.

**Response:**
```json
{
  "status": "connected",
  "version": "1.0.0",
  "supportedSites": ["amazon", "walmart", "bestbuy", "target"]
}
```

## Installation & Setup

### For Development

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build the React component: `pnpm build`
4. Load the extension:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension` folder

### For Users

1. Visit Chrome Web Store (when published)
2. Click "Add to Chrome"
3. Grant permissions for supported shopping sites
4. Log in with your OneCredit account
5. Start shopping!

## Usage

### On a Product Page

1. **Extension Icon**: Click the OneCredit icon in the browser toolbar
2. **Popup**: The popup shows if a product is detected
3. **Open Portal**: Click "Open Transaction Portal"
4. **Analyze**: Click "Analyze with AI" button
5. **View Results**: See ranked cards with OP costs
6. **Expand Details**: Click any card to see detailed breakdown
7. **Select Card**: Click "Use [Card] →" to highlight at checkout
8. **Confirm**: See success message with savings summary

## Animations & Interactions

All transitions use Framer Motion:

| Transition | Animation |
|---|---|
| Pill → Preview | Width expands 40px → 280px |
| Preview → Calculating | Slide in from right (0.35s) |
| Loading steps | Staggered fade+slide (0.8s apart) |
| Results cards | Stagger children (0.1s apart) |
| Card expand | Height animation with layout |
| Winner banner | Scale-in + shimmer |
| Checkmark | SVG stroke animation (0.6s) |
| Back to idle | Fade out + collapse |

## Development

### Dev State Switcher

In development mode, a state switcher appears in the bottom-left corner to quickly jump between all 5 states:

```
[idle] [detected] [calculating] [results] [confirmed]
```

### Console Logging

The extension logs product detection and messaging:

```javascript
console.log('[OneCredit] Product detected:', product);
console.log('[OneCredit Extension] Checkout recorded:', transaction);
```

## Browser Extension Permissions

The extension requests minimal permissions:

- `activeTab` - Access current tab information
- `scripting` - Run content scripts on shopping sites
- `storage` - Store user preferences and product data
- `webRequest` - Monitor network requests

### Host Permissions

Limited to shopping sites:
- `https://www.amazon.com/*`
- `https://www.walmart.com/*`
- `https://www.bestbuy.com/*`
- `https://www.target.com/*`

## Troubleshooting

### Extension Not Detecting Products

1. Check if you're on a supported site (Amazon, Walmart, Best Buy, Target)
2. Make sure the product page fully loads
3. Try refreshing the page
4. Check browser console for errors

### Portal Not Loading

1. Verify your internet connection
2. Check if the main app is running (`localhost:3000`)
3. Clear extension storage: `chrome://extensions` → OneCredit → Clear data
4. Reload the extension

### OP Costs Not Calculating

1. Verify your user ID is correct in the app
2. Check if cards are properly linked in Settings
3. Ensure your card portfolio has valid data
4. Try the "Recalculate" button in the portal

## Future Enhancements

- [ ] Support for more shopping sites (Costco, Gap, Sephora, etc.)
- [ ] Real-time price comparison
- [ ] Historical purchase tracking
- [ ] Cashback optimization alerts
- [ ] Browser sync across devices
- [ ] Mobile app integration
- [ ] Advanced filtering and preferences
- [ ] One-click checkout integration

## License

MIT License - See LICENSE file for details

## Support

For issues or feature requests, visit the main app's support page or create an issue on GitHub.
