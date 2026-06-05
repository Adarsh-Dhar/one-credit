import { NextRequest, NextResponse } from 'next/server'
import { runOPAgent } from '@/lib/op-agent'
import { connectDB } from '@/lib/mongodb'
import { FiatCard } from '@/lib/models/FiatCard'
import { buildUserContext } from '@/lib/userContext'
import { inferCategory } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { product, userId } = await request.json()

    if (!product) {
      return NextResponse.json({ error: 'Missing product' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GOOGLE_API_KEY not set on server' }, { status: 500 })
    }

    // Fetch user's cards from database
    await connectDB()
    const dbCards = await FiatCard.find({ user_id: userId }).lean()

    if (!dbCards || dbCards.length === 0) {
      return NextResponse.json({ error: 'No cards found for user' }, { status: 404 })
    }

    // Transform database cards to CardKnowledge format for the OP agent
    const cardKnowledgeMap: Record<string, any> = {}
    const cardKeys: string[] = []

    for (const card of dbCards) {
      const cardKey = card.card_id || card._id.toString()
      cardKeys.push(cardKey)

      // Extract earn rules from rewards_structure
      const earnRules: Array<{
        merchant: string
        rate: number
        per: number
        currency: string
        notes?: string | null | undefined
      }> = [
        {
          merchant: 'all',
          rate: card.rewards_structure.base_multiplier,
          per: 100,
          currency: card.currency_type.toLowerCase(),
          notes: 'Base earn rate',
        },
      ]

      // Add fixed category bonuses
      if (card.rewards_structure.fixed_categories) {
        for (const cat of card.rewards_structure.fixed_categories) {
          earnRules.push({
            merchant: cat.category,
            rate: cat.multiplier,
            per: 100,
            currency: card.currency_type.toLowerCase(),
            ...(cat.cap_amount_usd ? { notes: `Cap: $${cat.cap_amount_usd}` } : {}),
          })
        }
      }

      // Extract redemption paths from transfer partners or points value
      const redemptionPaths = []
      if (card.benefits_and_credits.transfer_partners && card.benefits_and_credits.transfer_partners.length > 0) {
        for (const partner of card.benefits_and_credits.transfer_partners) {
          redemptionPaths.push({
            name: `${partner.program} transfer (${partner.ratio})`,
            ratePerPoint: partner.cpp_max,
            ratePerPointMin: partner.cpp_min,
          })
        }
      } else if (card.points_value_cents) {
        redemptionPaths.push({
          name: 'Statement credit',
          ratePerPoint: card.points_value_cents / 100,
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
        name: card.display_name,
        issuer: card.network,
        annualFeeUsd: card.financials.annual_fee,
        gstOnFee: 0.18,
        earnRules,
        emiEarnRate: 0,
        monthlyCapPoints: null,
        excludedCategories: [],
        redemptionPaths,
        bestRedemptionRatePerPoint: bestRedemption.ratePerPoint,
        bestRedemptionName: bestRedemption.name,
        statementCredits: (card.benefits_and_credits.statement_credits ?? []).map(sc => ({
          name: sc.name,
          annualValueUsd: sc.reset_period === 'monthly' ? sc.amount_usd * 12 : sc.amount_usd,
          merchantCategories: sc.merchant_categories ?? [],
        })),
        portalBonuses: (card.benefits_and_credits.portal_bonuses ?? []).map(pb => ({
          portalName: pb.portal_name,
          categories: pb.categories,
          bonusMultiplier: pb.bonus_multiplier,
          bonusType: pb.bonus_type,
        })),
        rotatingCategory: card.rewards_structure.rotating_categories
          ? {
              isActive: card.rewards_structure.rotating_categories.is_active,
              activeCategories: card.rewards_structure.rotating_categories.active_categories ?? [],
              multiplier: card.rewards_structure.rotating_categories.multiplier ?? 1,
            }
          : null,
        milestoneBonuses: (card.rewards_structure.milestone_bonuses ?? []).map(mb => ({
          spendThresholdUsd: mb.spend_threshold_usd,
          bonusPoints: mb.bonus_points,
          period: mb.period,
        })),
        feeWaiverSpendUsd: card.financials.fee_waiver_spend_usd ?? null,
        foreignTxnFeePct: card.financials.foreign_transaction_fee_pct ?? 0,
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
    const merchant = merchantMap[product.source] || product.source || 'amazon.in'

    // Detect foreign merchant
    const isForeignMerchant = !merchant.endsWith('.in') && merchant !== 'amazon.in'

    // Infer category from product name
    const category = inferCategory(product.name || '', merchant)

    // Build full user context (balances + behaviour)
    const userContext = await buildUserContext(userId)

    // Use actual monthly txn count from behaviour, not hardcoded 10
    const monthlyTxns = userContext.behaviour.monthlyAvgSpendUsd > 0
      ? Math.max(5, Math.round(userContext.behaviour.categoryBreakdown.reduce((s, c) => s + c.txCount, 0) / 3))
      : 10

    // Run the agent across user's cards
    const result = await runOPAgent(
      {
        product: { name: product.name, price: product.price, category, merchant, isEmi, isForeignMerchant },
        cards: cardKeys,
        cardKnowledgeMap,
        userMonthlyTxns: monthlyTxns,
        riskFreeRatePercent: 7,
        billingCycleDays: 30,
        userContext,                    // ← pass full context
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
        ? result.cards[result.cards.length - 1].netCost - result.winner.netCost
        : 0,
    })
  } catch (error) {
    console.error('[OP Agent] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Agent failed' },
      { status: 500 }
    )
  }
}
