import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { runOPAgent, CardKnowledge } from '@/lib/op-agent'
import { FiatCard } from '@/lib/models/FiatCard'
import type { IMilestoneBonus } from '@/lib/models/FiatCard'
import { buildUserContext } from '@/lib/userContext'
import { inferCategory, sanitizeForPrompt } from '@/lib/utils'
import { z } from 'zod'
import { ratelimit } from '@/lib/rateLimit'
import logger from '@/lib/logger'
import { getEnv } from '@/lib/env'
import { toErrorResponse } from '@/lib/errors'

const SOURCE_TO_MERCHANT_DOMAIN: Record<string, string> = {
  amazon: 'amazon.in',
  walmart: 'walmart.com',
  bestbuy: 'bestbuy.com',
  target: 'target.com',
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_MONTHLY_TXNS = 5
const TXN_COUNT_DIVISOR = 3
const DEFAULT_MONTHLY_TXNS = 10

// Zod schema for request validation
const AnalyzeSchema = z.object({
  product: z.object({
    name: z.string().max(200),
    price: z.number().positive().max(1_000_000),
    url: z.string().url().optional(),
    source: z.string().max(50).optional(),
  }),
  userId: z.string().max(100),
})

// ─── Helper Functions ───────────────────────────────────────────────────────

async function validateRequestAndApiKey(request: NextRequest): Promise<
  { success: true; data: { product: z.infer<typeof AnalyzeSchema>['product']; userId: string }; env: ReturnType<typeof getEnv> } |
  { success: false; response: NextResponse }
> {
  const env = getEnv()
  const apiKey = env.GOOGLE_API_KEY
  if (!apiKey) {
    return { success: false, response: NextResponse.json({ error: 'GOOGLE_API_KEY not set on server' }, { status: 500 }) }
  }

  const parsed = AnalyzeSchema.safeParse(await request.json())
  if (!parsed.success) {
    return { success: false, response: NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }) }
  }

  const { product, userId } = parsed.data
  if (!userId) {
    return { success: false, response: NextResponse.json({ error: 'userId is required' }, { status: 400 }) }
  }

  return { success: true, data: { product, userId }, env }
}

async function checkRateLimit(userId: string): Promise<NextResponse | null> {
  const { success } = await ratelimit.limit(userId)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  return null
}

function transformCardToKnowledge(
  dbCard: any,
  env: ReturnType<typeof getEnv>
): CardKnowledge {
  const earnRules: CardKnowledge['earnRules'] = [
    {
      merchant: 'all',
      rate: dbCard.rewards_structure.base_multiplier,
      per: 100,
      currency: dbCard.currency_type.toLowerCase(),
      notes: 'Base earn rate',
    },
  ]

  if (dbCard.rewards_structure.fixed_categories) {
    for (const cat of dbCard.rewards_structure.fixed_categories) {
      earnRules.push({
        merchant: cat.category,
        rate: cat.multiplier,
        per: 100,
        currency: dbCard.currency_type.toLowerCase(),
        ...(cat.cap_amount_usd ? { notes: `Cap: $${cat.cap_amount_usd}` } : {}),
      })
    }
  }

  const redemptionPaths: CardKnowledge['redemptionPaths'] = []
  if (dbCard.benefits_and_credits.transfer_partners && dbCard.benefits_and_credits.transfer_partners.length > 0) {
    for (const partner of dbCard.benefits_and_credits.transfer_partners) {
      redemptionPaths.push({
        name: `${partner.program} transfer (${partner.ratio})`,
        ratePerPoint: partner.cpp_max,
        ratePerPointMin: partner.cpp_min,
      })
    }
  } else if (dbCard.points_value_cents) {
    redemptionPaths.push({
      name: 'Statement credit',
      ratePerPoint: dbCard.points_value_cents / 100,
    })
  } else {
    redemptionPaths.push({
      name: 'Direct cashback',
      ratePerPoint: 1.0,
    })
  }

  const bestRedemption = redemptionPaths.reduce((best, current) =>
    current.ratePerPoint > best.ratePerPoint ? current : best
  , redemptionPaths[0])

  const rewardType: 'points' | 'miles' | 'cashback' =
    dbCard.currency_type === 'USD' ? 'cashback' :
    dbCard.currency_type === 'MILES' ? 'miles' : 'points'

  return {
    name: dbCard.display_name,
    issuer: dbCard.network,
    annualFeeUsd: dbCard.financials.annual_fee,
    gstOnFee: env.GST_RATE,
    earnRules,
    emiEarnRate: dbCard.rewards_structure.emi_multiplier ?? 0,
    monthlyCapPoints: dbCard.rewards_structure.monthly_cap_points ?? null,
    excludedCategories: dbCard.rewards_structure.excluded_categories ?? [],
    redemptionPaths,
    bestRedemptionRatePerPoint: bestRedemption.ratePerPoint,
    bestRedemptionName: bestRedemption.name,
    statementCredits: (dbCard.benefits_and_credits.statement_credits ?? []).map((sc: any) => ({
      name: sc.name,
      annualValueUsd: sc.reset_period === 'monthly' ? sc.amount_usd * 12 : sc.amount_usd,
      merchantCategories: sc.merchant_categories ?? [],
    })),
    portalBonuses: (dbCard.benefits_and_credits.portal_bonuses ?? []).map((pb: any) => ({
      portalName: pb.portal_name,
      portalUrl: pb.portal_url,
      categories: pb.categories,
      bonusMultiplier: pb.bonus_multiplier,
      bonusType: pb.bonus_type,
    })),
    rotatingCategory: dbCard.rewards_structure.rotating_categories
      ? {
          isActive: dbCard.rewards_structure.rotating_categories.is_active,
          activeCategories: dbCard.rewards_structure.rotating_categories.active_categories ?? [],
          multiplier: dbCard.rewards_structure.rotating_categories.multiplier ?? 1,
        }
      : null,
    milestoneBonuses: (dbCard.rewards_structure.milestone_bonuses ?? []).map((mb: IMilestoneBonus) => ({
      spendThresholdUsd: mb.spend_threshold_usd,
      bonusPoints: mb.bonus_points,
      period: mb.period,
    })),
    feeWaiverSpendUsd: dbCard.financials.fee_waiver_spend_usd ?? null,
    foreignTxnFeePct: dbCard.financials.foreign_transaction_fee_pct ?? 0,
    rewardType,
  }
}

async function buildCardKnowledge(
  userContext: Awaited<ReturnType<typeof buildUserContext>>,
  userId: string,
  env: ReturnType<typeof getEnv>,
  cardKeys: string[]
): Promise<Record<string, CardKnowledge>> {
  const cardKnowledgeMap: Record<string, CardKnowledge> = {}

  const dbCards = await FiatCard.find({
    card_id: { $in: cardKeys },
    user_id: userId
  })
    .select({
      card_id: 1,
      display_name: 1,
      network: 1,
      currency_type: 1,
      rewards_structure: 1,
      benefits_and_credits: 1,
      financials: 1,
      op_redemption: 1,
    })
    .lean()
  const dbCardMap = new Map(dbCards.map(c => [c.card_id, c]))

  for (const card of userContext.cards) {
    const cardKey = card.cardId
    const dbCard = dbCardMap.get(cardKey)
    if (!dbCard) {
      continue
    }

    cardKnowledgeMap[cardKey] = transformCardToKnowledge(dbCard, env)
  }

  return cardKnowledgeMap
}

function detectProductAttributes(product: z.infer<typeof AnalyzeSchema>['product']): {
  isEmi: boolean
  merchant: string
  isForeignMerchant: boolean
  category: string
} {
  const isEmi = product.url?.includes('emi') || product.name?.toLowerCase().includes('emi') || false

  const merchant = sanitizeForPrompt((product.source && SOURCE_TO_MERCHANT_DOMAIN[product.source]) || product.source || 'amazon.in')

  const isForeignMerchant = !merchant.endsWith('.in') && merchant !== 'amazon.in'
  const category = sanitizeForPrompt(inferCategory(product.name || ''))

  return { isEmi, merchant, isForeignMerchant, category }
}

function calculateMonthlyTxns(userContext: Awaited<ReturnType<typeof buildUserContext>>): number {
  return userContext.behaviour.monthlyAvgSpendUsd > 0
    ? Math.max(MIN_MONTHLY_TXNS, Math.round(userContext.behaviour.categoryBreakdown.reduce((s, c) => s + c.txCount, 0) / TXN_COUNT_DIVISOR))
    : DEFAULT_MONTHLY_TXNS
}

async function runAgentAndBuildResponse(
  product: z.infer<typeof AnalyzeSchema>['product'],
  cardKeys: string[],
  cardKnowledgeMap: Record<string, CardKnowledge>,
  userContext: Awaited<ReturnType<typeof buildUserContext>>,
  env: ReturnType<typeof getEnv>,
  model: import('@google/generative-ai').GenerativeModel
): Promise<NextResponse> {
  const { isEmi, merchant, isForeignMerchant, category } = detectProductAttributes(product)
  const monthlyTxns = calculateMonthlyTxns(userContext)

  const result = await runOPAgent(
    {
      product: { name: sanitizeForPrompt(product.name || ''), price: product.price, url: product.url, category, merchant, isEmi, isForeignMerchant },
      cards: cardKeys,
      cardKnowledgeMap,
      userMonthlyTxns: monthlyTxns,
      riskFreeRatePercent: env.RISK_FREE_RATE_PERCENT,
      billingCycleDays: env.BILLING_CYCLE_DAYS,
      userContext,
    },
    model
  )

  return NextResponse.json({
    product: result.product,
    cards: result.cards,
    winner: result.winner,
    industryWinner: result.industryWinner,
    agentReasoning: result.agentReasoning,
    userBehaviour: {
      actualAvgCppAchieved: userContext.behaviour.actualAvgCppAchieved,
      redemptionCount90d: userContext.behaviour.redemptionCount90d,
    },
    savingsVsIndustryUsd: result.winner.savings,
    savingsVsBestAlternativeUsd: result.cards.length > 1
      ? Math.max(...result.cards.map(c => c.netCost)) - result.winner.netCost
      : 0,
  })
}

export async function POST(request: NextRequest) {
  try {
    // Validate request and check API key
    const validation = await validateRequestAndApiKey(request)
    if (!validation.success) {
      return validation.response
    }
    const { product, userId } = validation.data
    const env = validation.env
    const apiKey = env.GOOGLE_API_KEY

    // Check rate limit
    const rateLimitResponse = await checkRateLimit(userId)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    // Build user context
    const userContext = await buildUserContext(userId)

    // Build card knowledge map
    const cardKeys = userContext.cards.map(c => c.cardId)
    const cardKnowledgeMap = await buildCardKnowledge(userContext, userId, env, cardKeys)

    // Instantiate Gemini model
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    // Run agent and build response
    return await runAgentAndBuildResponse(product, cardKeys, cardKnowledgeMap, userContext, env, model)
  } catch (error) {
    logger.error({ error }, '[OP Agent] Error')
    const { error: err, status } = toErrorResponse(error)
    return NextResponse.json(err, { status })
  }
}
