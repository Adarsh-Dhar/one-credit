// Content script for OneCredit extension
import type { Product } from '@/types'

// RUM tracker initialization removed to prevent code splitting issues

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

// ─── Element Picker ────────────────────────────────────────────────────────────
// Activated by the popup when the user is on an unknown site.
// Two-step: first click captures the product name, second click captures the price.

let pickerActive = false
let pickerStep: 'name' | 'price' = 'name'
let pickedName = ''
let highlightOverlay: HTMLDivElement | null = null

function createOverlay() {
  const el = document.createElement('div')
  el.style.cssText = `
    position: fixed;
    pointer-events: none;
    border: 2px solid #8b5cf6;
    background: rgba(139,92,246,0.12);
    border-radius: 4px;
    z-index: 2147483647;
    transition: all 60ms ease;
  `
  document.body.appendChild(el)
  return el
}

function positionOverlay(el: HTMLDivElement, target: Element) {
  const r = target.getBoundingClientRect()
  el.style.top    = `${r.top    + window.scrollY}px` 
  el.style.left   = `${r.left   + window.scrollX}px` 
  el.style.width  = `${r.width}px` 
  el.style.height = `${r.height}px` 
}

function createToast(msg: string) {
  const old = document.getElementById('oc-picker-toast')
  if (old) old.remove()
  const t = document.createElement('div')
  t.id = 'oc-picker-toast'
  t.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #1e1b4b;
    color: #e9d5ff;
    font-family: system-ui, sans-serif;
    font-size: 13px;
    padding: 10px 18px;
    border-radius: 8px;
    border: 1px solid #7c3aed;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  `
  t.textContent = msg
  document.body.appendChild(t)
  return t
}

function stopPicker() {
  pickerActive = false
  document.body.style.cursor = ''
  document.removeEventListener('mouseover', onMouseOver, true)
  document.removeEventListener('click',     onPickerClick, true)
  highlightOverlay?.remove()
  highlightOverlay = null
  document.getElementById('oc-picker-toast')?.remove()
}

function onMouseOver(e: MouseEvent) {
  if (!pickerActive || !highlightOverlay) return
  positionOverlay(highlightOverlay, e.target as Element)
}

function onPickerClick(e: MouseEvent) {
  if (!pickerActive) return
  e.preventDefault()
  e.stopPropagation()

  const text = (e.target as Element).textContent?.trim() || ''

  if (pickerStep === 'name') {
    pickedName = text
    pickerStep = 'price'
    createToast('✅ Name captured! Now click the price.')
  } else {
    // Extract numeric price from whatever was clicked
    const raw = text.replace(/[^0-9.]/g, '')
    const price = parseFloat(raw)

    stopPicker()

    if (!pickedName || isNaN(price) || price <= 0) {
      chrome.runtime.sendMessage({
        type: 'PICKER_RESULT',
        data: { error: 'Could not read name or price' },
      })
      return
    }

    const product: Product = {
      name:        pickedName,
      price,
      url:         window.location.href,
      category:    'general',
      source:      'generic',
      detectedAt:  new Date().toISOString(),
    }

    // Store exactly like the auto-detected flow
    chrome.runtime.sendMessage({ type: 'PRODUCT_DETECTED', data: product })
    chrome.runtime.sendMessage({ type: 'PICKER_RESULT', data: { product } })
  }
}

// Listen for START_PICKER from the popup
chrome.runtime.onMessage.addListener((request) => {
  if (request.type !== 'START_PICKER') return
  if (pickerActive) return   // already running

  pickerActive = true
  pickerStep   = 'name'
  pickedName   = ''

  highlightOverlay = createOverlay()
  document.body.style.cursor = 'crosshair'
  document.addEventListener('mouseover', onMouseOver, true)
  document.addEventListener('click',     onPickerClick, true)
  createToast('👆 Click the product name')
})

if (process.env.NODE_ENV === 'development') {
  console.log('[OneCredit] Content script loaded')
}
