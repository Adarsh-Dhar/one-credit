// Shared types for the extension

export interface Product {
  name: string
  price: number
  originalPrice?: number | null
  url: string
  category: string
  source: 'amazon' | 'walmart' | 'bestbuy' | 'target' | 'ebay' | 'generic'
  detectedAt: string
}

export interface Card {
  key: string
  name: string
  issuer: string
  earnRate: number
  opCost?: number
  rank?: number
  rewardsEarned?: number
  opportunityMultiplier?: number
  reasoning?: string
}

export interface Message {
  type:
    | 'PRODUCT_DETECTED'
    | 'ANALYZE_PRODUCT'
    | 'CARD_SELECTED'
    | 'GET_STATUS'
    | 'PRODUCT_DETECTED_UPDATE'
    | 'SET_USER_SESSION'
    | 'GET_USER_SESSION'
    | 'GET_SESSION'
    | 'RUM_EVENTS'
    | 'START_PICKER'
    | 'PICKER_RESULT'
  data?: any
  product?: Product
  userId?: string
  apiKey?: string
  cardKey?: string
}

export interface MessageResponse {
  success: boolean
  data?: any
  error?: string
  status?: any
}
