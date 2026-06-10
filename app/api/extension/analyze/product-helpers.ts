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

export function detectProductAttributes(product: { name?: string; url?: string; source?: string; website?: string }): {
  isEmi: boolean
  merchant: string
  isForeignMerchant: boolean
  category: string
} {
  const isEmi = product.url?.includes('emi') || product.name?.toLowerCase().includes('emi') || false
  // Use website if available, otherwise fall back to source mapping
  const merchant = sanitizeForPrompt(product.website || (product.source && SOURCE_TO_MERCHANT_DOMAIN[product.source]) || product.source || 'generic')
  const isForeignMerchantValue = isForeignMerchant(merchant)
  
  // Use website to infer category if available (e.g., flight booking sites)
  let category = sanitizeForPrompt(inferCategory(product.name || ''))
  if (product.website) {
    const websiteLower = product.website.toLowerCase()
    // Detect flight/travel booking sites
    if (websiteLower.includes('goindigo') || websiteLower.includes('indigo') || 
        websiteLower.includes('airindia') || websiteLower.includes('vistara') ||
        websiteLower.includes('spicejet') || websiteLower.includes('makemytrip') ||
        websiteLower.includes('cleartrip') || websiteLower.includes('yatra') ||
        websiteLower.includes('expedia') || websiteLower.includes('booking') ||
        websiteLower.includes('airline') || websiteLower.includes('flight')) {
      category = 'airlines'
    }
  }

  return { isEmi, merchant, isForeignMerchant: isForeignMerchantValue, category }
}

export function calculateMonthlyTxns(userContext: { behaviour: { monthlyAvgSpendUsd: number; categoryBreakdown: { txCount: number }[] } }): number {
  return userContext.behaviour.monthlyAvgSpendUsd > 0
    ? Math.max(OP_AGENT_CONFIG.MIN_MONTHLY_TXNS, Math.round(userContext.behaviour.categoryBreakdown.reduce((s, c) => s + c.txCount, 0) / OP_AGENT_CONFIG.TXN_COUNT_DIVISOR))
    : OP_AGENT_CONFIG.DEFAULT_MONTHLY_TXNS
}
