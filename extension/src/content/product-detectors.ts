// Product detection functions for different e-commerce sites
import type { Product } from '@/types'

const CONTENT_SCRIPT_CONSTANTS = {
  PRICE_CONVERSION_DIVISOR: 90,
} as const

export function detectAmazonProduct(url: string): Product | null {
  const titleElement = document.querySelector('#productTitle') || document.querySelector('h1 span')

  let price: string | null = null
  let originalPrice: number | null = null

  const allPriceBlocks = document.querySelectorAll('.a-price')
  let dealPriceBlock: Element | null = null

  for (const block of Array.from(allPriceBlocks)) {
    if (block.closest('.a-text-price')) {
      continue
    }
    dealPriceBlock = block
    break
  }

  if (dealPriceBlock) {
    const whole = dealPriceBlock.querySelector('.a-price-whole')?.textContent?.replace(/[^0-9]/g, '') || ''
    const frac = dealPriceBlock.querySelector('.a-price-fraction')?.textContent?.replace(/[^0-9]/g, '') || '00'
    if (whole) {
      price = whole + '.' + frac
    }
  }

  if (!price) {
    const offscreenEls = document.querySelectorAll('.a-offscreen')
    for (const el of Array.from(offscreenEls)) {
      if (el.closest('.a-text-price')) {
        continue
      }
      const raw = el.textContent?.replace(/[^0-9.]/g, '')
      if (raw && parseFloat(raw) > 0) {
        price = raw
        break
      }
    }
  }

  const originalEl = document.querySelector('.a-text-price .a-offscreen') as HTMLElement
  if (originalEl) {
    originalPrice = parseFloat(originalEl.textContent?.replace(/[^0-9.]/g, '') || '0') || null
  }

  const title = titleElement?.textContent?.trim()

  if (price && title) {
    const priceInUsd = parseFloat(price) / CONTENT_SCRIPT_CONSTANTS.PRICE_CONVERSION_DIVISOR
    const originalPriceInUsd = originalPrice ? originalPrice / CONTENT_SCRIPT_CONSTANTS.PRICE_CONVERSION_DIVISOR : null

    return {
      name: title,
      price: priceInUsd,
      originalPrice: originalPriceInUsd,
      url,
      category: 'electronics',
      source: 'amazon',
      detectedAt: new Date().toISOString(),
      website: new URL(url).hostname,
    }
  }

  return null
}

export function detectWalmartProduct(url: string): Product | null {
  const priceElement = document.querySelector('[data-testid="listPrice"]')
  const titleElement = document.querySelector('h1')
  const price = priceElement?.textContent?.replace(/[^0-9.]/g, '')
  const title = titleElement?.textContent

  if (price && title) {
    return {
      name: title,
      price: parseFloat(price),
      url: url,
      category: 'general',
      source: 'walmart',
      detectedAt: new Date().toISOString(),
      website: new URL(url).hostname,
    }
  }

  return null
}

export function detectBestBuyProduct(url: string): Product | null {
  const priceElement = document.querySelector('[data-cy="pricing-price"]')
  const titleElement = document.querySelector('h1')
  const price = priceElement?.textContent?.replace(/[^0-9.]/g, '')
  const title = titleElement?.textContent

  if (price && title) {
    return {
      name: title,
      price: parseFloat(price),
      url: url,
      category: 'electronics',
      source: 'bestbuy',
      detectedAt: new Date().toISOString(),
      website: new URL(url).hostname,
    }
  }

  return null
}

export function detectTargetProduct(url: string): Product | null {
  const priceElement = document.querySelector('[data-test="product-price"]')
  const titleElement = document.querySelector('h1')
  const price = priceElement?.textContent?.replace(/[^0-9.]/g, '')
  const title = titleElement?.textContent

  if (price && title) {
    return {
      name: title,
      price: parseFloat(price),
      url: url,
      category: 'general',
      source: 'target',
      detectedAt: new Date().toISOString(),
      website: new URL(url).hostname,
    }
  }

  return null
}

export function detectProduct(): Product | null {
  const url = window.location.href

  if (url.includes('amazon.com') || url.includes('amazon.in')) {
    return detectAmazonProduct(url)
  }

  if (url.includes('walmart.com')) {
    return detectWalmartProduct(url)
  }

  if (url.includes('bestbuy.com')) {
    return detectBestBuyProduct(url)
  }

  if (url.includes('target.com')) {
    return detectTargetProduct(url)
  }

  return null
}
