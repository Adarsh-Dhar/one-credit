// Background service worker for OneCredit extension
import type { Message, MessageResponse } from '@/types'

// RUM event buffer for background worker
let rumEventBuffer: any[] = []
const RUM_FLUSH_INTERVAL = 20000 // 20 seconds
let rumFlushTimer: ReturnType<typeof setInterval> | null = null

// Flush RUM events to API
function flushRUMEvents() {
  if (rumEventBuffer.length === 0) return

  const eventsToSend = [...rumEventBuffer]
  rumEventBuffer = []

  // Get userId from storage
  chrome.storage.local.get(['userId'], (storage) => {
    const userId = storage.userId as string | undefined

    if (!userId) {
      console.log('[OneCredit] No userId found, skipping RUM flush')
      return
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
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
          console.error('[OneCredit] RUM ingest failed:', response.status)
          rumEventBuffer.unshift(...eventsToSend)
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[OneCredit] RUM events flushed:', eventsToSend.length)
          }
        }
      })
      .catch((err) => {
        console.error('[OneCredit] RUM flush error:', err)
        rumEventBuffer.unshift(...eventsToSend)
      })
  })
}

// Start RUM flush timer
function startRUMFlushTimer() {
  if (rumFlushTimer) return
  rumFlushTimer = setInterval(flushRUMEvents, RUM_FLUSH_INTERVAL)
}

// Stop RUM flush timer
function stopRUMFlushTimer() {
  if (rumFlushTimer) {
    clearInterval(rumFlushTimer)
    rumFlushTimer = null
  }
  flushRUMEvents() // Flush remaining events on stop
}

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: MessageResponse) => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[OneCredit] Received message:', request.type, 'from', sender.url || 'internal')
    }

    switch (request.type) {
      case 'RUM_EVENTS': {
        // Buffer RUM events from content script
        rumEventBuffer.push(...(request.data?.events || []))
        sendResponse({ success: true })
        return true
      }

      case 'PRODUCT_DETECTED': {
        if (process.env.NODE_ENV === 'development') {
          console.log('[OneCredit] Product detected:', request.data)
        }

        chrome.storage.local.set({
          lastDetectedProduct: request.data,
          lastProductTime: Date.now(),
        }, () => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[OneCredit] Product stored in storage')
          }
        })

        // Broadcast to extension pages (popup, sidepanel) via runtime — NOT tabs
        chrome.runtime.sendMessage({
          type: 'PRODUCT_DETECTED_UPDATE',
          data: request.data,
        }).catch(() => {
          // Popup/sidepanel not open — that's fine, they'll read from storage on open
        })

        sendResponse({ success: true })
        return true
      }

      case 'ANALYZE_PRODUCT': {
        // SidePanel handles this directly to avoid CSP issues
        sendResponse({ success: false, error: 'SidePanel should handle this directly' })
        return true
      }

      case 'CARD_SELECTED': {
        // Handle card selection - store for later processing
        const { cardKey } = request
        chrome.storage.local.set({ selectedCard: cardKey }, () => {
          sendResponse({ success: true })
        })
        return true
      }

      case 'GET_STATUS': {
        // Get extension status
        chrome.storage.local.get(['lastDetectedProduct', 'selectedCard'], (result) => {
          sendResponse({
            success: true,
            status: {
              hasProduct: !!result.lastDetectedProduct,
              selectedCard: result.selectedCard,
            },
          })
        })
        return true
      }

      case 'SET_USER_SESSION': {
        if (process.env.NODE_ENV === 'development') {
          console.log('[OneCredit] Received SET_USER_SESSION:', request.data)
        }
        chrome.storage.local.set({
          userEmail: request.data?.email,
          userId: request.data?.userId,
          userName: request.data?.name,
        }, () => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[OneCredit] Stored user session in chrome.storage.local')
          }
          sendResponse({ success: true })
        })
        return true
      }

      case 'GET_USER_SESSION': {
        chrome.storage.local.get(['userEmail', 'userId', 'userName'], (result) => {
          sendResponse({ success: true, data: result })
        })
        return true
      }

      case 'GET_SESSION': {
        // Return session from storage instead of fetching (avoid CSP)
        chrome.storage.local.get(['userEmail', 'userId', 'userName'], (result) => {
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
      }

      default:
        sendResponse({ success: false, error: 'Unknown message type' })
    }
  }
)

// Listen for messages from external web app (localhost:3000, onecredit.app)
chrome.runtime.onMessageExternal.addListener(
  (request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: MessageResponse) => void) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[OneCredit] Received external message:', request.type, 'from', sender.url)
    }

    switch (request.type) {
      case 'SET_USER_SESSION': {
        if (process.env.NODE_ENV === 'development') {
          console.log('[OneCredit] Received SET_USER_SESSION from external:', request.data)
        }
        chrome.storage.local.set({
          userEmail: request.data?.email,
          userId: request.data?.userId,
          userName: request.data?.name,
        }, () => {
          if (process.env.NODE_ENV === 'development') {
            console.log('[OneCredit] Stored user session in chrome.storage.local')
          }
          sendResponse({ success: true })
        })
        return true
      }

      default:
        sendResponse({ success: false, error: 'Unknown external message type' })
    }
  }
)

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[OneCredit] Extension installed')
    // Open options page on first install
    chrome.runtime.openOptionsPage()
    // Start RUM flush timer
    startRUMFlushTimer()
  } else if (details.reason === 'update') {
    console.log('[OneCredit] Extension updated')
    // Clear cached product data to force re-detection with new conversion logic
    chrome.storage.local.remove(['lastDetectedProduct', 'lastProductTime'], () => {
      console.log('[OneCredit] Cleared cached product data')
    })
    // Start RUM flush timer
    startRUMFlushTimer()
  }
})

// Start RUM flush timer on startup (for when extension is already installed)
startRUMFlushTimer()
