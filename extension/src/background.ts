// Background service worker for OneCredit extension
import type { Message, MessageResponse } from '@/types'

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: MessageResponse) => void) => {
    console.log('[OneCredit] Received message:', request.type, 'from', sender.url || 'internal')

    switch (request.type) {
      case 'PRODUCT_DETECTED': {
        // Handle product detection from content script
        console.log('[OneCredit] Product detected:', request.data)

        // Store the product data
        chrome.storage.local.set({
          lastDetectedProduct: request.data,
          lastProductTime: Date.now(),
        }, () => {
          console.log('[OneCredit] Product stored in storage')
        })

        // Notify all tabs about product detection
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (tab.id) {
              chrome.tabs.sendMessage(
                tab.id,
                {
                  type: 'PRODUCT_DETECTED_UPDATE',
                  data: request.data,
                },
                () => {
                  // Ignore errors for tabs that don't have content script
                  if (chrome.runtime.lastError) {
                    // Tab doesn't have content script or is closed
                  }
                }
              )
            }
          })
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
        console.log('[OneCredit] Received SET_USER_SESSION:', request.data)
        chrome.storage.local.set({
          userEmail: request.data?.email,
          userId: request.data?.userId,
          userName: request.data?.name,
        }, () => {
          console.log('[OneCredit] Stored user session in chrome.storage.local')
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
    console.log('[OneCredit] Received external message:', request.type, 'from', sender.url)

    switch (request.type) {
      case 'SET_USER_SESSION': {
        console.log('[OneCredit] Received SET_USER_SESSION from external:', request.data)
        chrome.storage.local.set({
          userEmail: request.data?.email,
          userId: request.data?.userId,
          userName: request.data?.name,
        }, () => {
          console.log('[OneCredit] Stored user session in chrome.storage.local')
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
  } else if (details.reason === 'update') {
    console.log('[OneCredit] Extension updated')
  }
})
