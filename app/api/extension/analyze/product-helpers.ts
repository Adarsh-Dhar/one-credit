// Product attribute detection and helper functions
import { inferCategory, sanitizeForPrompt, isForeignMerchant } from '@/lib/utils'
import { OP_AGENT_CONFIG } from '@/lib/constants'

const SOURCE_TO_MERCHANT_DOMAIN: Record<string, string> = {
  amazon: 'amazon.com',
  'amazon.in': 'amazon.in',
  walmart: 'walmart.com',
  bestbuy: 'bestbuy.com',
  target: 'target.com',
  ebay: 'ebay.com',
}

export function detectProductAttributes(product: { name?: string; url?: string; source?: string }): {
  isEmi: boolean
  merchant: string
  isForeignMerchant: boolean
  category: string
} {
  const isEmi = product.url?.includes('emi') || product.name?.toLowerCase().includes('emi') || false
  const merchant = sanitizeForPrompt((product.source && SOURCE_TO_MERCHANT_DOMAIN[product.source]) || product.source || 'amazon.in')
  const isForeignMerchantValue = isForeignMerchant(merchant)
  const category = sanitizeForPrompt(inferCategory(product.name || ''))

  return { isEmi, merchant, isForeignMerchant: isForeignMerchantValue, category }
}

export function calculateMonthlyTxns(userContext: { behaviour: { monthlyAvgSpendUsd: number; categoryBreakdown: { txCount: number }[] } }): number {
  return userContext.behaviour.monthlyAvgSpendUsd > 0
    ? Math.max(OP_AGENT_CONFIG.MIN_MONTHLY_TXNS, Math.round(userContext.behaviour.categoryBreakdown.reduce((s, c) => s + c.txCount, 0) / OP_AGENT_CONFIG.TXN_COUNT_DIVISOR))
    : OP_AGENT_CONFIG.DEFAULT_MONTHLY_TXNS
}
