// Content script for OneCredit extension
import type { Product } from '@/types'

// Detect product information from the current page
function detectProduct(): Product | null {
  const url = window.location.href
  let product: Partial<Product> | null = null

  // Amazon detection
  if (url.includes('amazon.com') || url.includes('amazon.in')) {
    const titleElement = document.querySelector('#productTitle') || document.querySelector('h1 span')
    
    // Try multiple price selectors — Amazon uses different ones per page type
    const priceWhole = document.querySelector('.a-price-whole')
    const priceFraction = document.querySelector('.a-price-fraction')
    const priceSymbol = document.querySelector('.a-price-symbol')
    const priceOffscreen = document.querySelector('.a-offscreen') as HTMLElement
    
    let price: string | null = null
    let originalPrice: number | null = null

    if (priceWhole) {
      // e.g. "1,499" + "00"
      const whole = priceWhole.textContent?.replace(/[^0-9]/g, '') || ''
      const frac = priceFraction?.textContent?.replace(/[^0-9]/g, '') || '00'
      price = whole + (frac.length === 2 ? '.' + frac : '')
    } else if (priceOffscreen) {
      // e.g. "₹1,499.00"
      price = priceOffscreen.textContent?.replace(/[^0-9.]/g, '') || null
    }

    // Try to grab original (strike-through) price
    const originalEl = document.querySelector('.a-text-price .a-offscreen') as HTMLElement
    if (originalEl) {
      originalPrice = parseFloat(originalEl.textContent?.replace(/[^0-9.]/g, '') || '0') || null
    }

    const title = titleElement?.textContent?.trim()

    if (price && title) {
      product = {
        name: title,
        price: parseFloat(price),
        originalPrice,
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
  const observer = new MutationObserver(() => {
    const product = detectProduct()
    if (product) {
      // Send product data to background script
      chrome.runtime.sendMessage(
        {
          type: 'PRODUCT_DETECTED',
          data: product,
        },
        (response) => {
          if (response?.success) {
            console.log('[OneCredit] Product sent to background')
          }
        }
      )
    }
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-a-price-whole', 'data-testid', 'data-cy', 'data-test'],
  })

  // Also check on page load
  const product = detectProduct()
  if (product) {
    chrome.runtime.sendMessage({
      type: 'PRODUCT_DETECTED',
      data: product,
    })
  }
}

// Start monitoring when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorPage)
} else {
  monitorPage()
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PRODUCT_DETECTED_UPDATE') {
    console.log('[OneCredit] Product update received:', request.data)
    // Trigger any UI updates needed
  }
})

console.log('[OneCredit] Content script loaded')
