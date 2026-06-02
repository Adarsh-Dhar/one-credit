# Omni-Wallet - Setup & Testing Guide

## 🚀 Quick Start

### 1. Start the Development Server

```bash
cd /vercel/share/v0-project
pnpm dev
```

The app will be available at `http://localhost:3000`

### 2. Get Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API key"
4. Copy the generated key (it will look like: `AIzaSy...`)

### 3. Configure the API Key

1. Open http://localhost:3000/settings
2. Enter your email (e.g., `your.email@gmail.com`)
3. Paste your Gemini API key
4. Click "Save Configuration"
5. The key is stored locally in your browser (never sent to external servers)

## ✅ Testing All Functionality

### Test 1: Dashboard Overview
- Navigate to http://localhost:3000
- Verify you see:
  - Three sample credit cards (Premium Dining, Travel Elite, Cashback Plus)
  - AI Recommendations section showing potential savings
  - Stats: Annual Rewards ($3,150), Potential Savings ($1,500), Optimization Score (78%)

### Test 2: MCP Tools - API Tests

Run these curl commands to test each MCP tool:

**Test analyze_transactions:**
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "analyze_transactions",
    "toolInput": {
      "transactions": [
        {"amount": 100, "category": "dining", "merchant": "Restaurant A"},
        {"amount": 50, "category": "dining", "merchant": "Restaurant B"},
        {"amount": 200, "category": "travel", "merchant": "Airline"}
      ]
    }
  }'
```

Expected Output:
```json
{
  "totalTransactions": 3,
  "totalSpent": 350,
  "categoryBreakdown": {
    "dining": 150,
    "travel": 200
  },
  "topCategory": "travel",
  "averageTransaction": 116.67
}
```

**Test calculate_rewards:**
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

Expected Output:
```json
{
  "topCard": {
    "cardName": "Premium Dining",
    "earnedRewards": 3
  },
  "allRewards": [
    {"cardName": "Premium Dining", "earnedRewards": 3},
    {"cardName": "Basic Card", "earnedRewards": 1}
  ]
}
```

**Test compare_cards:**
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "compare_cards",
    "toolInput": {
      "userSpending": {
        "dining": 1000,
        "travel": 500,
        "groceries": 800
      },
      "cards": [
        {
          "name": "Travel Card",
          "categories": [
            {"name": "travel", "reward": 3},
            {"name": "dining", "reward": 1},
            {"name": "groceries", "reward": 1}
          ],
          "annualFee": 95
        },
        {
          "name": "Cashback Card",
          "categories": [
            {"name": "travel", "reward": 1},
            {"name": "dining", "reward": 2},
            {"name": "groceries", "reward": 2}
          ],
          "annualFee": 0
        }
      ]
    }
  }'
```

Expected Output:
```json
[
  {
    "cardName": "Cashback Card",
    "annualRewards": 3000,
    "annualFee": 0,
    "netBenefit": 3000,
    "score": "Recommended"
  },
  {
    "cardName": "Travel Card",
    "annualRewards": 2500,
    "annualFee": 95,
    "netBenefit": 2405,
    "score": "Recommended"
  }
]
```

**Test optimize_spending:**
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
        {"name": "Card A", "categories": [{"name": "dining", "reward": 3}, {"name": "travel", "reward": 2}]},
        {"name": "Card B", "categories": [{"name": "groceries", "reward": 2}, {"name": "dining", "reward": 1}]}
      ]
    }
  }'
```

Expected Output:
```json
{
  "optimizations": [
    {
      "category": "dining",
      "spending": 1000,
      "bestCard": "Card A",
      "potentialRewards": 30
    },
    {
      "category": "travel",
      "spending": 500,
      "bestCard": "Card A",
      "potentialRewards": 10
    },
    {
      "category": "groceries",
      "spending": 800,
      "bestCard": "Card B",
      "potentialRewards": 16
    }
  ],
  "totalPotentialRewards": 56
}
```

**Test validate_transaction:**
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "validate_transaction",
    "toolInput": {
      "merchant": "Amazon",
      "amount": 99.99,
      "category": "shopping"
    }
  }'
```

Expected Output:
```json
{
  "isLegitimate": true,
  "riskScore": "low",
  "merchant": "Amazon",
  "amount": 99.99,
  "category": "shopping",
  "message": "Transaction appears legitimate"
}
```

**Test format_recommendation:**
```bash
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "format_recommendation",
    "toolInput": {
      "analysis": "Use the Premium Dining card for all restaurant purchases to maximize rewards at 3% cashback."
    }
  }'
```

Expected Output:
```json
{
  "formattedRecommendation": "Use the Premium Dining card for all restaurant purchases to maximize rewards at 3% cashback.",
  "timestamp": "2026-06-02T..."
}
```

### Test 3: Automated Test Suite

Run the comprehensive test suite:

```bash
pnpm test
```

All 7 tests should pass:
- ✓ analyze_transactions works correctly
- ✓ calculate_rewards calculates correctly
- ✓ compare_cards compares correctly
- ✓ optimize_spending provides recommendations
- ✓ validate_transaction validates correctly
- ✓ format_recommendation formats correctly
- ✓ All 6 MCP tools are defined

### Test 4: Interactive Testing UI

1. Navigate to http://localhost:3000/test
2. Click "Run All Tests"
3. Watch as all 8 tests execute:
   - 6 MCP tool tests
   - 2 API endpoint tests
4. Verify all tests show "passed" status
5. Check execution times for each test

### Test 5: Gemini AI Integration (After Configuring API Key)

1. Navigate to http://localhost:3000/analysis
2. You should see:
   - A text area for "API Key" (to load saved key)
   - A "Analysis Prompt" textarea
   - MCP tool buttons on the right sidebar

3. Click "Load Saved" to load your configured API key
4. Enter a prompt like:
   ```
   I spend $3000/month on dining, $2000/month on travel, and $1000/month on groceries. 
   I have three cards: Premium Dining (3% on dining), Travel Elite (3% on travel), and 
   Cashback Plus (1.5% on everything). Which card should I use for each category?
   ```

5. Click "Analyze" to get AI-powered recommendations

6. The right sidebar shows MCP tool quick tests:
   - Click individual tool buttons to test them
   - View results in JSON format below

### Test 6: Card Management

1. Navigate to http://localhost:3000/cards
2. View the three demo cards
3. Try adding a new card:
   - Card Name: "Dining Elite Pro"
   - Issuer: "Chase"
   - Card Number (last 4): "5678"
   - Cashback %: "4"
4. Click "Add Card"
4. Verify new card appears in the list

### Test 7: User API Endpoints

**Test Get/Create User:**
```bash
# Get user by email
curl -X GET "http://localhost:3000/api/users?email=test@example.com"

# Create new user (if needed)
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@example.com", "name": "New User"}'
```

## 📊 Testing Checklist

- [ ] Dashboard loads with correct styling and cards
- [ ] Navigation between pages works smoothly
- [ ] All 6 MCP tools return correct results
- [ ] API test suite shows 8/8 passing
- [ ] Automated test suite passes all 7 tests
- [ ] Settings page saves API key configuration
- [ ] Gemini API responds to analysis prompts
- [ ] Card management allows add/remove operations
- [ ] Recommendation calculations are accurate
- [ ] UI is responsive on different screen sizes

## 🐛 Troubleshooting

### Issue: Dev server won't start
```bash
# Clear cache and reinstall
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

### Issue: Tests fail
```bash
# Make sure Google AI SDK is installed
pnpm add @google/generative-ai

# Run tests again
pnpm test
```

### Issue: Gemini API returns error
1. Verify API key is correct from Google AI Studio
2. Check that API key doesn't have extra spaces
3. Try creating a new API key
4. Ensure you're using a free/valid Google account

### Issue: MongoDB connection error (when needed)
```bash
# The demo uses mocked data, but if implementing real DB:
# Ensure MongoDB is running on localhost:27017
# Or update MONGODB_URI in .env.local
```

## 📝 Example Workflow

1. **User creates account** → Dashboard loads demo cards
2. **User navigates to /settings** → Configures Gemini API key
3. **User goes to /analysis** → Enters spending pattern prompt
4. **Gemini analyzes** → Uses MCP tools to process data
5. **AI generates recommendations** → User sees optimized card usage
6. **User implements** → Updates spending to use recommended cards
7. **User tracks** → Sees rewards calculation on dashboard

## 🎓 Learning Path

- Start with `/test` to understand MCP tools
- Move to `/analysis` to see AI integration
- Try adding cards on `/cards` to build your portfolio
- Check the `/settings` to understand configuration
- Review the README.md for architecture details

## 📞 Support

- Check console logs for detailed error messages
- All API responses include error details
- Test panel shows execution times and failures
- README.md has troubleshooting guide

---

**Happy testing! 🚀**
