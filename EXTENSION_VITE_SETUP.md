# OneCredit Extension - Vite + React Setup Guide

## Overview

The OneCredit browser extension is now a complete **Vite + React** project that runs independently as a full-featured browser extension. Each page (popup, sidepanel, options) is its own React application built by Vite.

## What's Changed

### Before (Old Setup)
- Basic HTML/JS files
- Static manifest
- No build process
- Mixed vanilla JS and React

### After (New Setup) ✨
- **Vite** build tool for fast dev server & production builds
- **React 19** for all UI pages
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Separate React apps** for popup, sidepanel, options
- **Modern ES modules** throughout
- **Hot module replacement** during development

## Project Structure

```
extension/
├── src/
│   ├── pages/
│   │   ├── popup/
│   │   │   ├── index.html          # Popup entry point
│   │   │   ├── main.tsx            # React root
│   │   │   ├── Popup.tsx           # Component
│   │   │   └── popup.css           # Styles
│   │   ├── sidepanel/
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   ├── SidePanel.tsx
│   │   │   └── sidepanel.css
│   │   └── options/
│   │       ├── index.html
│   │       ├── main.tsx
│   │       ├── Options.tsx
│   │       └── options.css
│   ├── background.ts               # Service worker
│   ├── content.ts                  # Content script
│   └── types/
│       └── index.ts                # Shared types
├── public/
│   └── manifest.json               # Manifest v3
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript config
├── package.json                    # Dependencies & scripts
├── .env.example                    # Environment template
├── .gitignore
└── README.md                       # Extension docs
```

## Quick Start

### 1. Install Dependencies

```bash
cd extension
pnpm install
# or: npm install
# or: yarn install
```

### 2. Start Development

```bash
pnpm dev
```

This starts Vite dev server on `http://localhost:5173`

### 3. Load in Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode" (top-right)
3. Click "Load unpacked"
4. Select `/vercel/share/v0-project/extension/dist` folder

### 4. Start Coding!

The extension auto-reloads as you save changes:
- Edit `src/pages/popup/Popup.tsx` → popup updates instantly
- Edit `src/pages/sidepanel/SidePanel.tsx` → sidepanel updates instantly
- Edit `src/background.ts` → service worker reloads
- Edit `src/content.ts` → content script reloads

## Available Scripts

```bash
# Start Vite dev server (auto-reloads extension)
pnpm dev

# Build for production
pnpm build

# Preview production build locally
pnpm preview

# Create distribution ZIP
pnpm zip
```

## How Each Page Works

### Popup (`src/pages/popup/`)
- **Purpose**: Quick status & action buttons when extension icon clicked
- **Size**: 380px wide
- **Entry**: `src/pages/popup/index.html` → `main.tsx` → `Popup.tsx`
- **Features**:
  - Shows extension status
  - "Open Transaction Portal" button
  - "Settings" button
  - Links to help & website

### Side Panel (`src/pages/sidepanel/`)
- **Purpose**: Main product analysis UI
- **Size**: 384px wide × full height
- **Entry**: `src/pages/sidepanel/index.html` → `main.tsx` → `SidePanel.tsx`
- **Features**:
  - Lists all credit cards
  - Shows recommended card (lowest OP)
  - Shows savings vs worst option
  - Expandable card details
  - "Use This Card" button per card

### Options (`src/pages/options/`)
- **Purpose**: Settings & configuration
- **Size**: Full page
- **Entry**: `src/pages/options/index.html` → `main.tsx` → `Options.tsx`
- **Features**:
  - API key configuration
  - Add/remove credit cards
  - Card earn rate configuration
  - Save settings button

## Service Worker & Content Script

### Background Worker (`src/background.ts`)
- Listens for messages from content scripts
- Communicates with popup & sidepanel
- Makes API calls to main app
- Handles product detection events

### Content Script (`src/content.ts`)
- Runs on shopping sites automatically
- Detects product info (name, price, URL)
- Sends to background script via messaging
- Supported sites: Amazon, Walmart, Best Buy, Target

## Chrome Messaging Flow

```
Shopping Site (Content Script)
    │
    └─> Detects Product
        │
        └─> chrome.runtime.sendMessage("PRODUCT_DETECTED")
            │
            └─> Background Worker
                │
                ├─> Stores in chrome.storage.local
                │
                └─> chrome.runtime.sendMessage("PRODUCT_DETECTED_UPDATE")
                    │
                    └─> Popup / Side Panel (React Components)
                        │
                        └─> User clicks "Open Portal"
                            │
                            └─> Side Panel opens with product data
                                │
                                └─> User selects card
                                    │
                                    └─> chrome.runtime.sendMessage("CARD_SELECTED")
                                        │
                                        └─> Background Worker
                                            │
                                            └─> POST /api/extension/checkout
```

## Build Output

When you run `pnpm build`, Vite creates:

```
dist/
├── manifest.json              # Extension config
├── popup.html                 # Popup page
├── sidepanel.html             # Side panel page
├── options.html               # Options page
├── js/
│   ├── popup.js               # Popup React bundle
│   ├── sidepanel.js           # Side panel React bundle
│   ├── options.js             # Options React bundle
│   ├── background.js          # Service worker
│   ├── content.js             # Content script
│   └── [name].chunk.js        # Code-split chunks
└── css/
    ├── popup.css
    ├── sidepanel.css
    └── options.css
```

This is exactly what Chrome needs to load the extension.

## Environment Variables

Create `.env.local` (copy from `.env.example`):

```env
VITE_API_URL=http://localhost:3000        # Main app API URL
VITE_APP_NAME=OneCredit                   # App name
VITE_EXTENSION_VERSION=1.0.0              # Must match manifest.json
```

These are embedded at build time and available as `import.meta.env.VITE_*`.

## Common Development Tasks

### Adding a New Page

1. Create directory: `src/pages/mynewpage/`
2. Create `index.html`, `main.tsx`, `MyNewPage.tsx`, `mynewpage.css`
3. Add entry in `vite.config.ts` rollupOptions.input:
   ```ts
   mynewpage: path.resolve(__dirname, 'src/pages/mynewpage/index.html'),
   ```
4. Update `manifest.json` to reference new page

### Updating Manifest

Edit `public/manifest.json` and rebuild:

```bash
pnpm build
```

Vite copies it to `dist/` automatically.

### Debugging

**View background script logs:**
- `chrome://extensions` → OneCredit → Details → Errors

**View content script logs:**
- Open any shopping site → DevTools → Console → Filter by "OneCredit"

**View popup logs:**
- Click extension icon → Right-click → "Inspect popup" → Console

**View side panel logs:**
- Open side panel → Right-click → "Inspect element" → Console

### Hot Reload in Development

Vite provides instant feedback:
1. Save `Popup.tsx` → popup updates in 100ms
2. Save `background.ts` → service worker reloads
3. No manual refresh needed!

## Building for Production

### Step 1: Update Versions
```json
// package.json
"version": "1.1.0"

// public/manifest.json
"version": "1.1.0"
```

### Step 2: Build
```bash
pnpm build
```

### Step 3: Test
```bash
pnpm preview
# Load unpacked from /dist and test all features
```

### Step 4: Create ZIP
```bash
pnpm zip
# Creates one-credit-extension.zip for Web Store submission
```

## Performance Tips

- Vite only rebuilds changed files
- React components auto-split into chunks
- Tailwind CSS is purged of unused styles
- Images in `/public` are optimized
- TypeScript types don't impact bundle size

## Troubleshooting

### Extension not loading?
```bash
# Make sure dist/ exists
pnpm build

# Check manifest.json is in dist/
ls -la dist/manifest.json

# Load unpacked from dist/ folder
```

### Changes not reflecting?
```bash
# Make sure dev server is running
pnpm dev

# Hard reload extension
chrome://extensions → OneCredit → refresh icon

# Check for build errors in terminal
```

### React not rendering?
```bash
# Check browser console for errors
# Common: Missing React import or typo in component name
# Check: <div id="root"></div> exists in HTML
```

### API calls failing?
```bash
# Check VITE_API_URL in .env.local
# Verify main app is running: http://localhost:3000
# Check CORS headers in main app
```

## Key Technologies

| Tool | Purpose | Version |
|------|---------|---------|
| Vite | Build tool & dev server | ^5.0.0 |
| React | UI framework | ^19.0.0 |
| TypeScript | Type safety | ^5.3.0 |
| Tailwind CSS | Styling | (via HTML) |
| Framer Motion | Animations | ^11.0.0 |
| Lucide React | Icons | ^0.292.0 |

## Next Steps

1. **Install & Build**: `cd extension && pnpm install && pnpm build`
2. **Load Extension**: `chrome://extensions` → "Load unpacked" → select `/dist`
3. **Start Dev Server**: `pnpm dev`
4. **Start Coding**: Edit `src/pages/*/` components
5. **Test on Sites**: Visit Amazon, Walmart, Best Buy, Target
6. **Build Release**: `pnpm build && pnpm zip`

## Directory Layout Recap

```
one-credit/
├── app/                    # Next.js main app
├── components/             # Main app components
├── extension/              # NEW: Vite + React extension
│   ├── src/
│   │   ├── pages/
│   │   ├── background.ts
│   │   ├── content.ts
│   │   └── types/
│   ├── public/
│   ├── vite.config.ts
│   ├── package.json
│   └── README.md
├── package.json            # Main app
└── ...
```

## Support

For issues:
1. Check `extension/README.md` for detailed docs
2. Check terminal output for build errors
3. Check browser console for runtime errors
4. Verify `.env.local` has correct API URL

---

**Version**: 1.0.0  
**Tech Stack**: Vite + React 19 + TypeScript + Tailwind CSS + Framer Motion  
**Status**: Production Ready ✅
