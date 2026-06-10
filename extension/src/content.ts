// Content script for OneCredit extension
// Prevent multiple injections
if ((window as any).__ONE_CREDIT_CONTENT_LOADED__) {
  console.log('[OneCredit] Content script already loaded, skipping')
} else {
  (window as any).__ONE_CREDIT_CONTENT_LOADED__ = true

  // Inline logger to avoid module issues in content script
  const EXTENSION_LOGGER_PREFIX = '[OneCredit]';
class ExtensionLogger {
  private isDevelopment: boolean;
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }
  private shouldLog(level: string): boolean {
    if (level === 'error' || level === 'warn') {
      return true;
    }
    return this.isDevelopment;
  }
  log(...args: unknown[]): void {
    if (this.shouldLog('log')) {
      console.log(EXTENSION_LOGGER_PREFIX, ...args);
    }
  }
  error(...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(EXTENSION_LOGGER_PREFIX, ...args);
    }
  }
  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(EXTENSION_LOGGER_PREFIX, ...args);
    }
  }
  info(...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(EXTENSION_LOGGER_PREFIX, ...args);
    }
  }
  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(EXTENSION_LOGGER_PREFIX, ...args);
    }
  }
}
const logger = new ExtensionLogger();

// Inline constants to avoid module issues
const CONTENT_SCRIPT_CONSTANTS = {
  INR_TO_USD_RATE: 90,
  INITIAL_DETECTION_DELAY_MS: 1000,
  SECONDARY_DETECTION_DELAY_MS: 3000,
  MUTATION_DEBOUNCE_MS: 500,
  PRICE_CONVERSION_DIVISOR: 90,
  MAX_Z_INDEX: 2147483647,
  OVERLAY_BORDER_WIDTH: 2,
  OVERLAY_BORDER_COLOR: '#8b5cf6',
  OVERLAY_BACKGROUND_COLOR: 'rgba(139,92,246,0.12)',
  OVERLAY_BORDER_RADIUS: 4,
  OVERLAY_TRANSITION_MS: 60,
  TOAST_BOTTOM_OFFSET: 24,
  TOAST_PADDING: '10px 18px',
  TOAST_BORDER_RADIUS: 8,
  TOAST_BORDER_COLOR: '#7c3aed',
  TOAST_BACKGROUND_COLOR: '#1e1b4b',
  TOAST_TEXT_COLOR: '#e9d5ff',
  TOAST_FONT_SIZE: 13,
  TOAST_BOX_SHADOW: '0 4px 20px rgba(0,0,0,0.4)',
  TOAST_MAX_WIDTH: '50%',
  PRICE_REGEX: /[^0-9.]/g,
  MIN_VALID_PRICE: 0,
} as const;

// Inline product detection functions to avoid module issues
function detectAmazonProduct(url: string): any {
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
    }
  }
  return null
}

function detectWalmartProduct(url: string): any {
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
    }
  }
  return null
}

function detectBestBuyProduct(url: string): any {
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
    }
  }
  return null
}

function detectTargetProduct(url: string): any {
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
    }
  }
  return null
}

function detectProduct(): any {
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

// Inline element picker to avoid module issues
let pickerActive = false
let pickerStep: 'name' | 'price' = 'name'
let pickedName = ''
let highlightOverlay: HTMLDivElement | null = null

function createOverlay(): HTMLDivElement {
  const el = document.createElement('div')
  el.style.cssText = `
    position: fixed;
    pointer-events: none;
    border: ${CONTENT_SCRIPT_CONSTANTS.OVERLAY_BORDER_WIDTH}px solid ${CONTENT_SCRIPT_CONSTANTS.OVERLAY_BORDER_COLOR};
    background: ${CONTENT_SCRIPT_CONSTANTS.OVERLAY_BACKGROUND_COLOR};
    border-radius: ${CONTENT_SCRIPT_CONSTANTS.OVERLAY_BORDER_RADIUS}px;
    z-index: ${CONTENT_SCRIPT_CONSTANTS.MAX_Z_INDEX};
    transition: all ${CONTENT_SCRIPT_CONSTANTS.OVERLAY_TRANSITION_MS}ms ease;
  `
  document.body.appendChild(el)
  return el
}

function positionOverlay(el: HTMLDivElement, target: Element): void {
  const r = target.getBoundingClientRect()
  el.style.top = `${r.top + window.scrollY}px`
  el.style.left = `${r.left + window.scrollX}px`
  el.style.width = `${r.width}px`
  el.style.height = `${r.height}px`
}

function createToast(msg: string): HTMLDivElement {
  const old = document.getElementById('oc-picker-toast')
  if (old) {
    old.remove()
  }
  const t = document.createElement('div')
  t.id = 'oc-picker-toast'
  t.style.cssText = `
    position: fixed;
    bottom: ${CONTENT_SCRIPT_CONSTANTS.TOAST_BOTTOM_OFFSET}px;
    left: 50%;
    transform: translateX(-50%);
    background: ${CONTENT_SCRIPT_CONSTANTS.TOAST_BACKGROUND_COLOR};
    color: ${CONTENT_SCRIPT_CONSTANTS.TOAST_TEXT_COLOR};
    font-family: system-ui, sans-serif;
    font-size: ${CONTENT_SCRIPT_CONSTANTS.TOAST_FONT_SIZE}px;
    padding: ${CONTENT_SCRIPT_CONSTANTS.TOAST_PADDING};
    border-radius: ${CONTENT_SCRIPT_CONSTANTS.TOAST_BORDER_RADIUS}px;
    border: 1px solid ${CONTENT_SCRIPT_CONSTANTS.TOAST_BORDER_COLOR};
    z-index: ${CONTENT_SCRIPT_CONSTANTS.MAX_Z_INDEX};
    box-shadow: ${CONTENT_SCRIPT_CONSTANTS.TOAST_BOX_SHADOW};
  `
  t.textContent = msg
  document.body.appendChild(t)
  return t
}

function stopPicker(): void {
  pickerActive = false
  document.body.style.cursor = ''
  document.removeEventListener('mouseover', onMouseOver, true)
  document.removeEventListener('click', onPickerClick, true)
  highlightOverlay?.remove()
  highlightOverlay = null
  document.getElementById('oc-picker-toast')?.remove()
}

function onMouseOver(e: MouseEvent): void {
  if (!pickerActive || !highlightOverlay) {
    return
  }
  positionOverlay(highlightOverlay, e.target as Element)
}

function onPickerClick(e: MouseEvent): void {
  if (!pickerActive) {
    return
  }
  e.preventDefault()
  e.stopPropagation()

  const text = (e.target as Element).textContent?.trim() || ''

  if (pickerStep === 'name') {
    pickedName = text
    pickerStep = 'price'
    createToast('✅ Name captured! Now click the price.')
  } else {
    const raw = text.replace(CONTENT_SCRIPT_CONSTANTS.PRICE_REGEX, '')
    const price = parseFloat(raw)

    stopPicker()

    if (!pickedName || isNaN(price) || price <= CONTENT_SCRIPT_CONSTANTS.MIN_VALID_PRICE) {
      chrome.runtime.sendMessage({
        type: 'PICKER_RESULT',
        data: { error: 'Could not read name or price' },
      })
      return
    }

    const product = {
      name: pickedName,
      price,
      url: window.location.href,
      category: 'general',
      source: 'generic',
      detectedAt: new Date().toISOString(),
    }

    chrome.runtime.sendMessage({ type: 'PRODUCT_DETECTED', data: product })
    chrome.runtime.sendMessage({ type: 'PICKER_RESULT', data: { product } })
  }
}

function startPicker(): void {
  if (pickerActive) {
    return
  }

  pickerActive = true
  pickerStep = 'name'
  pickedName = ''

  highlightOverlay = createOverlay()
  document.body.style.cursor = 'crosshair'
  document.addEventListener('mouseover', onMouseOver, true)
  document.addEventListener('click', onPickerClick, true)
  createToast('👆 Click the product name')
}

// Immediate log to verify content script is loaded
logger.log('Content script loaded - URL:', window.location.href)

// Global error handler to catch extension context invalidation errors
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('Extension context')) {
    logger.log('Extension context error caught:', event.message)
    event.preventDefault()
    event.stopPropagation()
  }
})

// Monitor page for product information
function monitorPage() {
  logger.log('Starting page monitoring')

  let lastSentUrl = ''
  let lastSentPrice = 0
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function tryDetectAndSend() {
    const product = detectProduct()
    if (!product) {
      return
    }

    if (product.url === lastSentUrl && product.price === lastSentPrice) {
      return
    }
    lastSentUrl = product.url
    lastSentPrice = product.price

    logger.log('Product detected:', product.name, product.price)

    try {
      chrome.runtime.sendMessage({ type: 'PRODUCT_DETECTED', data: product }, (response) => {
        if (chrome.runtime.lastError) {
          logger.log('sendMessage error:', chrome.runtime.lastError.message)
        } else if (response?.success) {
          logger.log('Product stored successfully')
        }
      })
    } catch (e) {
      logger.log('sendMessage threw:', e)
    }
  }

  const observer = new MutationObserver(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(tryDetectAndSend, CONTENT_SCRIPT_CONSTANTS.MUTATION_DEBOUNCE_MS)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  tryDetectAndSend()
  setTimeout(tryDetectAndSend, CONTENT_SCRIPT_CONSTANTS.INITIAL_DETECTION_DELAY_MS)
  setTimeout(tryDetectAndSend, CONTENT_SCRIPT_CONSTANTS.SECONDARY_DETECTION_DELAY_MS)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorPage)
} else {
  monitorPage()
}

chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
  if (request.type === 'PRODUCT_DETECTED_UPDATE') {
    logger.log('Product update received:', request.data)
  }
})

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'START_PICKER') {
    startPicker()
  }
})

logger.log('Content script loaded')

}
