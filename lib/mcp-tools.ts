// lib/mcp-tools.ts
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';

// ─── Tool schema definitions (sent to Gemini as tool declarations) ───────────

export const MCPTools = [
  {
    name: 'refresh_rates',
    description:
      '[STAGE 2] Sync live award charts and exchange rates from Fivetran into MongoDB BEFORE Gemini scores spending. Must complete before getUserBalances.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'getUserBalances',
    description:
      '[STAGE 3] Fetch all raw card balances from MongoDB. Returns miles, points, and cash with their OP conversion rates. Note: opValue is the balance converted to OP (existing rewards), not the OP earned from a new spend.',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'MongoDB user _id or email' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'updateBalances',
    description:
      '[STAGE 5] Apply per-card raw debits after OP allocation. cardDebits is an object where keys are card keys and values are { debit: number } in native currency units.',
    parameters: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        cardDebits: {
          type: 'object',
          description: 'e.g. { "clearCash": { "debit": 1.50 }, "skyward": { "debit": 500 } }',
        },
      },
      required: ['userId', 'cardDebits'],
    },
  },
  {
    name: 'sync_after_redemption',
    description:
      '[STAGE 6] Trigger Fivetran re-sync for one or more affected sources after a spend. Accepts array of sources.',
    parameters: {
      type: 'object',
      properties: {
        sources: {
          type: 'array',
          items: { type: 'string', enum: ['bank', 'rewards', 'airline', 'hotel'] },
          description: 'All connectors that were involved in the redemption',
        },
      },
      required: ['sources'],
    },
  },
  {
    name: 'get_sync_status',
    description: 'Check if Fivetran connector data is fresh (under 2 hours old) before scoring.',
    parameters: {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['airline', 'bank', 'hotel', 'rewards'] },
      },
    },
  },

  // ── New Rewards tools ────────────────────────────────────────────────────────

  {
    name: 'sync_rewards',
    description:
      '[REWARDS SYNC] Trigger a Fivetran sync for the rewards mock APIs (Cardlytics, Visa/Mastercard, Rakuten/Impact) and ingest the latest offers into MongoDB. Call this before querying offers if data might be stale.',
    parameters: {
      type: 'object',
      properties: {
        sources: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['cardlytics', 'network', 'affiliate'],
          },
          description: 'Which reward sources to sync. Omit to sync all three.',
        },
      },
    },
  },

  {
    name: 'get_rewards_offers',
    description:
      '[REWARDS QUERY] Query active rewards offers from MongoDB (populated by Fivetran). Use to answer questions like "best cashback for dining", "Visa offers in UK", or "top affiliate deals with high EPC".',
    parameters: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          enum: ['cardlytics', 'network', 'affiliate'],
          description: 'Filter by data source. Omit for all sources.',
        },
        category: {
          type: 'string',
          description: 'Offer category: travel, dining, grocery, shopping, entertainment, gas, pharmacy, beauty, finance, food, subscription, etc.',
        },
        minRewardRate: {
          type: 'number',
          description: 'Minimum reward/cashback rate (0.05 = 5%). For CPA deals, minimum dollar value.',
        },
        country: {
          type: 'string',
          description: 'ISO 3166-1 alpha-2 country code for geo-targeted network offers (e.g. "US", "GB").',
        },
        network: {
          type: 'string',
          description: 'Card network (VISA, MASTERCARD) or affiliate network (rakuten, impact).',
        },
        limit: {
          type: 'number',
          description: 'Max results to return (default 20, max 50).',
        },
        sortBy: {
          type: 'string',
          enum: ['rewardRate', 'lastSyncedAt'],
          description: 'Sort order. Default: rewardRate descending.',
        },
      },
    },
  },

  {
    name: 'search_rewards_by_merchant',
    description:
      '[REWARDS SEARCH] Find all rewards offers for a specific merchant across all three sources (Cardlytics + Network + Affiliate). Useful for "what offers does Starbucks have?" or "find Best Buy deals".',
    parameters: {
      type: 'object',
      properties: {
        merchantName: {
          type: 'string',
          description: 'Merchant name to search (case-insensitive partial match).',
        },
      },
      required: ['merchantName'],
    },
  },
];

// ─── Tool executor (called by /api/tools/execute) ────────────────────────────

export const executeMCPTool = async (
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<unknown> => {
  switch (toolName) {
    case 'refresh_rates':
      return await refreshRates();
    case 'getUserBalances':
      return await getUserBalances(toolInput.userId as string);
    case 'updateBalances':
      return await updateBalances(
        toolInput.userId as string,
        toolInput.cardDebits as Record<string, unknown>
      );
    case 'sync_after_redemption':
      return await syncAfterRedemption(toolInput.sources as string[]);
    case 'get_sync_status':
      return await getSyncStatus(toolInput.source as string | undefined);

    // New rewards tools
    case 'sync_rewards':
      return await syncRewards(toolInput.sources as Array<'cardlytics' | 'network' | 'affiliate'> | undefined);
    case 'get_rewards_offers':
      return await getRewardsOffers(toolInput as any);
    case 'search_rewards_by_merchant':
      return await searchRewardsByMerchant(toolInput.merchantName as string);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
};

// ─── Gemini caller ────────────────────────────────────────────────────────────

export const callGeminiWithTools = async (
  apiKey: string,
  prompt: string,
  tools: typeof MCPTools
): Promise<{ response: string; toolCallsMade: string[] }> => {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{ functionDeclarations: tools as any }],
    systemInstruction: REWARDS_SYSTEM_PROMPT,
  });

  const chat = model.startChat();
  let result = await chat.sendMessage(prompt);
  const toolCallsMade: string[] = [];

  // Agentic loop — keep executing tool calls until Gemini stops requesting them
  while (result.response.functionCalls()?.length) {
    const calls = result.response.functionCalls()!;
    const toolResponses = await Promise.all(
      calls.map(async (call) => {
        toolCallsMade.push(call.name);
        const output = await executeMCPTool(call.name, call.args as Record<string, unknown>);
        return {
          functionResponse: { name: call.name, response: { result: output } },
        };
      })
    );
    result = await chat.sendMessage(toolResponses);
  }

  return {
    response: result.response.text(),
    toolCallsMade,
  };
};

// ─── System prompt ────────────────────────────────────────────────────────────

const REWARDS_SYSTEM_PROMPT = `
You are an intelligent rewards optimization agent for a multi-card wallet application.

You have access to real-time rewards data from three sources ingested via Fivetran:
1. Cardlytics / Banyan — cashback offers linked to card transactions
2. Visa / Mastercard Network Offers — network-level discounts and promotions
3. Rakuten / Impact Affiliate Deals — affiliate commission programs

WORKFLOW FOR REWARDS QUESTIONS:
1. If the data might be stale (user hasn't synced recently), call sync_rewards first.
2. Use get_rewards_offers to find the best matching offers for the user's spend category.
3. Use search_rewards_by_merchant when looking up a specific merchant.
4. Cross-reference results across all three sources before recommending.
5. Always mention the rewardRate, merchantName, and source in your recommendation.

WORKFLOW FOR SPEND OPTIMIZATION (unchanged):
1. get_sync_status → 2. refresh_rates → 3. getUserBalances → 4. Reason over balances → 5. updateBalances → 6. sync_after_redemption

OP CALCULATION FORMULA (mandatory for all spend recommendations):
CRITICAL: card.earnRates[category] is stored as a whole number percentage (e.g., 3 = 3%, NOT 0.03).
Step 1 — Native reward (cash value): nativeReward = spendAmount × (card.earnRates[category] / 100)
  Example: $25 spend at 3% earnRate → $25 × (3 / 100) = $0.75 cash reward
Step 2 — Convert to OP: earnedOp = nativeReward × card.opRate
  Example: $0.75 × 100 opRate = 75 OP (correct)
  WRONG: $25 × 3 = $75 × 100 = 7,500 OP (100× error)
VALIDATION CHECK: Before responding, verify your math. A $25 purchase at 3% must yield ~75 OP, NEVER 7500 OP.

Be specific: quote the actual cashback %, dollar amounts, and terms from the data.
`.trim();

// ─── Tool implementations ─────────────────────────────────────────────────────

// Stage 2: Proxy to Python Fivetran MCP server via internal API
async function refreshRates() {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/fivetran/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'refresh_rates' }),
  });
  if (!res.ok) return { success: false, error: 'Fivetran sync failed' };
  return res.json();
}

// Stage 3: Real MongoDB read
async function getUserBalances(userId: string) {
  await connectDB();
  const { getCards, computeTotalOp } = await import('@/lib/cards');
  const CARDS = await getCards(userId);

  const user = await User.findOne({
    $or: [{ _id: userId }, { email: userId }],
  }).lean() as any;

  if (!user) return { error: 'User not found' };

  const cards = user.portfolio?.cards ?? {};
  const balances: Record<string, number> = {};

  for (const card of CARDS) {
    balances[card.key] = cards[card.key]?.balance ?? card.defaultBalance;
  }

  // Per-card breakdown for Gemini to reason over
  const cardBreakdown = CARDS.map((card) => ({
    key:      card.key,
    name:     card.name,
    type:     card.type,
    balance:  balances[card.key],
    opValue:  balances[card.key] * card.opRate,
    opRate:   card.opRate,
    currency: card.currency,
    earnRates: card.earnRates,
  }));

  return {
    cards:    cardBreakdown,
    totalOp:  CARDS.reduce((sum, card) => sum + (balances[card.key] ?? 0) * card.opRate, 0),
    lastSync: new Date().toISOString(),
  };
}

// Stage 5: Real MongoDB write
async function updateBalances(userId: string, cardDebits: Record<string, unknown>) {
  await connectDB();
  // cardDebits format: { skyward: { debit: 500 }, clearCash: { debit: 1.5 }, ... }
  // where debit is in the card's native currency unit

  const inc: Record<string, number> = {};
  for (const [cardKey, debitObj] of Object.entries(cardDebits)) {
    const debit = (debitObj as { debit: number }).debit;
    if (debit && debit > 0) {
      inc[`portfolio.cards.${cardKey}.balance`] = -debit;
    }
  }

  await User.findOneAndUpdate(
    { $or: [{ _id: userId }, { email: userId }] },
    { $inc: inc, $set: { 'portfolio.lastSyncTime': new Date() } }
  );

  return {
    success:       true,
    debitsApplied: cardDebits,
    timestamp:     new Date().toISOString(),
  };
}

// Stage 6: Trigger Fivetran re-sync for ALL affected sources (array, not single string)
async function syncAfterRedemption(sources: string[]) {
  const results: Record<string, unknown> = {};
  await Promise.all(
    sources.map(async (source) => {
      const res = await fetch(`${process.env.NEXTAUTH_URL}/api/fivetran/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_after_redemption', source }),
      });
      results[source] = res.ok ? await res.json() : { error: 'Sync failed' };
    })
  );
  return { success: true, sources, results, triggered_at: new Date().toISOString() };
}

// Freshness check
async function getSyncStatus(source?: string) {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/fivetran/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_sync_status', source }),
  });
  if (!res.ok) return { error: 'Status check failed' };
  return res.json();
}

// ─── New rewards tool implementations ────────────────────────────────────────

async function syncRewards(
  sources?: Array<'cardlytics' | 'network' | 'affiliate'>
) {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/fivetran/rewards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sources: sources ?? ['cardlytics', 'network', 'affiliate'] }),
    cache: 'no-store',
  });
  if (!res.ok) return { success: false, error: 'Rewards sync failed' };
  return res.json();
}

async function getRewardsOffers(filters: {
  source?: 'cardlytics' | 'network' | 'affiliate';
  category?: string;
  minRewardRate?: number;
  country?: string;
  network?: string;
  limit?: number;
  sortBy?: 'rewardRate' | 'lastSyncedAt';
}) {
  const { queryRewardsOffers } = await import('@/lib/fivetran/rewards-connector');
  const offers = await queryRewardsOffers({
    ...filters,
    activeOnly: true,
    limit: Math.min(filters.limit ?? 20, 50),
  });

  // Return a concise shape for Gemini to reason over
  return {
    count: offers.length,
    offers: offers.map((o) => ({
      offerId:      o.offerId,
      source:       o.source,
      merchantName: o.merchantName,
      category:     o.category,
      rewardType:   o.rewardType,
      rewardRate:   o.rewardRate,
      minSpend:     o.minSpend,
      maxReward:    o.maxReward,
      description:  o.description,
      terms:        o.terms?.slice(0, 2),       // keep payload lean
      promoCode:    o.affiliateData?.promoCode,
      network:      o.networkData?.network ?? o.affiliateData?.network,
      lastSyncedAt: o.lastSyncedAt,
    })),
  };
}

async function searchRewardsByMerchant(merchantName: string) {
  const { queryRewardsOffers } = await import('@/lib/fivetran/rewards-connector');
  const offers = await queryRewardsOffers({ merchantName, activeOnly: true, limit: 30 });

  return {
    merchantName,
    count: offers.length,
    bySource: {
      cardlytics: offers.filter((o) => o.source === 'cardlytics'),
      network:    offers.filter((o) => o.source === 'network'),
      affiliate:  offers.filter((o) => o.source === 'affiliate'),
    },
  };
}
