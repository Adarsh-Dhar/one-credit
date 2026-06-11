// Product attribute detection and helper functions
import { inferCategory, sanitizeForPrompt, isForeignMerchant } from '@/lib/utils'
import { OP_AGENT_CONFIG } from '@/lib/constants'
import { GoogleGenerativeAI } from '@google/generative-ai'

const VALID_CATEGORIES = [
  'dining',
  'groceries',
  'travel',
  'airlines',
  'gas',
  'streaming',
  'shopping',
  'luxury',
  'electronics',
  'apparel',
  'jewelry',
  'home',
  'health',
  'fitness',
  'education',
  'entertainment',
  'transportation',
  'utilities',
  'insurance',
  'professional_services',
  'other'
] as const

type ValidCategory = typeof VALID_CATEGORIES[number]

async function detectCategoryWithAI(
  productName: string,
  merchant: string,
  website?: string,
  geminiApiKey?: string
): Promise<ValidCategory> {
  if (!geminiApiKey) {
    return inferCategory(productName) as ValidCategory
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const prompt = `You are a transaction categorization assistant. Categorize the following product/merchant into ONE of these exact categories:

${VALID_CATEGORIES.join(', ')}

IMPORTANT CATEGORIZATION RULES:
- Use "airlines" for flight bookings, airline tickets, airport services, and anything related to air travel
- Use "travel" for hotels, vacation rentals, car rentals, cruises, and general travel services (not flights)
- Use "luxury" for watches, jewelry, designer goods, and high-end purchases
- Use "electronics" for computers, phones, tablets, and tech gadgets

Product name: ${productName}
Merchant: ${merchant}
Website: ${website || 'N/A'}

Respond with ONLY the category name (e.g., "airlines", "luxury", "electronics", "dining"). No explanation, no markdown.`

    const result = await model.generateContent(prompt)
    const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || ''

    // Validate the response is a valid category
    if (VALID_CATEGORIES.includes(response as ValidCategory)) {
      return response as ValidCategory
    }

    // Fallback to rule-based if AI returns invalid category
    return inferCategory(productName) as ValidCategory
  } catch (error) {
    console.error('AI category detection failed, falling back to rule-based:', error)
    return inferCategory(productName) as ValidCategory
  }
}

const SOURCE_TO_MERCHANT_DOMAIN: Record<string, string> = {
  amazon: 'amazon.com',
  'amazon.in': 'amazon.in',
  walmart: 'walmart.com',
  bestbuy: 'bestbuy.com',
  target: 'target.com',
  ebay: 'ebay.com',
}

export async function detectProductAttributes(
  product: { name?: string; url?: string; source?: string; website?: string },
  geminiApiKey?: string
): Promise<{
  isEmi: boolean
  merchant: string
  isForeignMerchant: boolean
  category: string
}> {
  const isEmi = product.url?.includes('emi') || product.name?.toLowerCase().includes('emi') || false
  // Use website if available, otherwise fall back to source mapping
  const merchant = sanitizeForPrompt(product.website || (product.source && SOURCE_TO_MERCHANT_DOMAIN[product.source]) || product.source || 'generic')
  const isForeignMerchantValue = isForeignMerchant(merchant)

  // Use AI-based category detection if Gemini API key is available
  let category: string
  if (geminiApiKey && product.name) {
    category = await detectCategoryWithAI(product.name, merchant, product.website, geminiApiKey)
  } else {
    // Fallback to rule-based detection
    category = sanitizeForPrompt(inferCategory(product.name || ''))
    if (product.website) {
      const websiteLower = product.website.toLowerCase()
      // Detect flight/travel booking sites - categorize as airlines
      if (websiteLower.includes('goindigo') || websiteLower.includes('indigo') ||
          websiteLower.includes('airindia') || websiteLower.includes('vistara') ||
          websiteLower.includes('spicejet') || websiteLower.includes('makemytrip') ||
          websiteLower.includes('cleartrip') || websiteLower.includes('yatra') ||
          websiteLower.includes('expedia') || websiteLower.includes('booking') ||
          websiteLower.includes('airline') || websiteLower.includes('flight')) {
        category = 'airlines'
      }
    }
  }

  return { isEmi, merchant, isForeignMerchant: isForeignMerchantValue, category }
}

export function calculateMonthlyTxns(userContext: { behaviour: { monthlyAvgSpendUsd: number; categoryBreakdown: { txCount: number }[] } }): number {
  return userContext.behaviour.monthlyAvgSpendUsd > 0
    ? Math.max(OP_AGENT_CONFIG.MIN_MONTHLY_TXNS, Math.round(userContext.behaviour.categoryBreakdown.reduce((s, c) => s + c.txCount, 0) / OP_AGENT_CONFIG.TXN_COUNT_DIVISOR))
    : OP_AGENT_CONFIG.DEFAULT_MONTHLY_TXNS
}
