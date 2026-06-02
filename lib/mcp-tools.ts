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
      '[STAGE 3] Fetch all raw card balances from MongoDB. Returns miles, points, and cash with their OP conversion rates.',
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
    tools: [{ functionDeclarations: tools }],
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
    totalOp:  computeTotalOp(balances),
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
