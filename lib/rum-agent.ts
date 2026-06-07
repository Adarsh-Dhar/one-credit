// lib/rum-agent.ts
//
// RUM Behavioral Persona Agent powered by Gemini + Dynatrace MCP.
//
// This agent REPLACES op-agent.ts entirely.
// Its ONLY job: read Dynatrace RUM signals → infer a user persona → recommend
// the right card stack, and log everything back to Dynatrace as structured logs.
//
// Architecture:
//   1. Pull RUM signals from Dynatrace MCP (session telemetry + custom events)
//   2. Feed signals into Gemini as a structured prompt
//   3. Gemini returns a UserPersona + card recommendation rationale
//   4. Log the inference back to Dynatrace via the Logs Ingest API

import { GoogleGenerativeAI, Tool, FunctionDeclaration, GenerativeModel } from '@google/generative-ai'
import logger from '@/lib/logger'
import type { RUMSignals } from '@/lib/types'
import { RUMSignals as RUMSignalsModel } from '@/lib/models/RUMSignals'
import { getEnv } from '@/lib/env'

// Re-export RUMSignals from lib/types for backward compatibility
export type { RUMSignals }

// ─── Gemini Types ─────────────────────────────────────────────────────────────

export interface GeminiPart {
  text?: string
  functionCall?: {
    name: string
    args: Record<string, unknown>
  }
  functionResponse?: {
    name: string
    response: { content: string }
  }
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

// ─── Dynatrace config (add to .env) ──────────────────────────────────────────
// DT_ENV_URL=https://<env-id>.live.dynatrace.com or https://<tenant>.apps.dynatrace.com (Platform)
// DT_API_TOKEN=dt0c01.<token>   (needs: logs.ingest  +  DTAQLAccess  +  apiTokens.read)

const env = getEnv()
const DT_ENV_URL  = env.DT_ENV_URL  ?? ''
const DT_API_TOKEN = env.DT_API_TOKEN ?? ''

// Platform URLs require Bearer auth, classic SaaS uses Api-Token
const IS_PLATFORM_URL = DT_ENV_URL.includes('.apps.dynatrace.com')
const IS_CLASSIC_API_TOKEN = DT_API_TOKEN.startsWith('dt0c01.')

// Platform URLs don't support API tokens - they require OAuth2/JWT
// Use DT only when NOT (platform URL AND classic API token)
const isPlatformWithClassicToken = IS_PLATFORM_URL && IS_CLASSIC_API_TOKEN
const dtIsAvailable = Boolean(DT_ENV_URL && DT_API_TOKEN && !isPlatformWithClassicToken)

const AUTH_SCHEME = IS_PLATFORM_URL ? 'Bearer' : 'Api-Token'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PersonaLabel =
  | 'Maximizer'        // Transfer-partner hunter; dwell time on award charts
  | 'Simplifier'       // Rage-clicker; wants flat-rate cashback
  | 'CarryProne'       // Heavy dwell on 0% APR section
  | 'CreditHarvester'  // Repeatedly views Amex-style coupon-book breakdowns
  | 'AmazonAnchored'   // Extension fires frequently on Amazon
  | 'VolumeSpender'    // High txn count, low benefit dwell
  | 'LoungeSeeker'     // Opens lounge details every session
  | 'FeeInsensitive'   // Scrolls past annual fee without pausing
  | 'FeeAverse'        // Exits consistently at annual fee field
  | 'Unknown'

export interface UserPersona {
  label: PersonaLabel
  confidence: number              // 0–1
  signals: string[]               // human-readable bullets explaining the inference
  cardStackRecommendation: {
    primary: string               // card name
    rationale: string
    avoid: string[]               // card types to exclude from shortlist
  }
  filterPremiumCards: boolean     // true → exclude cards with AF > $0
  focusOnTransferPartners: boolean
  focusOnCashback: boolean
  focusOnFinancing: boolean       // 0% APR cards
}

export interface RUMAgentResult {
  userId: string
  persona: UserPersona
  dynatraceLogId: string | null   // log ingestion response ID (if DT is reachable)
  rawGeminiReasoning: string
}

interface PersonaLogContext {
  source: 'rum_inferred' | 'chat_override'
  intentOverrideActive: boolean
}

// ─── Dynatrace MCP Tool Declarations (sent to Gemini as tools) ───────────────
//
// These mirror what the Dynatrace MCP server exposes.
// Gemini will call these to fetch live RUM data instead of relying on a
// pre-built payload — making the agent truly autonomous.

const DynatraceTools = [
  {
    name: 'dt_get_rum_sessions',
    description:
      'Fetch recent Real User Monitoring session telemetry for a user from Dynatrace. ' +
      'Returns click events, dwell times, scroll-depth signals, and rage-click counts ' +
      'from the Dynatrace JavaScript agent injected in the frontend.',
    parameters: {
      type: 'object',
      properties: {
        userId:     { type: 'string', description: 'The one-credit user ID' },
        lookbackMinutes: {
          type: 'number',
          description: 'How many minutes of session history to fetch (default 60)',
        },
      },
      required: ['userId'],
    },
  },
  {
    name: 'dt_get_custom_events',
    description:
      'Fetch custom business events that the Next.js app pushes to Dynatrace ' +
      '(card.viewed, card.compared, card.added_to_wallet, transfer_partner.clicked, etc.).',
    parameters: {
      type: 'object',
      properties: {
        userId:     { type: 'string' },
        eventTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter to specific event names. Empty = all events.',
        },
        lookbackMinutes: { type: 'number' },
      },
      required: ['userId'],
    },
  },
  {
    name: 'dt_get_apm_metrics',
    description:
      'Fetch backend APM metrics from Dynatrace: API call frequency, response times, ' +
      'and error traces for /api/extension/analyze and /api/ai/analyze.',
    parameters: {
      type: 'object',
      properties: {
        userId:    { type: 'string' },
        endpoints: {
          type: 'array',
          items: { type: 'string' },
          description: 'API paths to query, e.g. ["/api/extension/analyze"]',
        },
      },
      required: ['userId'],
    },
  },
] as FunctionDeclaration[]

// ─── Dynatrace MCP executor (runs on the server, calls DT REST APIs) ─────────
//
// In production, swap the fetch() calls here with your actual Dynatrace MCP
// server integration (stdio/SSE transport). The structure is identical —
// the function name maps 1:1 to the tool declaration above.

async function executeDTTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<unknown> {

  if (!dtIsAvailable) {
    if (IS_PLATFORM_URL && IS_CLASSIC_API_TOKEN) {
      logger.warn('[rum-agent] Platform URLs require OAuth2/JWT tokens, not API tokens — reading RUM signals from MongoDB')
    } else if (!DT_ENV_URL || !DT_API_TOKEN) {
      logger.warn('[rum-agent] DT_ENV_URL or DT_API_TOKEN not set — reading RUM signals from MongoDB')
    }
    const userId = args.userId as string
    
    try {
      const doc = await RUMSignalsModel.findOne({ userId })
      if (doc) {
        return doc.toObject()
      }
      logger.info('[rum-agent] No RUM signals found in MongoDB, returning mock')
    } catch (err) {
      logger.error({ err }, '[rum-agent] Failed to read RUM signals from MongoDB, returning mock')
    }
    return mockRUMSignals(userId)
  }

  // Log the URL being used (without exposing the full token)
  logger.info({ url: DT_ENV_URL, tokenPrefix: DT_API_TOKEN.substring(0, 20) }, '[rum-agent] Attempting DT API call')

  const headers = {
    Authorization: `${AUTH_SCHEME} ${DT_API_TOKEN}`,
    'Content-Type': 'application/json',
  }

  const executor = DT_TOOL_EXECUTORS[toolName]
  if (executor) {
    return executor(args, headers)
  }
  throw new Error(`Unknown DT tool: ${toolName}`)
}

// ─── DT Tool Executor Map ─────────────────────────────────────────────────

type DTToolExecutor = (args: Record<string, unknown>, headers: HeadersInit) => Promise<unknown>;

const DT_TOOL_EXECUTORS: Record<string, DTToolExecutor> = {
  dt_get_rum_sessions: async (args, headers) => {
    const lookback = (args.lookbackMinutes as number) ?? 60
    const now = Date.now()
    const from = now - lookback * 60_000

    const res = await fetch(
      `${DT_ENV_URL}/api/v1/userSessionQueryLanguage/table?` +
      new URLSearchParams({
        query: `SELECT * FROM usersession WHERE userId = '${args.userId}' LIMIT 50`,
        startTimestamp: String(from),
        endTimestamp:   String(now),
      }),
      { headers },
    )
    if (!res.ok) {
      const errorText = await res.text()
      logger.error({ status: res.status, errorText }, '[rum-agent] DT RUM sessions error details')
      throw new Error(`DT RUM sessions error: ${res.status}`)
    }
    return res.json()
  },

  dt_get_custom_events: async (args, headers) => {
    const lookback = (args.lookbackMinutes as number) ?? 60
    const now = Date.now()
    const from = now - lookback * 60_000
    const eventFilter = (args.eventTypes as string[])?.length
      ? `AND eventType IN (${(args.eventTypes as string[]).map(e => `'${e}'`).join(',')})`
      : ''

    const res = await fetch(
      `${DT_ENV_URL}/api/v1/userSessionQueryLanguage/table?` +
      new URLSearchParams({
        query: `SELECT * FROM useraction WHERE userId = '${args.userId}' ${eventFilter} LIMIT 200`,
        startTimestamp: String(from),
        endTimestamp:   String(now),
      }),
      { headers },
    )
    if (!res.ok) {
      throw new Error(`DT custom events error: ${res.status}`)
    }
    return res.json()
  },

  dt_get_apm_metrics: async (args, headers) => {
    const endpoints = (args.endpoints as string[]) ?? [
      '/api/extension/analyze',
      '/api/ai/analyze',
    ]
    const res = await fetch(
      `${DT_ENV_URL}/api/v2/metrics/query?` +
      new URLSearchParams({
        metricSelector: `builtin:service.requestCount.total:filter(in("dt.entity.service_method",entitySelector("type(SERVICE_METHOD),serviceName(~"${endpoints.join('|')}~")")))`,
        resolution:     '5m',
      }),
      { headers },
    )
    if (!res.ok) {
      throw new Error(`DT APM metrics error: ${res.status}`)
    }
    return res.json()
  },
};

// ─── Mock signals (used when DT creds are absent, e.g. local dev) ─────────────

function mockRUMSignals(userId: string): RUMSignals {
  return {
    userId,
    sessionId: 'mock-session-001',
    transferPartnerTabClicks: 0,
    cardDetailExpansions: 2,
    dwellOnTransferGuides: 4,
    dwellOnTravelCards: 8,
    dwellOnCashbackCards: 45,
    dwellOnLoungeDetails: 2,
    dwellOnAprSection: 3,
    dwellOnAnnualFeeField: 12,
    scrolledPastAnnualFee: false,
    scrollDepthMax: 0,
    abandonedRotatingActivation: true,
    backNavAfterRecommendation: false,
    cardViewCounts: { 'Chase Freedom Unlimited': 3, 'Citi Double Cash': 2 },
    extensionFireCount: 1,
    transferPartnersClicked: [],
    cardAddedToWallet: null,
    extensionAnalyzeApiCallCount: 1,
  }
}

// ─── Dynatrace Log Ingest ─────────────────────────────────────────────────────

async function logPersonaToDynatrace(
  userId: string,
  persona: UserPersona,
  reasoning: string,
  context: PersonaLogContext = { source: 'rum_inferred', intentOverrideActive: false }
): Promise<string | null> {
  if (!DT_ENV_URL || !DT_API_TOKEN) {
    logger.info({ userId, persona: persona.label }, '[rum-agent] DT not configured — skipping log ingest')
    return null
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    content: JSON.stringify({
      event:       'rum.persona.inferred',
      userId,
      persona:     persona.label,
      confidence:  persona.confidence,
      signals:     persona.signals,
      recommendation: persona.cardStackRecommendation,
      flags: {
        filterPremiumCards:      persona.filterPremiumCards,
        focusOnTransferPartners: persona.focusOnTransferPartners,
        focusOnCashback:         persona.focusOnCashback,
        focusOnFinancing:        persona.focusOnFinancing,
      },
      geminiReasoning: reasoning,
    }),
    'log.source':   'one-credit',
    'service.name': 'rum-agent',
    'severity':     'INFO',
    'user.id':      userId,
    'persona.label': persona.label,
    source: context.source,
    intentOverrideActive: context.intentOverrideActive,
  }

  try {
    const res = await fetch(`${DT_ENV_URL}/api/v2/logs/ingest`, {
      method: 'POST',
      headers: {
        Authorization:  `${AUTH_SCHEME} ${DT_API_TOKEN}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify([logEntry]),
    })

    if (!res.ok) {
      logger.error({ status: res.status }, '[rum-agent] DT log ingest failed')
      return null
    }

    logger.info({ userId, persona: persona.label }, '[rum-agent] Persona logged to Dynatrace')
    // DT Logs Ingest returns 204 with no body — synthesise an ID from timestamp
    return `dt-log-${Date.now()}`

  } catch (err) {
    logger.error({ err }, '[rum-agent] DT log ingest threw')
    return null
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_AGENTIC_ITERATIONS = 6
const MAX_GEMINI_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 1000
const UNKNOWN_PERSONA_CONFIDENCE_CEILING = 0.4
const GEMINI_FLASH_MODEL = 'gemini-2.5-flash'
const GEMINI_PRO_MODEL = 'gemini-pro'

// ─── The agent ────────────────────────────────────────────────────────────────

async function generateContentWithRetry(
  model: GenerativeModel,
  contents: GeminiContent[],
  maxRetries = MAX_GEMINI_RETRIES,
): Promise<{ response: { candidates: Array<{ content: { parts: GeminiPart[] } }> } }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent({ contents });
      return result;
    } catch (error: unknown) {
      const isRetryable =
        (error as { status?: number })?.status === 503 ||
        (error as { status?: number })?.status === 429 ||
        (error as { message?: string })?.message?.includes('high demand') ||
        (error as { message?: string })?.message?.includes('quota') ||
        (error as { message?: string })?.message?.includes('Service Unavailable');
      
      if (isRetryable && attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * INITIAL_RETRY_DELAY_MS
        logger.warn({ attempt, delay, error: (error as Error).message }, '[rum-agent] Retrying Gemini request');
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

async function runRUMAgentWithModel(
  userEmail: string,
  geminiApiKey: string,
  modelName: string,
  extractedPrefs?: import('./models/UserIntent').ExtractedPrefs,
): Promise<RUMAgentResult> {

  const genAI  = new GoogleGenerativeAI(geminiApiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    tools: [{ functionDeclarations: DynatraceTools } as Tool],
  });

  // Fetch user profile from MongoDB and cards from FiatCard
  const User = (await import('@/lib/models/User')).User;
  const FiatCard = (await import('@/lib/models/FiatCard')).FiatCard;
  const [user, fiatCards] = await Promise.all([
    User.findOne({ email: userEmail }),
    FiatCard.find({})
  ]);
  const userProfile = user?.profile || null;
  const cardsOwned = fiatCards.map((card: { display_name: string }) => card.display_name);

  // ── Agentic loop: Gemini may call DT tools multiple times ─────────────────

  const constraintBlock = extractedPrefs ? `
## CHAT-STATED PREFERENCES (OVERRIDE RUM SIGNALS)
The user has explicitly stated the following preferences via chat conversation.
These OVERRIDE any conflicting inference from RUM signals.

${JSON.stringify(extractedPrefs, null, 2)}

When inferring the persona, prioritize these explicit preferences over behavioral signals.
For example:
- If maxAnnualFee is set, set filterPremiumCards to true regardless of fee-insensitive signals
- If mustHaveFeatures includes specific benefits, ensure those are reflected in the recommendation
- If avoidNetworks is set, exclude those networks from recommendations
` : '';

  const systemPrompt = `
You are the RUMPersonaAgent for one-credit, a credit card wallet app.

## YOUR ONLY JOB
Analyse Dynatrace Real User Monitoring (RUM) signals for a user and infer their
credit card persona. Then recommend the right card stack for that persona.
You do NOT compute net costs. You do NOT run financial math.

${constraintBlock}

## AVAILABLE TOOLS
Call dt_get_rum_sessions to get click, dwell, and scroll data.
Call dt_get_custom_events to get card.viewed, card.compared, transfer_partner.clicked, etc.
Call dt_get_apm_metrics to get backend API call frequency and response times.
Call all three tools before inferring the persona.

## USER PROFILE DATA
You will also receive the user's self-reported profile data:
- homeAirport: User's home airport code (e.g., JFK, LHR, BOM)
- topSpendCategories: Top 2 spending categories (dining, groceries, travel, gas, streaming, other)
- cardsOwned: List of cards actually in the user's wallet (sourced from the database)
- carryBalance: Whether user carries a balance (yes, sometimes, never)

Use this profile data to cross-check and strengthen your persona inference.

## PERSONA DECISION TABLE
Map the signals you retrieve to exactly ONE persona label:

| Persona           | Key signals                                                        |
|-------------------|--------------------------------------------------------------------|
| Maximizer         | dwellOnTransferGuides > 30s + transferPartnersClicked not empty + homeAirport matches transfer partners |
| Simplifier        | dwellOnCashbackCards dominant + dwellOnTransferGuides near zero      |
| CarryProne        | carryBalance = yes/sometimes OR dwellOnAprSection > 20s             |
| CreditHarvester   | cardDetailExpansions high, repeated views of credit/benefit detail |
| AmazonAnchored    | extensionFireCount >= 3                                            |
| VolumeSpender     | extensionAnalyzeApiCallCount high + low dwell on benefits          |
| LoungeSeeker      | dwellOnLoungeDetails > 20s every session                           |
| FeeInsensitive    | scrolledPastAnnualFee = true without pause                         |
| FeeAverse         | dwellOnAnnualFeeField > 10s + backNavAfterRecommendation = true    |

If signals are ambiguous or missing, return label "Unknown" with confidence < ${UNKNOWN_PERSONA_CONFIDENCE_CEILING}.

## OUTPUT FORMAT
After calling the tools, respond ONLY with a JSON object — no markdown, no preamble:

{
  "persona": {
    "label": "<PersonaLabel>",
    "confidence": <0.0–1.0>,
    "signals": ["bullet 1", "bullet 2"],
    "cardStackRecommendation": {
      "primary": "<card name or category>",
      "rationale": "<1–2 sentences>",
      "avoid": ["<card type or name>"]
    },
    "filterPremiumCards": <boolean>,
    "focusOnTransferPartners": <boolean>,
    "focusOnCashback": <boolean>,
    "focusOnFinancing": <boolean>
  },
  "agentReasoning": "<one paragraph explaining signal → persona → recommendation chain>"
}
`.trim()

  const userMessage = `Infer the persona for userId: ${userEmail}. Call the Dynatrace tools now.

${userProfile || cardsOwned.length > 0 ? `
## USER PROFILE
${JSON.stringify({ ...userProfile, cardsOwned }, null, 2)}
` : '(No profile data available)'}
`

  // Start with the initial message
  let contents: GeminiContent[] = [
    {
      role: 'user',
      parts: [{ text: `${systemPrompt}\n\n${userMessage}` }],
    },
  ]

  let finalText = ''
  let iterations = 0

  while (iterations < MAX_AGENTIC_ITERATIONS) {
    iterations++

    const result = await generateContentWithRetry(model, contents)
    const response = result.response
    const parts     = response.candidates?.[0]?.content?.parts ?? []

    // Append model turn
    contents = [
      ...contents,
      { role: 'model' as const, parts },
    ]

    // Check for tool calls
    const toolCalls = parts.filter((p: GeminiPart) => p.functionCall)

    if (toolCalls.length === 0) {
      // No more tool calls → model gave its final text answer
      finalText = parts.map((p: GeminiPart) => p.text ?? '').join('')
      break
    }

    // Execute each tool call and build the function-response turn
    const toolResponses = await Promise.all(
      toolCalls.map(async (part: GeminiPart) => {
        const fc   = part.functionCall!
        const name = fc.name
        const args = (fc.args ?? {}) as Record<string, unknown>

        // Ensure userId is always passed to DT tools
        if (!args.userId) {
          args.userId = userEmail
        }

        logger.info({ tool: name, userId: userEmail }, '[rum-agent] Calling Dynatrace MCP tool')

        let response: unknown
        try {
          response = await executeDTTool(name, args)
        } catch (err) {
          logger.error({ err, tool: name }, '[rum-agent] DT tool error')
          response = { error: String(err) }
        }

        return {
          functionResponse: {
            name,
            response: { content: JSON.stringify(response) },
          },
        }
      }),
    )

    // Feed tool results back to Gemini
    contents = [
      ...contents,
      { role: 'user' as const, parts: toolResponses as GeminiPart[] },
    ]
  }

  if (!finalText) {
    throw new Error('[rum-agent] Gemini did not return a final answer within iteration limit')
  }

  // ── Parse Gemini's JSON output ─────────────────────────────────────────────

  let parsed: { persona: UserPersona; agentReasoning: string }

  try {
    const clean = finalText.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    logger.error({ finalText: finalText.slice(0, 400) }, '[rum-agent] Gemini returned invalid JSON')
    throw new Error(`[rum-agent] Gemini returned invalid JSON: ${finalText.slice(0, 200)}`)
  }

  // ── Log persona inference back to Dynatrace ────────────────────────────────

  const dynatraceLogId = await logPersonaToDynatrace(
    userEmail,
    parsed.persona,
    parsed.agentReasoning,
    {
      source: extractedPrefs ? 'chat_override' : 'rum_inferred',
      intentOverrideActive: !!extractedPrefs,
    },
  )

  logger.info(
    { userId: userEmail, persona: parsed.persona.label, confidence: parsed.persona.confidence, dynatraceLogId },
    '[rum-agent] Persona inferred',
  )

  return {
    userId: userEmail,
    persona:              parsed.persona,
    dynatraceLogId,
    rawGeminiReasoning:   parsed.agentReasoning,
  }
}

export async function runRUMAgent(
  userId: string,
  geminiApiKey: string,
  extractedPrefs?: import('./models/UserIntent').ExtractedPrefs,
): Promise<RUMAgentResult> {
  // Try gemini-2.5-flash first, fall back to gemini-pro if it fails
  try {
    logger.info('[rum-agent] Attempting persona inference with gemini-2.5-flash');
    return await runRUMAgentWithModel(userId, geminiApiKey, GEMINI_FLASH_MODEL, extractedPrefs);
  } catch (error: unknown) {
    const isRetryable =
      (error as { status?: number })?.status === 503 ||
      (error as { status?: number })?.status === 429 ||
      (error as { message?: string })?.message?.includes('high demand') ||
      (error as { message?: string })?.message?.includes('quota') ||
      (error as { message?: string })?.message?.includes('Service Unavailable');

    if (isRetryable) {
      logger.warn('[rum-agent] gemini-2.5-flash unavailable, falling back to gemini-pro');
      return await runRUMAgentWithModel(userId, geminiApiKey, GEMINI_PRO_MODEL, extractedPrefs);
    }
    throw error;
  }
}