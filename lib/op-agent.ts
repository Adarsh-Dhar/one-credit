// lib/op-agent.ts
//
// The 5-step cost valuation agent powered by Gemini.
// Each step is a focused reasoning pass. The final step assembles the result.

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { UserContext } from './userContext'

// ─── Indian card knowledge base ──────────────────────────────────────────────
// This is what the agent reasons over. Add more cards here as needed.

export const INDIAN_CARD_KB: Record<string, CardKnowledge> = {
  hdfc_regalia_gold: {
    name: 'HDFC Regalia Gold',
    issuer: 'HDFC Bank',
    annualFeeUsd: 27.78,
    gstOnFee: 0.18,
    earnRules: [
      { merchant: 'amazon.in', rate: 4, per: 1.67, currency: 'points', notes: 'Standard rate. Not excluded.' },
      { merchant: 'flipkart', rate: 4, per: 1.67, currency: 'points' },
      { merchant: 'all', rate: 4, per: 1.67, currency: 'points' },
    ],
    emiEarnRate: 0,
    monthlyCapPoints: 10000,
    excludedCategories: ['fuel', 'rent', 'utilities', 'insurance'],
    redemptionPaths: [
      { name: 'Cashback / statement credit', ratePerPoint: 0.50 },
      { name: 'HDFC Rewards catalog', ratePerPoint: 0.65 },
      { name: 'SmartBuy vouchers (Amazon/Flipkart)', ratePerPoint: 0.80 },
      { name: 'SmartBuy domestic flights', ratePerPoint: 1.00 },
      { name: 'SmartBuy international flights / Air India miles', ratePerPoint: 1.20 },
    ],
    bestRedemptionRatePerPoint: 1.20,
    bestRedemptionName: 'SmartBuy international flights',
    statementCredits: [],
    portalBonuses: [],
    rotatingCategory: null,
    milestoneBonuses: [],
    feeWaiverSpendUsd: null,
    foreignTxnFeePct: 0,
  },
  amazon_pay_icici: {
    name: 'Amazon Pay ICICI',
    issuer: 'ICICI Bank',
    annualFeeUsd: 0,
    gstOnFee: 0,
    earnRules: [
      { merchant: 'amazon.in', rate: 5, per: 100, currency: 'cashback', notes: 'Prime members. Direct cashback, no conversion needed.' },
      { merchant: 'amazon.in', rate: 3, per: 100, currency: 'cashback', notes: 'Non-Prime members.' },
      { merchant: 'all', rate: 1, per: 100, currency: 'cashback' },
    ],
    emiEarnRate: 0,
    monthlyCapPoints: null,
    excludedCategories: ['fuel'],
    redemptionPaths: [
      { name: 'Amazon Pay balance (direct)', ratePerPoint: 1.00 },
    ],
    bestRedemptionRatePerPoint: 1.00,
    bestRedemptionName: 'Amazon Pay balance',
    statementCredits: [],
    portalBonuses: [],
    rotatingCategory: null,
    milestoneBonuses: [],
    feeWaiverSpendUsd: null,
    foreignTxnFeePct: 0,
  },
  axis_magnus: {
    name: 'Axis Magnus',
    issuer: 'Axis Bank',
    annualFeeUsd: 138.89,
    gstOnFee: 0.18,
    earnRules: [
      { merchant: 'all', rate: 12, per: 2.22, currency: 'EDGE Miles', notes: '12 EDGE Miles per $2.22.' },
      { merchant: 'travel_partners', rate: 35, per: 2.22, currency: 'EDGE Miles', notes: '35 EDGE Miles per $2.22 on travel partners.' },
    ],
    emiEarnRate: 0,
    monthlyCapPoints: 50000,
    excludedCategories: ['fuel', 'emi', 'rent', 'wallets'],
    redemptionPaths: [
      { name: 'EDGE Rewards catalog', ratePerPoint: 1.00 },
      { name: 'Air India miles transfer (1:1)', ratePerPoint: 1.60 },
      { name: 'Business class redemption via Air India', ratePerPoint: 2.40 },
    ],
    bestRedemptionRatePerPoint: 2.40,
    bestRedemptionName: 'Business class via Air India miles',
    statementCredits: [],
    portalBonuses: [],
    rotatingCategory: null,
    milestoneBonuses: [],
    feeWaiverSpendUsd: null,
    foreignTxnFeePct: 0,
  },
  sbi_simplyclick: {
    name: 'SBI SimplyCLICK',
    issuer: 'SBI Card',
    annualFeeUsd: 5.54,
    gstOnFee: 0.18,
    earnRules: [
      { merchant: 'amazon.in', rate: 10, per: 100, currency: 'points', notes: '10x points on Amazon.' },
      { merchant: 'flipkart', rate: 10, per: 100, currency: 'points' },
      { merchant: 'all', rate: 1, per: 100, currency: 'points' },
    ],
    emiEarnRate: 0,
    monthlyCapPoints: null,
    excludedCategories: ['fuel', 'utilities'],
    redemptionPaths: [
      { name: 'Statement credit', ratePerPoint: 0.25 },
      { name: 'Rewards catalog', ratePerPoint: 0.25 },
    ],
    bestRedemptionRatePerPoint: 0.25,
    bestRedemptionName: 'Statement credit (only option)',
    statementCredits: [],
    portalBonuses: [],
    rotatingCategory: null,
    milestoneBonuses: [],
    feeWaiverSpendUsd: null,
    foreignTxnFeePct: 0,
  },
  hdfc_millennia: {
    name: 'HDFC Millennia',
    issuer: 'HDFC Bank',
    annualFeeUsd: 11.11,
    gstOnFee: 0.18,
    earnRules: [
      { merchant: 'amazon.in', rate: 5, per: 100, currency: 'cashback', notes: '5% cashback on Amazon, Flipkart, Myntra via SmartBuy.' },
      { merchant: 'all', rate: 1, per: 100, currency: 'cashback' },
    ],
    emiEarnRate: 0,
    monthlyCapPoints: 1000,
    excludedCategories: ['fuel', 'emi', 'rent'],
    redemptionPaths: [
      { name: 'Cashback to statement', ratePerPoint: 1.00 },
    ],
    bestRedemptionRatePerPoint: 1.00,
    bestRedemptionName: 'Direct cashback',
    statementCredits: [],
    portalBonuses: [],
    rotatingCategory: null,
    milestoneBonuses: [],
    feeWaiverSpendUsd: null,
    foreignTxnFeePct: 0,
  },
  icici_coral: {
    name: 'ICICI Coral',
    issuer: 'ICICI Bank',
    annualFeeUsd: 5.56,
    gstOnFee: 0.18,
    earnRules: [
      { merchant: 'all', rate: 2, per: 100, currency: 'PAYBACK points' },
    ],
    emiEarnRate: 0,
    monthlyCapPoints: null,
    excludedCategories: ['fuel', 'emi'],
    redemptionPaths: [
      { name: 'PAYBACK redemption', ratePerPoint: 0.25 },
    ],
    bestRedemptionRatePerPoint: 0.25,
    bestRedemptionName: 'PAYBACK catalog',
    statementCredits: [],
    portalBonuses: [],
    rotatingCategory: null,
    milestoneBonuses: [],
    feeWaiverSpendUsd: null,
    foreignTxnFeePct: 0,
  },
}

export interface CardKnowledge {
  name: string
  issuer: string
  annualFeeUsd: number
  gstOnFee: number
  earnRules: {
    merchant: string
    rate: number
    per: number
    currency: string
    notes?: string | null | undefined
  }[]
  emiEarnRate: number
  monthlyCapPoints: number | null
  excludedCategories: string[]
  redemptionPaths: {
    name: string
    ratePerPoint: number
    ratePerPointMin?: number
  }[]
  bestRedemptionRatePerPoint: number
  bestRedemptionName: string
  statementCredits: {
    name: string
    annualValueUsd: number
    merchantCategories: string[]
  }[]
  portalBonuses: {
    portalName: string
    categories: string[]
    bonusMultiplier: number
    bonusType: 'multiplier' | 'flat_pct'
  }[]
  rotatingCategory: {
    isActive: boolean
    activeCategories: string[]
    multiplier: number
  } | null
  milestoneBonuses: {
    spendThresholdUsd: number
    bonusPoints: number
    period: string
  }[]
  feeWaiverSpendUsd: number | null
  foreignTxnFeePct: number
}

export interface OPAgentInput {
  product: {
    name: string
    price: number
    category: string
    merchant: string
    isEmi: boolean
    isForeignMerchant: boolean
  }
  cards: string[]
  cardKnowledgeMap?: Record<string, CardKnowledge>
  userMonthlyTxns?: number
  riskFreeRatePercent?: number
  billingCycleDays?: number
  userContext?: UserContext              // ← new: real user state
}

export interface CardOPResult {
  cardKey: string
  name: string
  issuer: string

  // Step 1 outputs
  actualPointsEarned: number
  earnAudit: {
    rate: number
    per: number
    confirmedEarn: boolean
    exclusionReason: string | null
    capBreached: boolean
  }

  // Step 2 outputs
  bestRedemptionName: string
  bestRedemptionRatePerPoint: number
  trueRewardValueUsd: number

  // Step 3 outputs
  feeBurdenUsd: number

  // Step 4 outputs
  floatValueUsd: number

  // Step 5 outputs
  netCost: number
  industryCost: number
  savings: number
  effectiveDiscountPercent: number
  reasoning: string
  foreignFeeUsd: number
  statementCreditApplied: number
  milestoneCreditUsd: number
  portalBonusApplied: boolean
  portalBonusName: string | null
  rotatingBonusApplied: boolean
  feeWaiverActive: boolean
  feeWaiverNote: string | null
}

export interface OPAgentResult {
  product: OPAgentInput['product']
  cards: CardOPResult[]
  winner: CardOPResult
  industryWinner: CardOPResult
  agentReasoning: string
}

// ─── The agent ────────────────────────────────────────────────────────────────

export async function runOPAgent(input: OPAgentInput, geminiApiKey: string): Promise<OPAgentResult> {
  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const userTxnsPerYear = (input.userMonthlyTxns ?? 10) * 12
  const riskFreeRate = (input.riskFreeRatePercent ?? 7) / 100
  const billingDays = input.billingCycleDays ?? 30

  // Use provided cardKnowledgeMap if available, otherwise fall back to INDIAN_CARD_KB
  const cardKB = input.cardKnowledgeMap || INDIAN_CARD_KB

  const cardKBSubset = input.cards
    .filter(k => cardKB[k])
    .map(k => ({ key: k, ...cardKB[k] }))

  // Build the agent prompt — all 5 reasoning steps in one structured pass
  const prompt = `
You are the OPValuationAgent. You calculate the true opportunity-cost-adjusted price (net cost) of purchasing a product with each credit card.

## Currency
All monetary values are in USD. 1 USD = 90 INR. Round all dollar amounts to 2 decimal places.

## Purchase details
- Product: ${input.product.name}
- Price: $${input.product.price}
- Category: ${input.product.category}
- Merchant: ${input.product.merchant}
- Payment type: ${input.product.isEmi ? 'EMI' : 'Full price'}
- Foreign merchant: ${input.product.isForeignMerchant ? 'Yes' : 'No'}

## Constants for this calculation
- Annual transactions per card: ${userTxnsPerYear}
- Risk-free rate (liquid fund): ${riskFreeRate * 100}% per annum
- Billing cycle: ${billingDays} days
netCost is a score — lower is better.
feeBurdenUsd represents the real per-transaction cost of holding this card.
A card with a high annual fee and zero rewards on this purchase correctly
costs MORE than a no-fee card — that is the honest truth.

## Card knowledge base
${JSON.stringify(cardKBSubset, null, 2)}

${input.userContext ? `
## User's real financial state
Use this to override any assumption you'd otherwise make about a generic user.

### Per-card live state
${JSON.stringify(input.userContext.cards.map(c => ({
  cardId: c.cardId,
  name: c.displayName,
  availableCredit: c.availableCredit,
  utilizationPct: c.utilizationPct,
  aprPct: c.standardAprPct,
  pointsBalance: c.pointsBalance,
  pointsValueUsd: c.pointsValueUsd,
  categoryCapProgress: c.categoryCapProgress,
  annualSpendUsd: c.annualSpendUsd,
})), null, 2)}

### Spending behaviour (last 90 days)
- Top category: ${input.userContext.behaviour.topCategory}
- Monthly avg spend: $${input.userContext.behaviour.monthlyAvgSpendUsd}
- Frequent traveller: ${input.userContext.behaviour.isFrequentTraveller}
- Frequent diner: ${input.userContext.behaviour.isFrequentDiner}
- Online shopper: ${input.userContext.behaviour.isOnlineShopper}
- Grocery dominant: ${input.userContext.behaviour.isGroceryDominant}
- EMI transaction rate: ${input.userContext.behaviour.emiTransactionPct}%
- Actual avg CPP achieved historically: ${input.userContext.behaviour.actualAvgCppAchieved ?? 'no redemption history'}
- Category breakdown: ${JSON.stringify(input.userContext.behaviour.categoryBreakdown, null, 2)}

### Rules you MUST apply using the above data

RULE 1 — Available credit gate:
If availableCredit for a card is not null AND availableCredit < $${input.product.price},
set confirmedEarn = false, set exclusionReason = "Insufficient available credit ($X available)",
and set trueRewardValueUsd = 0. Do not rank this card as usable.

RULE 2 — Utilization penalty:
If utilizationPct > 70, add a utilizationWarning field to the card result:
"High utilization (X%) — using this card may hurt your credit score."
Do not zero out rewards, but include the warning in the reasoning.

RULE 3 — APR risk flag:
If aprPct > 36, add an aprWarning: "APR is X% — one missed payment erases Y months of rewards."
Compute Y as: trueRewardValueUsd / (price * aprPct/100 / 12), rounded to 1 decimal.

RULE 4 — Realistic CPP (most important):
Do NOT use bestRedemptionRatePerPoint blindly.
Instead, pick the realistic CPP based on the user's behaviour:
- If isFrequentTraveller = true → use bestRedemptionRatePerPoint (user can actually redeem flights/business class)
- If isFrequentTraveller = false AND bestRedemptionName involves 'flight' or 'airline' or 'business class' → use ratePerPointMin from that redemption path (not redemptionPaths[1])
- If actualAvgCppAchieved is not null → use max(actualAvgCppAchieved, redemptionPaths[0].ratePerPoint) as a floor
This realistic CPP is what you use for trueRewardValueUsd. Label it realisticCpp in your output.

RULE 5 — Category cap remaining:
For each card, check categoryCapProgress for the current purchase category.
If remainingCapRoom is not null AND remainingCapRoom < price:
- Earn only on remainingCapRoom at the bonus rate
- Earn on (price - remainingCapRoom) at post_cap_multiplier rate (default 1x)
- Set capBreached = true and note it in exclusionReason

RULE 6 — Existing points bonus:
If pointsBalance > 0, add an existingPoints field:
{ balance: N, valueUsd: X, note: "You already have $X worth of points on this card" }
This is informational — do not add it to trueRewardValueUsd (those are existing, not new).

RULE 7 — EMI penalty:
If isEmi = true OR user's emiTransactionPct > 40 (habitual EMI user) and price > $334:
set actualPointsEarned = price * emiEarnRate (usually 0), set confirmedEarn = false,
exclusionReason = "EMI transactions earn 0 points on this card."

RULE 8 — Statement credits:
Sum all statementCredits whose merchantCategories includes the purchase category (or is empty []).
statementCreditAnnualUsd = sum of matching credit.annualValueUsd.
effectiveAnnualFee = (annualFeeUsd * (1 + gstOnFee)) - statementCreditAnnualUsd.
feeBurdenUsd = max(0, effectiveAnnualFee) / userTxnsPerYear.
Set statementCreditApplied = statementCreditAnnualUsd / userTxnsPerYear in output.

RULE 9 — Fee waiver:
If feeWaiverSpendUsd is not null AND annualSpendUsd >= feeWaiverSpendUsd:
  set annualFeeUsd = 0 for this card. Set feeWaiverActive = true.
  feeWaiverNote = "Annual fee waived — you've spent $X this year (threshold: $Y)"
Else if feeWaiverSpendUsd is not null:
  set feeWaiverActive = false.
  feeWaiverNote = "$X more spend this year waives the annual fee"

RULE 10 — Milestone bonuses:
For each milestone in milestoneBonuses where annualSpendUsd >= spendThresholdUsd:
  milestoneCreditUsd += (bonusPoints * realisticCpp) / userTxnsPerYear
Subtract milestoneCreditUsd from feeBurdenUsd (floor at 0).

RULE 11 — Rotating category bonus:
Before picking the earnRule in Step 1, check rotatingCategory.
If rotatingCategory.isActive = true AND rotatingCategory.activeCategories includes the purchase category:
  use rotatingCategory.multiplier as the earn rate (per 100).
  Set rotatingBonusApplied = true in earnAudit.

RULE 12 — Portal bonus:
After computing actualPointsEarned in Step 1, check portalBonuses.
If any portalBonus.categories includes the purchase category AND bonusType = "multiplier":
  actualPointsEarned = actualPointsEarned * bonusMultiplier.
  Set portalBonusApplied = true, portalBonusName = portalBonus.portalName.
  Note in reasoning: "Requires routing through [portalName]."
` : ''}

## Your task
For EACH card, reason through all 5 steps and produce a JSON result.

### Step 1 — EarnAudit
- Check if the merchant (${input.product.merchant}) is excluded
- Check if payment is EMI (use emiEarnRate if so)
- Find the matching earnRule for this merchant
- Confirm no monthly cap issue (assume this is the first transaction of the month)
- Compute: actualPointsEarned = (price / per) * rate
// Do NOT use floor(). Cards earn proportionally on every dollar spent.
// e.g. 5% cashback on $50 = $2.50 earned, not $0.
// Round to 2 decimal places in your output.
// Apply RULE 11 (rotating category) before picking earnRule.
// Apply RULE 12 (portal bonus) after computing actualPointsEarned.

### Step 2 — RedemptionValue  
- List all redemption paths for this card
- Pick the highest ratePerPoint as bestRedemptionRatePerPoint
- Compute: trueRewardValueUsd = actualPointsEarned * bestRedemptionRatePerPoint
- Also compute industryRewardValue = actualPointsEarned * redemptionPaths[0].ratePerPoint (cheapest path — what banks advertise)

### Step 3 — FeeAmortization
- Apply RULE 8 (statement credits) to reduce effective annual fee
- Apply RULE 9 (fee waiver) to zero out annual fee if threshold met
- Apply RULE 10 (milestone bonuses) to reduce fee burden
- totalFeeUsd = annualFeeUsd * (1 + gstOnFee)
- feeBurdenUsd = totalFeeUsd / ${userTxnsPerYear}

### Step 4 — FloatValue
- floatValueUsd = price * riskFreeRate * (billingDays / 365)
- floatValueUsd = ${input.product.price} * ${riskFreeRate} * (${billingDays} / 365)

### Step 5 — NetCost
- Apply RULE 13 (foreign transaction fee): If isForeignMerchant = true AND foreignTxnFeePct > 0: foreignFeeUsd = price * foreignTxnFeePct / 100. Else: foreignFeeUsd = 0.
- netCost = price - trueRewardValueUsd + feeBurdenUsd - floatValueUsd + foreignFeeUsd
- industryCost = price - industryRewardValue + feeBurdenUsd - floatValueUsd + foreignFeeUsd
- savings = industryCost - netCost  (how much better than industry)
- effectiveDiscountPercent = ((price - netCost) / price) * 100
- Write a 2-sentence plain-English reasoning explaining why this card ranks where it does

## Output format
Respond ONLY with a valid JSON object. No markdown, no backticks, no preamble.

{
  "cards": [
    {
      "cardKey": "string",
      "name": "string",
      "issuer": "string",
      "actualPointsEarned": number,
      "earnAudit": {
        "rate": number,
        "per": number,
        "confirmedEarn": boolean,
        "exclusionReason": null or "string",
        "capBreached": false
      },
      "bestRedemptionName": "string",
      "bestRedemptionRatePerPoint": number,
      "trueRewardValueUsd": number,
      "realisticCpp": number,
      "industryRewardValue": number,
      "feeBurdenUsd": number,
      "floatValueUsd": number,
      "netCost": number,
      "industryCost": number,
      "savings": number,
      "effectiveDiscountPercent": number,
      "reasoning": "string",
      "utilizationWarning": null or "string",
      "aprWarning": null or "string",
      "existingPoints": { "balance": number, "valueUsd": number, "note": "string" } or null,
      "capBreached": boolean,
      "foreignFeeUsd": number,
      "statementCreditApplied": number,
      "milestoneCreditUsd": number,
      "portalBonusApplied": boolean,
      "portalBonusName": null or "string",
      "rotatingBonusApplied": boolean,
      "feeWaiverActive": boolean,
      "feeWaiverNote": null or "string"
    }
  ],
  "agentReasoning": "One paragraph summary of the overall analysis and why the winner wins"
}
`

  const result = await model.generateContent(prompt)
  const text = result.response.text()

  // Strip markdown fences if Gemini wraps them
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed: { cards: any[]; agentReasoning: string }
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`Gemini returned invalid JSON: ${text.slice(0, 300)}`)
  }

  // Sort by netCost ascending
  const sorted: CardOPResult[] = parsed.cards.sort(
    (a: CardOPResult, b: CardOPResult) => a.netCost - b.netCost
  )

  // Industry winner = lowest industryCost
  const industrySorted = [...parsed.cards].sort(
    (a: any, b: any) => a.industryCost - b.industryCost
  )

  return {
    product: input.product,
    cards: sorted,
    winner: sorted[0],
    industryWinner: industrySorted[0],
    agentReasoning: parsed.agentReasoning,
  }
}
