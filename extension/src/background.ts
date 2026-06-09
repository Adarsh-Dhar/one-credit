// Background service worker for OneCredit extension
import type { Message, MessageResponse } from '@/types'
import { logger } from './logger'

// Constants
const RUM_CONFIG = {
  FLUSH_INTERVAL_MS: 20000,
  DEFAULT_API_URL: 'http://localhost:3000',
} as const;

// RUM event buffer for background worker
interface RUMEvent {
  eventType: string
  timestamp: number
  [key: string]: unknown
}

let rumEventBuffer: RUMEvent[] = []
let rumFlushTimer: ReturnType<typeof setInterval> | null = null

// Chrome storage helpers
function setUserSession(data: { email?: string; userId?: string; name?: string }, callback?: () => void) {
  chrome.storage.local.set({
    userEmail: data.email,
    userId: data.userId,
    userName: data.name,
  }, () => {
    logger.log('Stored user session in chrome.storage.local')
    callback?.()
  })
}

function getUserSession(callback: (result: { userEmail?: string; userId?: string; userName?: string }) => void) {
  chrome.storage.local.get(['userEmail', 'userId', 'userName'], callback)
}

// Message handler type
type MessageHandler = (
  request: Message,
  sendResponse: (response?: MessageResponse) => void
) => boolean | void

// Shared message handlers
const handleSetUserSession: MessageHandler = (request, sendResponse) => {
  logger.log('Received SET_USER_SESSION:', request.data)
  setUserSession(request.data || {}, () => sendResponse({ success: true }))
  return true
}

// Message handler registry
const messageHandlers: Record<string, MessageHandler> = {
  RUM_EVENTS: (request, sendResponse) => {
    const events = (request.data?.events as RUMEvent[]) || []
    rumEventBuffer.push(...events)
    sendResponse({ success: true })
    return true
  },

  PRODUCT_DETECTED: (request, sendResponse) => {
    logger.log('Product detected:', request.data)

    chrome.storage.local.set({
      lastDetectedProduct: request.data,
      lastProductTime: Date.now(),
    }, () => {
      logger.log('Product stored in storage')
    })

    chrome.runtime.sendMessage({
      type: 'PRODUCT_DETECTED_UPDATE',
      data: request.data,
    }).catch(() => {
      // Popup/sidepanel not open — that's fine
    })

    sendResponse({ success: true })
    return true
  },

  ANALYZE_PRODUCT: (request, sendResponse) => {
    rumEventBuffer.push({
      eventType: 'extension_fire',
      timestamp: Date.now()
    })
    sendResponse({ success: false, error: 'SidePanel should handle this directly' })
    return true
  },

  CARD_SELECTED: (request, sendResponse) => {
    const { cardKey } = request
    chrome.storage.local.set({ selectedCard: cardKey }, () => {
      sendResponse({ success: true })
    })
    return true
  },

  CONFIRM_PURCHASE: (request, sendResponse) => {
    const { cardId, product, paymentUrl } = request as any
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || RUM_CONFIG.DEFAULT_API_URL

    // If paymentUrl is provided, open it in a new tab
    if (paymentUrl) {
      chrome.tabs.create({ url: paymentUrl })
      sendResponse({ success: true })
      return true
    }

    // Original behavior for direct API call
    fetch(`${API_BASE}/api/extension/confirm-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardId, product }),
    })
      .then(response => {
        return response.json().then(data => ({ ok: response.ok, data }))
      })
      .then(({ ok, data }) => {
        if (!ok) {
          sendResponse({ success: false, error: data.error || 'Purchase confirmation failed' })
        } else {
          sendResponse({ success: true, transaction: data.transaction } as any)
        }
      })
      .catch(error => {
        logger.error('Confirm purchase error:', error)
        sendResponse({ success: false, error: 'Network error' })
      })

    return true
  },

  GET_STATUS: (request, sendResponse) => {
    chrome.storage.local.get(['lastDetectedProduct', 'selectedCard'], (result) => {
      sendResponse({
        success: true,
        data: {
          hasProduct: !!result.lastDetectedProduct,
          selectedCard: result.selectedCard,
        },
      })
    })
    return true
  },

  SET_USER_SESSION: handleSetUserSession,

  GET_USER_SESSION: (request, sendResponse) => {
    getUserSession((result) => sendResponse({ success: true, data: result }))
    return true
  },

  GET_SESSION: (request, sendResponse) => {
    getUserSession((result) => {
      sendResponse({
        success: true,
        data: {
          user: result.userId ? {
            name: result.userName || '',
            email: result.userEmail || '',
          } : null,
        },
      })
    })
    return true
  },
}

// Flush RUM events to API
function flushRUMEvents() {
  if (rumEventBuffer.length === 0) {
    return
  }

  const eventsToSend = [...rumEventBuffer]
  rumEventBuffer = []

  // Get userId from storage
  chrome.storage.local.get(['userId'], (storage) => {
    const userId = storage.userId as string | undefined

    if (!userId) {
      logger.log('No userId found, skipping RUM flush')
      return
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || RUM_CONFIG.DEFAULT_API_URL
    fetch(`${API_BASE}/api/rum/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        events: eventsToSend
      })
    })
      .then((response) => {
        if (!response.ok) {
          logger.error('RUM ingest failed:', response.status)
          rumEventBuffer.unshift(...eventsToSend)
        } else {
          logger.log('RUM events flushed:', eventsToSend.length)
        }
      })
      .catch((err) => {
        logger.error('RUM flush error:', err)
        rumEventBuffer.unshift(...eventsToSend)
      })
  })
}

// Start RUM flush timer
function startRUMFlushTimer() {
  if (rumFlushTimer) {
    return
  }
  rumFlushTimer = setInterval(flushRUMEvents, RUM_CONFIG.FLUSH_INTERVAL_MS)
}

// Stop RUM flush timer
function _stopRUMFlushTimer() {
  if (rumFlushTimer) {
    clearInterval(rumFlushTimer)
    rumFlushTimer = null
  }
  flushRUMEvents() // Flush remaining events on stop
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: MessageResponse) => void) => {
    logger.log('Received message:', request.type, 'from', sender.url || 'internal')

    const handler = messageHandlers[request.type]
    if (handler) {
      return handler(request, sendResponse)
    }

    sendResponse({ success: false, error: 'Unknown message type' })
  }
)

// External message handler registry
const externalMessageHandlers: Record<string, MessageHandler> = {
  SET_USER_SESSION: handleSetUserSession,
}

// Listen for messages from external web app (localhost:3000, onecredit.app)
chrome.runtime.onMessageExternal.addListener(
  (request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: MessageResponse) => void) => {
    logger.log('Received external message:', request.type, 'from', sender.url)

    const handler = externalMessageHandlers[request.type]
    if (handler) {
      return handler(request, sendResponse)
    }

    sendResponse({ success: false, error: 'Unknown external message type' })
  }
)

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    logger.log('Extension installed')
    // Open options page on first install
    chrome.runtime.openOptionsPage()
    // Start RUM flush timer
    startRUMFlushTimer()
  } else if (details.reason === 'update') {
    logger.log('Extension updated')
    // Clear cached product data to force re-detection with new conversion logic
    chrome.storage.local.remove(['lastDetectedProduct', 'lastProductTime'], () => {
      logger.log('Cleared cached product data')
    })
    // Start RUM flush timer
    startRUMFlushTimer()
  }
})

// Start RUM flush timer on startup (for when extension is already installed)
startRUMFlushTimer()
