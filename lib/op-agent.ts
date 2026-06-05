// lib/op-agent.ts
//
// The 5-step cost valuation agent powered by Gemini.
// Each step is a focused reasoning pass. The final step assembles the result.

import { GoogleGenerativeAI } from '@google/generative-ai'

// ─── Indian card knowledge base ──────────────────────────────────────────────
// This is what the agent reasons over. Add more cards here as needed.

export const INDIAN_CARD_KB: Record<string, CardKnowledge> = {
  hdfc_regalia_gold: {
    name: 'HDFC Regalia Gold',
    issuer: 'HDFC Bank',
    annualFeeInr: 2500,
    gstOnFee: 0.18,
    earnRules: [
      { merchant: 'amazon.in', rate: 4, per: 150, currency: 'points', notes: 'Standard rate. Not excluded.' },
      { merchant: 'flipkart', rate: 4, per: 150, currency: 'points' },
      { merchant: 'all', rate: 4, per: 150, currency: 'points' },
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
  },
  amazon_pay_icici: {
    name: 'Amazon Pay ICICI',
    issuer: 'ICICI Bank',
    annualFeeInr: 0,
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
  },
  axis_magnus: {
    name: 'Axis Magnus',
    issuer: 'Axis Bank',
    annualFeeInr: 12500,
    gstOnFee: 0.18,
    earnRules: [
      { merchant: 'all', rate: 12, per: 200, currency: 'EDGE Miles', notes: '12 EDGE Miles per ₹200.' },
      { merchant: 'travel_partners', rate: 35, per: 200, currency: 'EDGE Miles', notes: '35 EDGE Miles per ₹200 on travel partners.' },
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
  },
  sbi_simplyclick: {
    name: 'SBI SimplyCLICK',
    issuer: 'SBI Card',
    annualFeeInr: 499,
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
  },
  hdfc_millennia: {
    name: 'HDFC Millennia',
    issuer: 'HDFC Bank',
    annualFeeInr: 1000,
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
  },
  icici_coral: {
    name: 'ICICI Coral',
    issuer: 'ICICI Bank',
    annualFeeInr: 500,
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
  },
}

export interface CardKnowledge {
  name: string
  issuer: string
  annualFeeInr: number
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
  }[]
  bestRedemptionRatePerPoint: number
  bestRedemptionName: string
}

export interface OPAgentInput {
  product: {
    name: string
    price: number
    category: string
    merchant: string
    isEmi: boolean
  }
  cards: string[]           // card keys
  cardKnowledgeMap?: Record<string, CardKnowledge>  // optional override for INDIAN_CARD_KB
  userMonthlyTxns?: number  // for fee amortization, default 10
  riskFreeRatePercent?: number  // for float calc, default 7
  billingCycleDays?: number     // default 30
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
  trueRewardValueInr: number

  // Step 3 outputs
  feeBurdenInr: number

  // Step 4 outputs
  floatValueInr: number

  // Step 5 outputs
  netCost: number
  industryCost: number
  savings: number
  effectiveDiscountPercent: number
  reasoning: string
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

## Purchase details
- Product: ${input.product.name}
- Price: ₹${input.product.price}
- Category: ${input.product.category}
- Merchant: ${input.product.merchant}
- Payment type: ${input.product.isEmi ? 'EMI' : 'Full price'}

## Constants for this calculation
- Annual transactions per card: ${userTxnsPerYear}
- Risk-free rate (liquid fund): ${riskFreeRate * 100}% per annum
- Billing cycle: ${billingDays} days
netCost is a score — lower is better.
feeBurdenInr represents the real per-transaction cost of holding this card.
A card with a high annual fee and zero rewards on this purchase correctly
costs MORE than a no-fee card — that is the honest truth.

## Card knowledge base
${JSON.stringify(cardKBSubset, null, 2)}

## Your task
For EACH card, reason through all 5 steps and produce a JSON result.

### Step 1 — EarnAudit
- Check if the merchant (${input.product.merchant}) is excluded
- Check if payment is EMI (use emiEarnRate if so)
- Find the matching earnRule for this merchant
- Confirm no monthly cap issue (assume this is the first transaction of the month)
- Compute: actualPointsEarned = (price / per) * rate
// Do NOT use floor(). Cards earn proportionally on every rupee spent.
// e.g. 5% cashback on ₹66 = ₹3.30 earned, not ₹0.
// Round to 2 decimal places in your output.

### Step 2 — RedemptionValue  
- List all redemption paths for this card
- Pick the highest ratePerPoint as bestRedemptionRatePerPoint
- Compute: trueRewardValueInr = actualPointsEarned * bestRedemptionRatePerPoint
- Also compute industryRewardValue = actualPointsEarned * redemptionPaths[0].ratePerPoint (cheapest path — what banks advertise)

### Step 3 — FeeAmortization
- totalFeeInr = annualFeeInr * (1 + gstOnFee)
- feeBurdenInr = totalFeeInr / ${userTxnsPerYear}

### Step 4 — FloatValue
- floatValueInr = price * riskFreeRate * (billingDays / 365)
- floatValueInr = ${input.product.price} * ${riskFreeRate} * (${billingDays} / 365)

### Step 5 — NetCost
- netCost = price - trueRewardValueInr + feeBurdenInr - floatValueInr
- industryCost = price - industryRewardValue + feeBurdenInr - floatValueInr
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
      "trueRewardValueInr": number,
      "industryRewardValue": number,
      "feeBurdenInr": number,
      "floatValueInr": number,
      "netCost": number,
      "industryCost": number,
      "savings": number,
      "effectiveDiscountPercent": number,
      "reasoning": "string"
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
