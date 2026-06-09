// lib/userContext/types.ts
//
// Type definitions for user context building

export interface TransactionLean {
  cardId: string
  amountUsd: number
  category: string
  merchant: string
  createdAt: Date
  isEmi?: boolean
  pointsRedeemed?: number
  valueReceivedUsd?: number
}

export interface CardLiveState {
  cardId: string
  displayName: string

  // Credit health
  creditLimit: number | null
  currentBalanceOwed: number
  availableCredit: number | null
  utilizationPct: number | null
  standardAprPct: number

  // Existing rewards
  pointsBalance: number
  pointsValueUsd: number

  // OP token state (USD cards only — null when not applicable)
  opTokenState: {
    tokenBalance: number
    tokenValueUsd: number
    opCentsPerToken: number
    minRedeemThreshold: number
    isTokenLow: boolean
  } | null

  // Category cap progress this month
  categoryCapProgress: {
    category: string
    spentTowardsCap: number
    capLimit: number | null
    remainingCapRoom: number | null
  }[]
  annualSpendUsd: number
}

export interface SpendingBehaviour {
  // ── Cross-card aggregate (last 90 days) ────────────────────────────────────
  categoryBreakdown: {
    category: string
    totalSpentUsd: number
    txCount: number
    sharePct: number
    avgTxSizeUsd: number
  }[]

  // ── Per-card category breakdown ────────────────────────────────────────────
  cardCategoryBreakdown: Record<string, {
    category: string
    totalSpentUsd: number
    txCount: number
    sharePct: number
  }[]>

  // ── Merchant tracking ──────────────────────────────────────────────────────
  topMerchants: {
    merchant: string
    totalSpentUsd: number
    txCount: number
    category: string
    primaryCardId: string
  }[]

  cardTopMerchants: Record<string, {
    merchant: string
    totalSpentUsd: number
    txCount: number
  }[]>

  // ── Lifestyle signals ──────────────────────────────────────────────────────
  topCategory: string
  isFrequentTraveller: boolean
  isFrequentDiner: boolean
  isOnlineShopper: boolean
  isGroceryDominant: boolean
  monthlyAvgSpendUsd: number

  // ── Monthly trend (last 3 months) ─────────────────────────────────────────
  monthlyTrend: {
    month: string
    totalSpentUsd: number
    categoryBreakdown: { category: string; totalSpentUsd: number; sharePct: number }[]
  }[]
  momSpendChangePct: number | null
  fastestGrowingCategory: string | null

  // ── Redemption behaviour ───────────────────────────────────────────────────
  actualAvgCppAchieved: number | null
  totalPointsRedeemed90d: number
  redemptionCount90d: number

  // ── Monthly installment behaviour ─────────────────────────────────────────────────────────
  monthlyInstallmentTransactionPct: number
}

export interface UserContext {
  userId: string
  cards: CardLiveState[]
  behaviour: SpendingBehaviour
  totalOpTokens: number
  totalOpBalanceUsd: number
}
