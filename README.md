# Omni-Wallet

AI-powered credit card optimizer that helps you maximize rewards and minimize costs through intelligent card selection and portfolio management.

## Features

- **AI-Powered Optimization**: Uses Google Gemini AI to analyze purchases and recommend the optimal credit card for every transaction
- **Real-Time Data Sync**: Fivetran integration keeps your balances, reward rates, and offers up-to-date
- **Portfolio Management**: Track all your credit cards in one place with detailed analytics
- **6-Stage Interchange Flow**: Sophisticated optimization engine that parses intent, syncs rates, reads balances, scores by category, tracks rewards, and auto-reconciles
- **Browser Extension**: Chrome extension for real-time card recommendations while shopping
- **Card Comparison**: Side-by-side comparison of cards with earn rates, perks, and transfer partners
- **Insights & Analytics**: AI-powered spending analysis and optimization suggestions
- **Offer Discovery**: Personalized offer recommendations from your card issuers

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Framer Motion** - Animations
- **Lucide React** - Icons

### Backend
- **Next.js API Routes** - Serverless API
- **MongoDB** - Data persistence with Mongoose
- **NextAuth.js** - Authentication
- **Google Gemini AI** - AI optimization engine
- **Fivetran** - Data synchronization

### Infrastructure
- **Vercel Analytics** - Performance monitoring
- **Dynatrace RUM** - Real user monitoring and persona inference
- **Upstash Redis** - Rate limiting

### Browser Extension
- **Vite** - Build tool
- **Chrome Extension Manifest V3** - Extension framework
- **React** - Extension UI

## Prerequisites

- Node.js 18+
- pnpm 9+
- MongoDB (local or Atlas)
- Google Gemini API key
- Fivetran account (for data sync)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd one-credit
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**
   See [Environment Variables](#environment-variables) below

5. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   ```

6. **Seed the database (optional)**
   ```bash
   pnpm seed
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/omni-wallet

# Google Gemini AI
GOOGLE_API_KEY=your_gemini_api_key_here

# Fivetran
FIVETRAN_API_KEY=your_fivetran_api_key_here
FIVETRAN_AIRLINE_CONNECTOR_ID=your_airline_connector_id
FIVETRAN_BANK_CONNECTOR_ID=your_bank_connector_id
FIVETRAN_HOTEL_CONNECTOR_ID=your_hotel_connector_id
FIVETRAN_REWARDS_CONNECTOR_ID=your_rewards_connector_id
FIVETRAN_REWARDS_SYNC_INTERVAL_SECONDS=300

# App
NODE_ENV=development
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000

# Extension
NEXT_PUBLIC_EXTENSION_ID=your-extension-id-here

# MCP Server (path to Python server)
MCP_SERVER_PATH=./lib/mcp/fivetran-server.py

# Seed endpoint protection
SEED_SECRET=generate_with_openssl_rand_hex_32

# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# Development Origins (comma-separated list of allowed origins for dev)
ALLOWED_DEV_ORIGINS=192.168.29.73

# Dynatrace RUM (for persona inference)
DT_ENV_URL=https://<your-env-id>.live.dynatrace.com
DT_API_TOKEN=dt0c01.<token>
```

### Generating Secrets

Generate secure secrets using OpenSSL:

```bash
# NEXTAUTH_SECRET (32 bytes base64)
openssl rand -base64 32

# SEED_SECRET (32 bytes hex)
openssl rand -hex 32
```

## Running the Application

### Development

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
pnpm build
pnpm start
```

### Running Tests

```bash
# Run tests once
pnpm test

# Run tests in watch mode
pnpm test:watch
```

### Linting

```bash
# Check for lint errors
pnpm lint

# Fix lint errors automatically
pnpm lint:fix
```

## Browser Extension Setup

### Building the Extension

```bash
cd extension
pnpm build
```

### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked"
4. Select the `extension/dist` folder
5. Copy the extension ID from the extensions page
6. Add the extension ID to your `.env` file as `NEXT_PUBLIC_EXTENSION_ID`

### Extension Features

- Real-time card recommendations while shopping
- Product detection and automatic analysis
- Side panel for quick portfolio access
- Seamless integration with the web platform

## Project Structure

```
one-credit/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   ├── auth/                 # Authentication pages
│   ├── cards/                # Card management
│   ├── compare/              # Card comparison
│   ├── help/                 # Help documentation
│   ├── insights/             # Analytics and insights
│   ├── offers/               # Offer discovery
│   ├── pay/                  # Payment optimization
│   ├── settings/             # User settings
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Dashboard
├── components/               # React components
│   ├── pay/                  # Payment-related components
│   ├── ui/                   # shadcn/ui components
│   ├── CardDetailModal.tsx   # Card details modal
│   ├── Navigation.tsx        # Main navigation
│   ├── providers.tsx         # Context providers
│   └── theme-provider.tsx    # Theme configuration
├── contexts/                 # React contexts
│   └── PersonaContext.tsx    # User persona context
├── extension/                # Chrome extension
│   ├── src/                  # Extension source
│   ├── public/               # Extension assets
│   ├── manifest.json         # Extension manifest
│   └── vite.config.ts        # Vite configuration
├── hooks/                    # Custom React hooks
│   ├── use-toast.ts          # Toast notifications
│   ├── useRUM.ts             # Real user monitoring
│   └── useWallet.ts          # Wallet data hook
├── lib/                      # Utility libraries
│   ├── fivetran/             # Fivetran integration
│   ├── fixtures/             # Test fixtures
│   ├── mcp/                  # MCP server
│   ├── mock-apis/            # Mock API implementations
│   ├── cardTransformers.ts  # Card data transformations
│   ├── cards.ts              # Card definitions
│   ├── env.ts                # Environment validation
│   └── errors.ts             # Error handling
├── scripts/                  # Utility scripts
│   ├── add-op-redemption.ts  # OP redemption script
│   ├── create-demo-user.ts   # Demo user creation
│   ├── seed-cards.ts         # Card seeding
│   └── test-rum-agent.ts     # RUM testing
├── public/                   # Static assets
├── .env.example              # Environment variables template
├── components.json           # shadcn/ui configuration
├── eslint.config.js          # ESLint configuration
├── jest.config.js            # Jest configuration
├── next.config.mjs           # Next.js configuration
├── package.json              # Dependencies and scripts
├── pnpm-lock.yaml            # Lock file
├── postcss.config.mjs        # PostCSS configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## The 6-Stage Interchange Flow

Omni-Wallet uses a sophisticated 6-stage process to optimize credit card selection:

1. **Parse Intent**: Process the purchase amount in USD and identify the transaction category
2. **Fivetran Syncs Rates**: Fresh award charts and exchange rates are synchronized to MongoDB
3. **Read Balances**: Fetch current portfolio balances in USD across all linked cards
4. **Score by Category**: Gemini AI ranks cards by net cost for your specific purchase
5. **Track Rewards**: Calculate earned rewards and update portfolio balances
6. **Resync After Redemption**: Fivetran re-syncs affected data sources with auto-reconciliation

## API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signup` - Sign up
- `GET /api/auth/session` - Get current session

### Cards
- `GET /api/fiat-cards` - Get user's fiat cards
- `GET /api/extension/card-count` - Get card count for extension

### Payments
- `POST /api/pay/calculate` - Calculate optimal card for purchase
- `POST /api/pay/execute` - Execute payment with optimal card

### Settings
- `GET /api/settings/profile` - Get user profile
- `PUT /api/settings/profile` - Update user profile

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm lint:fix` - Fix ESLint errors
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm seed` - Seed database with cards

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For help and questions:
- Visit the [Help page](http://localhost:3000/help) for documentation
- Check the [Issues](https://github.com/your-repo/issues) page for known issues

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)
- AI powered by [Google Gemini](https://ai.google.dev/)
- Data sync by [Fivetran](https://fivetran.com/)
