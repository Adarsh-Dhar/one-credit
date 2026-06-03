// Content script for OneCredit extension
import type { Product } from '@/types'

// Detect product information from the current page
function detectProduct(): Product | null {
  const url = window.location.href
  let product: Partial<Product> | null = null

  // Amazon detection
  if (url.includes('amazon.com')) {
    const priceElement = document.querySelector('[data-a-price-whole]')
    const titleElement = document.querySelector('h1 span')
    const price = priceElement?.textContent?.replace(/[^0-9.]/g, '')
    const title = titleElement?.textContent

    if (price && title) {
      product = {
        name: title,
        price: parseFloat(price),
        url: url,
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
