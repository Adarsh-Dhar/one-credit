// Content script for OneCredit extension
import type { Product } from '@/types'

// Immediate log to verify content script is loaded
if (process.env.NODE_ENV === 'development') {
  console.log('[OneCredit] Content script loaded - URL:', window.location.href)
}

// Global error handler to catch extension context invalidation errors
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('Extension context')) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[OneCredit] Extension context error caught:', event.message)
    }
    event.preventDefault()
    event.stopPropagation()
  }
})

// Detect product information from the current page
function detectProduct(): Product | null {
  const url = window.location.href
  let product: Partial<Product> | null = null

  // Amazon detection
  if (url.includes('amazon.com') || url.includes('amazon.in')) {
    const titleElement = document.querySelector('#productTitle') || document.querySelector('h1 span')

    let price: string | null = null
    let originalPrice: number | null = null

    // The deal/current price is inside .a-section.a-spacing-none.apex_desktop or corePriceDisplay_desktop_feature_div
    // We target the FIRST .a-price that is NOT inside .a-text-price (which is the crossed-out original)
    const allPriceBlocks = document.querySelectorAll('.a-price')
    let dealPriceBlock: Element | null = null

    for (const block of Array.from(allPriceBlocks)) {
      // Skip if this price block is inside a struck-through container
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

    // Fallback: .a-offscreen contains the full formatted price e.g. "₹26,990"
    if (!price) {
      const offscreenEls = document.querySelectorAll('.a-offscreen')
      for (const el of Array.from(offscreenEls)) {
        if (el.closest('.a-text-price')) {
continue
} // skip struck-through
        const raw = el.textContent?.replace(/[^0-9.]/g, '')
        if (raw && parseFloat(raw) > 0) {
          price = raw
          break
        }
      }
    }

    // Original (struck-through) price
    const originalEl = document.querySelector('.a-text-price .a-offscreen') as HTMLElement
    if (originalEl) {
      originalPrice = parseFloat(originalEl.textContent?.replace(/[^0-9.]/g, '') || '0') || null
    }

    const title = titleElement?.textContent?.trim()

    if (price && title) {
      // Convert INR to USD (1 USD = 90 INR)
      const priceInUsd = parseFloat(price) / 90
      const originalPriceInUsd = originalPrice ? originalPrice / 90 : null
      
      product = {
        name: title,
        price: priceInUsd,
        originalPrice: originalPriceInUsd,
        url,
        category: 'electronics',
        source: 'amazon',
        detectedAt: new Date().toISOString(),
      }
    }
  }

  // Walmart detection
  if (url.includes('walmart.com')) {
    const priceElement = document.querySelector('[data-testid="listPrice"]')
    const titleElement = document.querySelector('h1')
    const price = priceElement?.textContent?.replace(/[^0-9.]/g, '')
    const title = titleElement?.textContent

    if (price && title) {
      product = {
        name: title,
        price: parseFloat(price),
        url: url,
        category: 'general',
        source: 'walmart',
        detectedAt: new Date().toISOString(),
      }
    }
  }

  // Best Buy detection
  if (url.includes('bestbuy.com')) {
    const priceElement = document.querySelector('[data-cy="pricing-price"]')
    const titleElement = document.querySelector('h1')
    const price = priceElement?.textContent?.replace(/[^0-9.]/g, '')
    const title = titleElement?.textContent

    if (price && title) {
      product = {
        name: title,
        price: parseFloat(price),
        url: url,
        category: 'electronics',
        source: 'bestbuy',
        detectedAt: new Date().toISOString(),
      }
    }
  }

  // Target detection
  if (url.includes('target.com')) {
    const priceElement = document.querySelector('[data-test="product-price"]')
    const titleElement = document.querySelector('h1')
    const price = priceElement?.textContent?.replace(/[^0-9.]/g, '')
    const title = titleElement?.textContent

    if (price && title) {
      product = {
        name: title,
        price: parseFloat(price),
        url: url,
        category: 'general',
        source: 'target',
        detectedAt: new Date().toISOString(),
      }
    }
  }

  return (product as Product) || null
}

// Monitor page for product information
function monitorPage() {
  console.log('[OneCredit] Starting page monitoring')

  // Initial detection attempt
  let lastSentUrl = ''
  let lastSentPrice = 0
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function tryDetectAndSend() {
    const product = detectProduct()
    if (!product) {
return
}

    // Deduplicate — only send if price or URL changed
    if (product.url === lastSentUrl && product.price === lastSentPrice) {
return
}
    lastSentUrl = product.url
    lastSentPrice = product.price

    if (process.env.NODE_ENV === 'development') {
      console.log('[OneCredit] Product detected:', product.name, product.price)
    }

    try {
      chrome.runtime.sendMessage({ type: 'PRODUCT_DETECTED', data: product }, (response) => {
        if (chrome.runtime.lastError) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[OneCredit] sendMessage error:', chrome.runtime.lastError.message)
          }
        } else if (response?.success) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[OneCredit] Product stored successfully')
          }
        }
      })
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[OneCredit] sendMessage threw:', e)
      }
    }
  }

  // Debounced observer — waits 500ms after mutations settle before detecting
  const observer = new MutationObserver(() => {
    if (debounceTimer) {
clearTimeout(debounceTimer)
}
    debounceTimer = setTimeout(tryDetectAndSend, 500)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  // Try immediately on load, then again after 1s and 3s for lazy-loaded prices
  tryDetectAndSend()
  setTimeout(tryDetectAndSend, 1000)
  setTimeout(tryDetectAndSend, 3000)
}

// Start monitoring when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorPage)
} else {
  monitorPage()
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.type === 'PRODUCT_DETECTED_UPDATE') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[OneCredit] Product update received:', request.data)
    }
    // Trigger any UI updates needed
  }
})

if (process.env.NODE_ENV === 'development') {
  console.log('[OneCredit] Content script loaded')
}
