import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { runOPAgent, CardKnowledge } from '@/lib/op-agent'
import { FiatCard } from '@/lib/models/FiatCard'
import { buildUserContext } from '@/lib/userContext'
import { inferCategory } from '@/lib/utils'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { z } from 'zod'
import { ratelimit } from '@/lib/rateLimit'
import logger from '@/lib/logger'

// Sanitize user-controlled strings before prompt interpolation
function sanitizeForPrompt(s: string, maxLen = 200): string {
  return s.replace(/[`${}\\]/g, '').slice(0, maxLen)
}

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

export async function POST(request: NextRequest) {
  try {
    // Check API key first (fail fast)
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_API_KEY not set on server' }, { status: 500 })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check rate limit
    const { success } = await ratelimit.limit(session.user.id)
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    // Validate request body with Zod
    const parsed = AnalyzeSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { product, userId } = parsed.data

    // Verify the requested userId matches the authenticated user
    if (session.user.id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build full user context (balances + behaviour)
    // buildUserContext will fetch cards internally if not provided
    const userContext = await buildUserContext(userId)

    // Transform userContext.cards to CardKnowledge format for the OP agent
    const cardKnowledgeMap: Record<string, CardKnowledge> = {}
    const cardKeys: string[] = []

    for (const card of userContext.cards) {
      cardKeys.push(card.cardId)
    }

    // Fetch all cards in a single query instead of sequential round-trips
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
      })
      .lean()
    const dbCardMap = new Map(dbCards.map(c => [c.card_id, c]))

    for (const card of userContext.cards) {
      const cardKey = card.cardId
      const dbCard = dbCardMap.get(cardKey)
      if (!dbCard) {
continue
}

      // Extract earn rules from rewards_structure
      const earnRules: CardKnowledge['earnRules'] = [
        {
          merchant: 'all',
          rate: dbCard.rewards_structure.base_multiplier,
          per: 100,
          currency: dbCard.currency_type.toLowerCase(),
          notes: 'Base earn rate',
        },
      ]

      // Add fixed category bonuses
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

      // Extract redemption paths from transfer partners or points value
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
        // Default for cashback cards
        redemptionPaths.push({
          name: 'Direct cashback',
          ratePerPoint: 1.0,
        })
      }

      const bestRedemption = redemptionPaths.reduce((best, current) =>
        current.ratePerPoint > best.ratePerPoint ? current : best
      , redemptionPaths[0])

      cardKnowledgeMap[cardKey] = {
        name: dbCard.display_name,
        issuer: dbCard.network,
        annualFeeUsd: dbCard.financials.annual_fee,
        gstOnFee: parseFloat(process.env.GST_RATE || '0.18'),
        earnRules,
        emiEarnRate: dbCard.rewards_structure.emi_multiplier ?? 0,
        monthlyCapPoints: dbCard.rewards_structure.monthly_cap_points ?? null,
        excludedCategories: dbCard.rewards_structure.excluded_categories ?? [],
        redemptionPaths,
        bestRedemptionRatePerPoint: bestRedemption.ratePerPoint,
        bestRedemptionName: bestRedemption.name,
        statementCredits: (dbCard.benefits_and_credits.statement_credits ?? []).map(sc => ({
          name: sc.name,
          annualValueUsd: sc.reset_period === 'monthly' ? sc.amount_usd * 12 : sc.amount_usd,
          merchantCategories: sc.merchant_categories ?? [],
        })),
        portalBonuses: (dbCard.benefits_and_credits.portal_bonuses ?? []).map(pb => ({
          portalName: pb.portal_name,
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
        milestoneBonuses: (dbCard.rewards_structure.milestone_bonuses ?? []).map((mb: any) => ({
          spendThresholdUsd: mb.spend_threshold_usd,
          bonusPoints: mb.bonus_points,
          period: mb.period,
        })),
        feeWaiverSpendUsd: dbCard.financials.fee_waiver_spend_usd ?? null,
        foreignTxnFeePct: dbCard.financials.foreign_transaction_fee_pct ?? 0,
      }
    }

    // Detect if this is an EMI purchase from the product URL or name
    const isEmi = product.url?.includes('emi') || product.name?.toLowerCase().includes('emi') || false

    // Infer merchant from source
    const merchantMap: Record<string, string> = {
      amazon: 'amazon.in',
      walmart: 'walmart.com',
      bestbuy: 'bestbuy.com',
      target: 'target.com',
    }
    const merchant = sanitizeForPrompt((product.source && merchantMap[product.source]) || product.source || 'amazon.in')

    // Detect foreign merchant
    const isForeignMerchant = !merchant.endsWith('.in') && merchant !== 'amazon.in'

    // Infer category from product name
    const category = sanitizeForPrompt(inferCategory(product.name || '', merchant))

    // Use actual monthly txn count from behaviour, not hardcoded 10
    const MIN_MONTHLY_TXNS = 5
    const TXN_COUNT_DIVISOR = 3
    const DEFAULT_MONTHLY_TXNS = 10
    const monthlyTxns = userContext.behaviour.monthlyAvgSpendUsd > 0
      ? Math.max(MIN_MONTHLY_TXNS, Math.round(userContext.behaviour.categoryBreakdown.reduce((s, c) => s + c.txCount, 0) / TXN_COUNT_DIVISOR))
      : DEFAULT_MONTHLY_TXNS

    // Run the agent across user's cards
    const result = await runOPAgent(
      {
        product: { name: sanitizeForPrompt(product.name || ''), price: product.price, category, merchant, isEmi, isForeignMerchant },
        cards: cardKeys,
        cardKnowledgeMap,
        userMonthlyTxns: monthlyTxns,
        riskFreeRatePercent: parseFloat(process.env.RISK_FREE_RATE_PERCENT || '7'),
        billingCycleDays: parseInt(process.env.BILLING_CYCLE_DAYS || '30'),
        userContext,
      },
      apiKey
    )

    return NextResponse.json({
      product: result.product,
      cards: result.cards,
      winner: result.winner,
      industryWinner: result.industryWinner,
      agentReasoning: result.agentReasoning,
      savings: result.cards.length > 1
        ? Math.max(...result.cards.map(c => c.netCost)) - result.winner.netCost
        : 0,
    })
  } catch (error) {
    logger.error({ error }, '[OP Agent] Error');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Agent failed' },
      { status: 500 }
    )
  }
}
