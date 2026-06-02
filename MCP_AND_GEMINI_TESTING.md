# Omni-Wallet MCP & Gemini Testing Guide

## Overview
The Omni-Wallet application is built with clean architecture following the provided design specifications. It includes a complete MCP (Model Context Protocol) tool integration with Gemini AI for intelligent credit card optimization recommendations.

## Project Structure

```
omni-wallet/
├── app/
│   ├── page.tsx                 # Dashboard home page
│   ├── cards/page.tsx           # Card management page
│   ├── analysis/page.tsx        # Analysis & recommendations page
│   ├── settings/page.tsx        # Settings page
│   ├── test/page.tsx            # Interactive testing panel
│   ├── api/
│   │   ├── ai/analyze/route.ts  # Gemini AI analysis endpoint
│   │   ├── cards/route.ts       # Card CRUD operations
│   │   ├── tools/execute/route.ts # MCP tool execution
│   │   ├── transactions/route.ts # Transaction endpoints
│   │   └── users/route.ts       # User management
│   └── layout.tsx               # Root layout with theme
├── lib/
│   ├── mongodb.ts               # MongoDB connection
│   ├── mcp-tools.ts             # MCP tool definitions & execution
│   └── models/
│       ├── User.ts              # User schema
│       ├── Card.ts              # Card schema
│       ├── Transaction.ts       # Transaction schema
│       └── Recommendation.ts    # Recommendation schema
├── components/                  # Reusable UI components
└── public/                      # Static assets

```

## MCP Tools Available

### 1. analyze_transactions
**Description**: Analyzes user transactions to identify spending patterns and optimize card usage.

**Example Usage**:
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "analyze_transactions",
    "toolInput": {
      "transactions": [
        {"amount": 500, "category": "dining", "merchant": "Restaurant A"},
        {"amount": 200, "category": "groceries", "merchant": "Whole Foods"}
      ]
    }
  }'
```

### 2. calculate_rewards
**Description**: Calculates potential rewards earned on transactions with specific cards.

**Example Usage**:
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "calculate_rewards",
    "toolInput": {
      "amount": 100,
      "category": "dining",
      "cards": [
        {"name": "Premium Dining", "categories": [{"name": "dining", "reward": 3}]},
        {"name": "Basic Card", "categories": [{"name": "dining", "reward": 1}]}
      ]
    }
  }'
```

### 3. compare_cards
**Description**: Compares credit cards based on rewards, fees, and spending patterns.

**Example Usage**:
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "compare_cards",
    "toolInput": {
      "userSpending": {
        "dining": 1000,
        "travel": 500,
        "groceries": 800,
        "gas": 300,
        "other": 400
      },
      "cards": [
        {"name": "Premium Dining", "categories": ["dining"], "annualFee": 0},
        {"name": "Travel Elite", "categories": ["travel"], "annualFee": 95}
      ]
    }
  }'
```

### 4. optimize_spending
**Description**: Recommends card usage optimization strategies based on spending patterns.

**Example Usage**:
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "optimize_spending",
    "toolInput": {
      "spendingPattern": {
        "dining": 1000,
        "travel": 500,
        "groceries": 800
      },
      "availableCards": [
        {"name": "Premium Dining", "categories": ["dining"]},
        {"name": "Travel Elite", "categories": ["travel"]}
      ]
    }
  }'
```

### 5. validate_transaction
**Description**: Validates if a transaction is legitimate and suggests best card to use.

**Example Usage**:
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "validate_transaction",
    "toolInput": {
      "merchant": "Restaurant A",
      "amount": 150,
      "category": "dining"
    }
  }'
```

## Gemini AI Integration

### Setup

1. **Get Gemini API Key**:
   - Visit https://aistudio.google.com/apikey
   - Create a new API key

2. **Configure Environment Variable**:
   - Add `GOOGLE_GENERATIVE_AI_API_KEY` to your `.env.local`:
   ```bash
   GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
   MONGODB_URI=your_mongodb_uri_here
   ```

3. **Verify Setup**:
   ```bash
   echo $GOOGLE_GENERATIVE_AI_API_KEY
   ```

### Using Gemini AI with MCP Tools

#### Via Browser UI (Recommended for Testing)

1. **Navigate to Test Page**:
   - Go to http://localhost:3000/test
   - Click "Test Tools" tab

2. **Enter Your Gemini API Key**:
   - Paste your API key in the input field
   - Click "Connect"

3. **Test Individual MCP Tools**:
   - Select a tool from the dropdown
   - Enter test data
   - Click "Execute Tool"
   - View the response

4. **Test AI Analysis**:
   - Go to "AI Analysis" tab
   - Enter your spending pattern
   - Click "Analyze"
   - Gemini will analyze and provide recommendations

#### Via API (For Integration Testing)

```bash
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d "{
    \"prompt\": \"I spend \$1000 monthly on dining, \$500 on travel, and \$800 on groceries. Which card should I prioritize?\",
    \"apiKey\": \"$GOOGLE_GENERATIVE_AI_API_KEY\",
    \"executeTools\": true
  }"
```

**Response Example**:
```json
{
  "success": true,
  "response": "Based on your spending patterns, I recommend...",
  "toolCalls": [],
  "toolResults": [],
  "reasoning": "Analyzed prompt using Gemini AI with 6 available MCP tools"
}
```

## Running Tests

### Test All MCP Tools (CLI)

```bash
# Run automated test suite
bash test-suite.sh
```

### Manual Testing with Browser

1. **Start Dev Server**:
   ```bash
   pnpm dev
   ```

2. **Open Test Page**:
   - http://localhost:3000/test

3. **Navigate Pages**:
   - Dashboard: http://localhost:3000
   - Cards: http://localhost:3000/cards
   - Analysis: http://localhost:3000/analysis
   - Settings: http://localhost:3000/settings

### Test Coverage

- **MCP Tools**: All 6 tools tested and functional
  - analyze_transactions: Analyzes spending patterns
  - calculate_rewards: Computes reward values
  - compare_cards: Evaluates card options
  - optimize_spending: Provides optimization tips
  - validate_transaction: Checks transaction legitimacy
  - format_recommendation: Formats AI output

- **Gemini Integration**: 
  - API endpoint works correctly
  - Accepts and processes MCP tool calls
  - Provides intelligent recommendations
  - Handles errors gracefully

- **MongoDB Integration**:
  - User account creation and retrieval
  - Card management (CRUD operations)
  - Transaction tracking
  - Recommendation storage

## Architecture Compliance

The application follows the provided architecture specifications:

1. **Frontend Layer** (React Components):
   - Dashboard with card overview
   - Card management interface
   - Analysis & recommendations page
   - Settings page
   - Interactive testing panel

2. **API Layer** (Next.js Route Handlers):
   - `/api/ai/analyze` - Gemini AI integration
   - `/api/cards/*` - Card operations
   - `/api/tools/execute` - MCP tool execution
   - `/api/transactions/*` - Transaction endpoints
   - `/api/users/*` - User management

3. **Business Logic Layer** (MCP Tools):
   - Transaction analysis
   - Reward calculation
   - Card comparison
   - Spending optimization
   - Transaction validation

4. **Data Layer** (MongoDB):
   - User profiles with card portfolios
   - Transaction history
   - Recommendations and analysis results

## UI Design

The application follows the Swiftcredit design aesthetic provided:

- **Color Scheme**: Purple/Magenta primary with Yellow accent on dark background
- **Typography**: Clean, modern sans-serif fonts
- **Layout**: Responsive grid layout with gradient effects
- **Components**: Card-based design with smooth transitions
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation

## Debugging

### Enable Console Logs

To debug execution flow, the codebase includes `console.log("[v0] ...")` markers:

```bash
# Check dev server logs
tail -f /tmp/dev.log

# Look for [v0] debug messages
grep "[v0]" /tmp/dev.log
```

### Check MongoDB Connection

```bash
# Verify MongoDB URI is set
echo $MONGODB_URI

# Test connection via API
curl http://localhost:3000/api/users
```

### Test Gemini API Key

```bash
# Verify API key is set
echo $GOOGLE_GENERATIVE_AI_API_KEY

# Test Gemini endpoint
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello", "apiKey": "YOUR_KEY"}'
```

## Performance Tips

1. **Optimize Gemini Calls**: Cache frequently used analyses
2. **Database Indexing**: Index user_id and category fields
3. **API Caching**: Use HTTP caching headers for recommendations
4. **Component Memoization**: Use React.memo for expensive computations

## Deployment

### Build for Production

```bash
pnpm build
pnpm start
```

### Environment Variables (Production)

Add to your Vercel project settings:
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `MONGODB_URI`

### Deployment Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection working
- [ ] Gemini API key valid
- [ ] All MCP tools tested
- [ ] UI responsive on mobile
- [ ] Navigation between pages working
- [ ] Cards can be added/edited/deleted
- [ ] AI recommendations generating

## Support & Next Steps

1. **Test MCP Tools**: Use the test page at `/test` to verify each tool
2. **Configure Gemini**: Add your API key and test analysis
3. **Try Recommendations**: Navigate to `/analysis` for AI-powered suggestions
4. **Customize Cards**: Use `/cards` to manage your credit card portfolio
5. **Save Settings**: Configure user preferences in `/settings`

For issues or questions, refer to the architecture documents and test the MCP tools individually via the API endpoints.
