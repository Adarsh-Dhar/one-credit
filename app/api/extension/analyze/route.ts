import { NextRequest, NextResponse } from 'next/server'
import { runOPAgent } from '@/lib/op-agent'
import { connectDB } from '@/lib/mongodb'
import { FiatCard } from '@/lib/models/FiatCard'

// Infer category intelligently from product name
function inferCategory(productName: string, merchant: string): string {
  const name = productName.toLowerCase()
  if (/date|dry fruit|nuts|cashew|almond|raisin|walnut|apricot|fig|pista/.test(name)) return 'grocer'
  if (/rice|dal|flour|oil|sugar|salt|spice|masala|pulses|atta/.test(name)) return 'grocer'
  if (/biscuit|cookie|chocolate|candy|snack|chips|popcorn/.test(name)) return 'grocer'
  if (/milk|curd|paneer|cheese|butter|ghee|cream/.test(name)) return 'grocer'
  if (/shampoo|soap|toothpaste|facewash|moisturizer|sunscreen/.test(name)) return 'personal care'
  if (/phone|mobile|laptop|tablet|earphone|headphone|charger|cable|speaker|camera/.test(name)) return 'electronics'
  if (/shirt|pant|jeans|dress|saree|kurta|jacket|shoe|sandal/.test(name)) return 'fashion'
  if (/book|novel|textbook|guide|comics/.test(name)) return 'books'
  if (/flight|hotel|train|bus|cab|tour/.test(name)) return 'travel'
  if (/restaurant|food delivery|zomato|swiggy/.test(name)) return 'dining'
  if (/gym|yoga|fitness|protein|supplement/.test(name)) return 'fitness'
  if (/netflix|hotstar|prime|spotify|zee5/.test(name)) return 'streaming'
  if (/petrol|diesel|fuel/.test(name)) return 'gas'
  if (/medicine|tablet|capsule|syrup|health/.test(name)) return 'drug'
  if (merchant.includes('amazon')) return 'shopping'
  return 'shopping'
}

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
            ...(cat.cap_amount_usd ? { notes: `Cap: ₹${cat.cap_amount_usd}` } : {}),
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
        annualFeeInr: card.financials.annual_fee,
        gstOnFee: 0.18,
        earnRules,
        emiEarnRate: 0,
        monthlyCapPoints: null,
        excludedCategories: [],
        redemptionPaths,
        bestRedemptionRatePerPoint: bestRedemption.ratePerPoint,
        bestRedemptionName: bestRedemption.name,
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

    // Infer category from product name
    const category = inferCategory(product.name || '', merchant)

    // Run the agent across user's cards
    const result = await runOPAgent(
      {
        product: {
          name: product.name,
          price: product.price,
          category,
          merchant,
          isEmi,
        },
        cards: cardKeys,
        cardKnowledgeMap, // Pass user's actual card data
        userMonthlyTxns: 10,
        riskFreeRatePercent: 7,
        billingCycleDays: 30,
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
