// Card transformation functions for building CardKnowledge from database cards
import type { CardKnowledge } from '@/lib/op-agent'
import type { IFiatCard, IMilestoneBonus } from '@/lib/models/FiatCard'
import { getRewardType } from '@/lib/utils'

function buildEarnRules(
  dbCard: Partial<Pick<IFiatCard, 'currency_type' | 'rewards_structure'>>
): CardKnowledge['earnRules'] {
  const baseEarnRate = dbCard.rewards_structure?.base_multiplier ?? 1
  const currency = dbCard.currency_type?.toLowerCase() ?? 'usd'
  const earnRules: CardKnowledge['earnRules'] = [
    {
      merchant: 'all',
      rate: baseEarnRate,
      per: 100,
      currency,
      notes: 'Base earn rate',
    },
  ]

  if (dbCard.rewards_structure?.fixed_categories) {
    for (const cat of dbCard.rewards_structure.fixed_categories) {
      earnRules.push({
        merchant: cat.category,
        rate: cat.multiplier,
        per: 100,
        currency,
        ...(cat.cap_amount_usd ? { notes: `Cap: $${cat.cap_amount_usd}` } : {}),
      })
    }
  }

  return earnRules
}

function buildRedemptionPaths(
  dbCard: Partial<Pick<IFiatCard, 'benefits_and_credits' | 'points_value_cents'>>
): CardKnowledge['redemptionPaths'] {
  const redemptionPaths: CardKnowledge['redemptionPaths'] = []
  
  if (dbCard.benefits_and_credits?.transfer_partners && dbCard.benefits_and_credits.transfer_partners.length > 0) {
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

  return redemptionPaths
}

function findBestRedemption(redemptionPaths: CardKnowledge['redemptionPaths']): CardKnowledge['redemptionPaths'][number] {
  return redemptionPaths.reduce((best, current) =>
    current.ratePerPoint > best.ratePerPoint ? current : best
  , redemptionPaths[0])
}

function transformStatementCredits(
  statementCredits: IFiatCard['benefits_and_credits']['statement_credits']
): CardKnowledge['statementCredits'] {
  return (statementCredits ?? []).map((sc) => ({
    name: sc.name,
    annualValueUsd: sc.reset_period === 'monthly' ? sc.amount_usd * 12 : sc.amount_usd,
    merchantCategories: sc.merchant_categories ?? [],
  }))
}

function transformPortalBonuses(
  portalBonuses: IFiatCard['benefits_and_credits']['portal_bonuses']
): CardKnowledge['portalBonuses'] {
  return (portalBonuses ?? []).map((pb) => ({
    portalName: pb.portal_name,
    portalUrl: pb.portal_url,
    categories: pb.categories,
    bonusMultiplier: pb.bonus_multiplier,
    bonusType: pb.bonus_type,
  }))
}

function transformRotatingCategory(
  rotatingCategories: IFiatCard['rewards_structure']['rotating_categories']
): CardKnowledge['rotatingCategory'] {
  if (!rotatingCategories) {
    return null
  }

  return {
    isActive: rotatingCategories.is_active,
    activeCategories: rotatingCategories.active_categories ?? [],
    multiplier: rotatingCategories.multiplier ?? 1,
  }
}

function transformMilestoneBonuses(
  milestoneBonuses: IFiatCard['rewards_structure']['milestone_bonuses']
): CardKnowledge['milestoneBonuses'] {
  return (milestoneBonuses ?? []).map((mb: IMilestoneBonus) => ({
    spendThresholdUsd: mb.spend_threshold_usd,
    bonusPoints: mb.bonus_points,
    period: mb.period,
  }))
}

export function transformCardToKnowledge(
  dbCard: Partial<Pick<IFiatCard, 'display_name' | 'network' | 'currency_type' | 'rewards_structure' | 'benefits_and_credits' | 'financials' | 'points_value_cents'>>,
  env: { GST_RATE: number }
): CardKnowledge {
  const baseEarnRate = dbCard.rewards_structure?.base_multiplier ?? 1
  const earnRules = buildEarnRules(dbCard)
  const redemptionPaths = buildRedemptionPaths(dbCard)
  const bestRedemption = findBestRedemption(redemptionPaths)
  const rewardType = getRewardType(dbCard.currency_type)

  return {
    name: dbCard.display_name ?? 'Unknown Card',
    issuer: dbCard.network ?? 'Unknown',
    annualFeeUsd: dbCard.financials?.annual_fee ?? 0,
    gstOnFee: env.GST_RATE,
    baseEarnRate,
    earnRules,
    emiEarnRate: dbCard.rewards_structure?.emi_multiplier ?? 0,
    monthlyCapPoints: dbCard.rewards_structure?.monthly_cap_points ?? null,
    excludedCategories: dbCard.rewards_structure?.excluded_categories ?? [],
    redemptionPaths,
    bestRedemptionRatePerPoint: bestRedemption.ratePerPoint,
    bestRedemptionName: bestRedemption.name,
    statementCredits: transformStatementCredits(dbCard.benefits_and_credits?.statement_credits),
    portalBonuses: transformPortalBonuses(dbCard.benefits_and_credits?.portal_bonuses),
    rotatingCategory: transformRotatingCategory(dbCard.rewards_structure?.rotating_categories),
    milestoneBonuses: transformMilestoneBonuses(dbCard.rewards_structure?.milestone_bonuses),
    feeWaiverSpendUsd: dbCard.financials?.fee_waiver_spend_usd ?? null,
    foreignTxnFeePct: dbCard.financials?.foreign_transaction_fee_pct ?? 0,
    rewardType,
  }
}
