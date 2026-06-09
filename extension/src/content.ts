// Content script for OneCredit extension
import { logger } from './logger'
import { CONTENT_SCRIPT_CONSTANTS } from './content/constants'
import { detectProduct } from './content/product-detectors'
import { startPicker as startElementPicker } from './content/element-picker'

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
    startElementPicker()
  }
})

logger.log('Content script loaded')
