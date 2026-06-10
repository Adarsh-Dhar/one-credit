import { NextRequest, NextResponse } from 'next/server'
import { runOPAgent, type CardKnowledge } from '@/lib/op-agent'
import { FiatCard } from '@/lib/models/FiatCard'
import { UserPreferences } from '@/lib/models/UserPreferences'
import type { IUserPreferences, IPinnedCard } from '@/lib/models/UserPreferences'
import { buildUserContext } from '@/lib/userContext'
import { sanitizeForPrompt } from '@/lib/utils'
import logger from '@/lib/logger'
import { getEnv } from '@/lib/env'
import { toErrorResponse } from '@/lib/errors'
import { createGeminiModel } from '@/lib/gemini'
import { validateRequestAndApiKey, checkRateLimit } from './validators'
import { transformCardToKnowledge } from './card-transformers'
import { detectProductAttributes, calculateMonthlyTxns } from './product-helpers'

async function buildCardKnowledge(
  userContext: Awaited<ReturnType<typeof buildUserContext>>,
  env: ReturnType<typeof getEnv>,
  cardKeys: string[]
): Promise<Record<string, CardKnowledge>> {
  const cardKnowledgeMap: Record<string, CardKnowledge> = {}
  const { userId } = userContext

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

async function runAgentAndBuildResponse(
  product: { name?: string; price: number; url?: string },
  cardKeys: string[],
  cardKnowledgeMap: Record<string, CardKnowledge>,
  userContext: Awaited<ReturnType<typeof buildUserContext>>,
  env: ReturnType<typeof getEnv>,
  model: import('@google/generative-ai').GenerativeModel,
  userPrefs: IUserPreferences | null = null,
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

  // ── APPLY PIN LOGIC (post-math) ───────────────────────────────────────────
  let userPreferredCard = null;
  let tradeoffUsd: number | null = null;
  let preferencesActive = false;

  if (userPrefs?.pinnedCards?.length) {
    const matchedPin = findMatchingPin(userPrefs.pinnedCards, merchant, category, isForeignMerchant);

    if (matchedPin) {
      const preferredCardResult = result.cards.find(c => c.cardKey === matchedPin.cardId);

      if (preferredCardResult && preferredCardResult.cardKey !== result.winner.cardKey) {
        preferencesActive = true;
        userPreferredCard = preferredCardResult;
        tradeoffUsd = preferredCardResult.cost.netCost - result.winner.cost.netCost;

        // If min savings threshold is set and the cost difference is below it,
        // the pin takes effect without flagging a tradeoff
        const threshold = userPrefs.minSavingsThresholdUsd ?? 0;
        if (Math.abs(tradeoffUsd) < threshold) {
          // Difference is within threshold — treat pinned card as "effectively tied"
          tradeoffUsd = null;
        }
      } else if (preferredCardResult && preferredCardResult.cardKey === result.winner.cardKey) {
        // Pinned card IS the math winner — no tradeoff
        preferencesActive = true;
      }
    }
  }
  // ── END PIN LOGIC ─────────────────────────────────────────────────────────

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
    savingsVsIndustryUsd: result.winner.cost.industryCost - result.winner.cost.netCost,
    savingsVsBestAlternativeUsd: result.cards.length > 1
      ? Math.max(...result.cards.map(c => c.cost.netCost)) - result.winner.cost.netCost
      : 0,
    // ── NEW preference-aware fields ────────────────────────────────────────
    userPreferredCard,
    preferencesActive,
    tradeoffUsd,
  })
}

// ── Helper: match a pin to the current purchase ─────────────────────────────
function findMatchingPin(
  pins: IPinnedCard[],
  merchant: string,
  category: string,
  isForeignMerchant: boolean,
): IPinnedCard | null {
  // Priority: foreign > merchant > category
  if (isForeignMerchant) {
    const foreignPin = pins.find(p => p.matchType === 'foreign');
    if (foreignPin) {
      return foreignPin;
    }
  }

  const merchantLower = merchant.toLowerCase();
  const merchantPin = pins.find(
    p => p.matchType === 'merchant' && merchantLower.includes(p.matchValue.toLowerCase()),
  );
  if (merchantPin) {
    return merchantPin;
  }

  const categoryPin = pins.find(
    p => p.matchType === 'category' && p.matchValue.toLowerCase() === category.toLowerCase(),
  );
  return categoryPin ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateRequestAndApiKey(request, getEnv)
    if (!validation.success) {
      return validation.response
    }
    const { product, userId } = validation.data
    const env = validation.env

    const rateLimitResponse = await checkRateLimit(userId)
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const userContext = await buildUserContext(userId)

    // Detect product attributes for pin matching
    const { isEmi: _isEmi, merchant, isForeignMerchant, category } = detectProductAttributes(product)
    logger.info({ merchant, category, isForeignMerchant }, '[Pin Logic] Product attributes')

    // ── LOAD USER PREFERENCES ─────────────────────────────────────────────
    const savedPrefs = await UserPreferences.findOne({ userId }).lean() as IUserPreferences | null;
    logger.info({ pinnedCards: savedPrefs?.pinnedCards, excludedCardIds: savedPrefs?.excludedCardIds }, '[Pin Logic] User preferences')

    // Apply hard exclusions: remove excluded cards before op-agent runs
    let cardKeys = userContext.cards.map(c => c.cardId);
    if (savedPrefs?.excludedCardIds?.length) {
      cardKeys = cardKeys.filter(id => !savedPrefs.excludedCardIds.includes(id));
    }

    const cardKnowledgeMap = await buildCardKnowledge(userContext, env, cardKeys)

    const model = createGeminiModel(env.GOOGLE_API_KEY)

    return await runAgentAndBuildResponse(product, cardKeys, cardKnowledgeMap, userContext, env, model, savedPrefs)
  } catch (error) {
    logger.error({ error }, '[OP Agent] Error')
    const { error: err, status } = toErrorResponse(error)
    return NextResponse.json(err, { status })
  }
}
