# Omni-Wallet - AI-Powered Credit Card Rewards Optimizer

A sophisticated web application that uses AI and Model Context Protocol (MCP) tools to optimize credit card rewards based on spending patterns. Built with Next.js 16, MongoDB, and Google Gemini AI.

## 🎯 Overview

Omni-Wallet provides an intelligent dashboard for users to:
- **Manage Credit Cards**: Add and organize multiple credit cards with different reward structures
- **Analyze Spending**: Get AI-powered insights into spending patterns
- **Optimize Rewards**: Receive personalized recommendations for which card to use for each transaction
- **Calculate Potential Earnings**: Understand how much you could earn by optimizing card usage
- **Compare Cards**: Evaluate card performance based on your lifestyle

## 🏗️ Architecture

The application follows a clean, layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│      Frontend (React Components)         │
│  ┌───────────────────────────────────┐  │
│  │ Dashboard, Cards, Analysis Pages  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│    API Routes (Next.js Route Handlers)   │
│  ┌───────────────────────────────────┐  │
│  │ /api/users, /api/cards, /api/tools│  │
│  │ /api/transactions, /api/ai/analyze│  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│    Service Layer (MCP Tools & Gemini)    │
│  ┌───────────────────────────────────┐  │
│  │ MCP Tool Execution, AI Analysis   │  │
│  │ Data Validation & Formatting      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│     Data Layer (MongoDB)                 │
│  ┌───────────────────────────────────┐  │
│  │ User, Card, Transaction, Models   │  │
│  │ Recommendation Schema             │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 📊 MCP Tools (6 Core Tools)

### 1. **analyze_transactions**
Analyzes transaction history to identify spending patterns by category.
- Input: Array of transactions
- Output: Total spent, category breakdown, top category, average transaction

### 2. **calculate_rewards**
Calculates potential rewards across multiple cards for a given transaction.
- Input: Transaction amount, category, available cards
- Output: Top card, earned rewards per card

### 3. **compare_cards**
Compares credit cards based on annual spending patterns.
- Input: User spending by category, cards to compare
- Output: Ranked list with net benefit calculations

### 4. **optimize_spending**
Provides card usage optimization strategy for maximum rewards.
- Input: Spending patterns, available cards
- Output: Optimized recommendations per category

### 5. **validate_transaction**
Security and legitimacy check for transactions.
- Input: Merchant, amount, category
- Output: Legitimacy assessment, risk score

### 6. **format_recommendation**
Formats AI analysis into user-friendly recommendations.
- Input: Raw analysis text
- Output: Formatted recommendation with timestamp

## 🔄 Data Flow Sequence

```
User Input
    ↓
Analysis Request (with Gemini API Key)
    ↓
MCP Tool Execution Layer
    ├── analyze_transactions
    ├── calculate_rewards
    ├── compare_cards
    ├── optimize_spending
    ├── validate_transaction
    └── format_recommendation
    ↓
Gemini AI Processing (with tool calling)
    ↓
AI Reasoning & Generation
    ↓
Formatted Recommendation
    ↓
User Dashboard Display
    ↓
MongoDB Storage (optional)
```

## 🛣️ Routing Structure

### Public Routes
- `/` - Dashboard home with overview
- `/cards` - Card management interface
- `/analysis` - AI analysis & testing interface
- `/test` - MCP tools & API testing
- `/settings` - API key configuration

### API Routes
```
/api/
├── users/route.ts
│   ├── GET  - Fetch user by email
│   ├── POST - Create new user
│   └── PUT  - Update user settings
├── cards/route.ts
│   ├── GET  - Fetch user's cards
│   ├── POST - Add new card
│   ├── PUT  - Update card
│   └── DELETE - Remove card
├── transactions/route.ts
│   ├── GET  - Fetch transactions
│   └── POST - Record transaction
├── ai/analyze/route.ts
│   └── POST - Analyze with Gemini
└── tools/execute/route.ts
    └── POST - Execute MCP tool
```

## 🗂️ Database Models

### User Schema
```typescript
{
  email: String (unique)
  name: String
  cards: [ObjectId] (ref: Card)
  settings: {
    geminiApiKey: String
    currency: String (default: USD)
  }
  createdAt: Date
  updatedAt: Date
}
```

### Card Schema
```typescript
{
  userId: ObjectId (ref: User)
  name: String
  cardNumber: String
  issuer: String
  type: String
  rewards: {
    cashback: Number
    points: Number
    miles: Number
  }
  categories: [{
    name: String
    reward: Number
  }]
  annualFee: Number
  creditLimit: Number
  isActive: Boolean
  createdAt: Date
  updatedAt: Date
}
```

### Transaction Schema
```typescript
{
  userId: ObjectId (ref: User)
  cardId: ObjectId (ref: Card)
  amount: Number
  category: String
  description: String
  merchant: String
  rewardsEarned: Number
  date: Date
  createdAt: Date
  updatedAt: Date
}
```

### Recommendation Schema
```typescript
{
  userId: ObjectId (ref: User)
  title: String
  description: String
  recommendations: [{
    cardId: ObjectId
    reason: String
    estimatedSavings: Number
  }]
  analysis: {
    spendPattern: String
    optimizationScore: Number
    reasoning: String
  }
  generatedBy: String (default: gemini)
  createdAt: Date
  updatedAt: Date
}
```

## 🔐 Getting Started

### Prerequisites
- Node.js 18+ and pnpm
- MongoDB instance (local or cloud)
- Google Gemini API key (free from [Google AI Studio](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repo>
cd omni-wallet
pnpm install
```

2. **Configure environment:**
```bash
# Create .env.local
echo "MONGODB_URI=mongodb://localhost:27017/omni-wallet" > .env.local
```

3. **Start development server:**
```bash
pnpm dev
```

4. **Run tests:**
```bash
pnpm test          # Run all tests
pnpm test:watch    # Watch mode
```

5. **Configure Gemini API Key:**
   - Navigate to http://localhost:3000/settings
   - Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Paste it in the settings page
   - Your key is stored locally in the browser

## 🧪 Testing

### Automated Test Suite
```bash
pnpm test
```

Tests cover:
- ✅ All 6 MCP tools
- ✅ Tool input validation
- ✅ Reward calculations
- ✅ Card comparisons
- ✅ Spending optimization
- ✅ Transaction validation

### Interactive Testing
1. Navigate to http://localhost:3000/test
2. Click "Run All Tests" to execute the full test suite
3. Tests will show real-time results with execution times
4. View detailed test results and error messages

### API Testing
```bash
# Test analyze_transactions
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "analyze_transactions",
    "toolInput": {
      "transactions": [
        {"amount": 100, "category": "dining", "merchant": "Restaurant A"}
      ]
    }
  }'

# Test calculate_rewards
curl -X POST http://localhost:3000/api/tools/execute \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "calculate_rewards",
    "toolInput": {
      "amount": 100,
      "category": "dining",
      "cards": [{"name": "Premium", "categories": [{"name": "dining", "reward": 3}]}]
    }
  }'
```

## 🎨 UI Features

### Dashboard
- Real-time card carousel with gradient designs
- AI-powered recommendations display
- Stats overview (annual rewards, potential savings, optimization score)
- Quick action buttons

### Cards Management
- Add new cards with custom reward structures
- Display card details with visual gradients
- Delete cards (with confirmation)
- View all cards with rewards at a glance

### Analysis Page
- Chat-like interface with Gemini AI
- Real-time MCP tool testing
- View detailed tool execution results
- Load and save API key configuration

### Test Panel
- Comprehensive test suite runner
- Real-time test execution
- Visual pass/fail indicators
- Execution time tracking
- Detailed error messages

## 🎯 Key Features

1. **Multi-Card Management**
   - Support unlimited credit cards
   - Custom reward structures per card
   - Categorized spending analysis

2. **AI-Powered Analysis**
   - Gemini AI integration for natural language analysis
   - MCP tool calling for data processing
   - Real-time recommendations

3. **Spend Optimization**
   - Identify best card for each spending category
   - Calculate potential savings
   - Track optimization opportunities

4. **Card Comparison**
   - Annual benefit analysis
   - Fee vs. reward calculations
   - Personalized rankings

5. **Transaction Tracking**
   - Log and analyze transactions
   - Reward calculation per transaction
   - Spending pattern insights

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Next.js 16, Tailwind CSS |
| UI Components | shadcn/ui, Radix UI |
| Backend | Next.js API Routes |
| Database | MongoDB with Mongoose |
| AI | Google Gemini API |
| Testing | Jest, React Testing Library |
| Package Manager | pnpm |
| Language | TypeScript |

## 📝 Configuration

### Environment Variables
```env
MONGODB_URI=mongodb://localhost:27017/omni-wallet
NODE_ENV=development
```

### API Key Setup
1. Visit http://localhost:3000/settings
2. Get free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
3. Enter email and API key
4. Click "Save Configuration"
5. Your key is stored locally in browser (never sent to external servers)

## 🚀 Deployment

### Vercel Deployment
```bash
git push origin main
# Automatically deploys to Vercel
```

### Manual Deployment
```bash
pnpm build
pnpm start
```

## 📊 API Response Examples

### analyze_transactions
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

### calculate_rewards
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

### compare_cards
```json
[
  {
    "cardName": "Premium Card",
    "annualRewards": 2400,
    "annualFee": 95,
    "netBenefit": 2305,
    "score": "Recommended"
  },
  {
    "cardName": "Basic Card",
    "annualRewards": 1800,
    "annualFee": 0,
    "netBenefit": 1800,
    "score": "Recommended"
  }
]
```

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📄 License

MIT License - feel free to use in personal or commercial projects

## 🆘 Support

- GitHub Issues for bug reports
- Email support at support@omniwallet.com
- Documentation: See this README

## 🔗 Useful Links

- [Google Generative AI Docs](https://ai.google.dev/docs)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Mongoose](https://mongoosejs.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Made with ❤️ for credit card rewards enthusiasts**
# one-credit
