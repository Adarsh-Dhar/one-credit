import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Sanitize user-controlled strings before prompt interpolation
export function sanitizeForPrompt(s: string, maxLen = 200): string {
  return s.replace(/[`${}\\]/g, '').slice(0, maxLen)
}

// Infer category intelligently from product name
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: string }> = [
  { pattern: /date|dry fruit|nuts|cashew|almond|raisin|walnut|apricot|fig|pista/, category: 'grocery' },
  { pattern: /rice|dal|flour|oil|sugar|salt|spice|masala|pulses|atta/, category: 'grocery' },
  { pattern: /biscuit|cookie|chocolate|candy|snack|chips|popcorn/, category: 'grocery' },
  { pattern: /milk|curd|paneer|cheese|butter|ghee|cream/, category: 'grocery' },
  { pattern: /shampoo|soap|toothpaste|facewash|moisturizer|sunscreen/, category: 'personal care' },
  { pattern: /phone|mobile|laptop|tablet|earphone|headphone|charger|cable|speaker|camera/, category: 'electronics' },
  { pattern: /shirt|pant|jeans|dress|saree|kurta|jacket|shoe|sandal/, category: 'fashion' },
  { pattern: /book|novel|textbook|guide|comics/, category: 'books' },
  { pattern: /flight|hotel|train|bus|cab|tour/, category: 'travel' },
  { pattern: /restaurant|food delivery|zomato|swiggy/, category: 'dining' },
  { pattern: /gym|yoga|fitness|protein|supplement/, category: 'fitness' },
  { pattern: /netflix|hotstar|prime|spotify|zee5/, category: 'streaming' },
  { pattern: /petrol|diesel|fuel/, category: 'gas' },
  { pattern: /medicine|tablet|capsule|syrup|health/, category: 'pharmacy' },
]

export function inferCategory(productName: string): string {
  const name = productName.toLowerCase()
  // Amazon purchases fall through to 'shopping' default since the extension
  // was generalized beyond Amazon-only support. If Amazon-specific categorization
  // is needed in the future, add a pattern here.
  return CATEGORY_PATTERNS.find(({ pattern }) => pattern.test(name))?.category ?? 'shopping'
}
