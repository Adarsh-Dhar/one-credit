// Background service worker for OneCredit extension
import type { Message, MessageResponse } from '@/types'

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (request: Message, sender: chrome.runtime.MessageSender, sendResponse: (response?: MessageResponse) => void) => {
    console.log('[OneCredit] Received message:', request.type, 'from', sender.url)

    switch (request.type) {
      case 'PRODUCT_DETECTED': {
        // Handle product detection from content script
        console.log('[OneCredit] Product detected:', request.data)

        // Store the product data
        chrome.storage.local.set({
          lastProduct: request.data,
          lastProductTime: Date.now(),
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
                }
              )
            }
          })
        })

        sendResponse({ success: true })
        break
      }

      case 'ANALYZE_PRODUCT': {
        // Handle analysis request
        const { product, userId, apiKey } = request

        // Call main app API
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/extension/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ product, userId }),
        })
          .then((res) => res.json())
          .then((data) => {
            sendResponse({ success: true, data })
          })
          .catch((error) => {
            console.error('[OneCredit] Analysis error:', error)
            sendResponse({ success: false, error: error.message })
          })

        // Return true to indicate we'll send response asynchronously
        return true
      }

      case 'CARD_SELECTED': {
        // Handle card selection
        const { cardKey } = request

        // Send checkout notification to main app
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/extension/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ cardKey }),
        })
          .then((res) => res.json())
          .then((data) => {
            sendResponse({ success: true, data })
          })
          .catch((error) => {
            console.error('[OneCredit] Checkout error:', error)
            sendResponse({ success: false, error: error.message })
          })

        return true
      }

      case 'GET_STATUS': {
        // Get extension status
        chrome.storage.local.get(['lastProduct', 'selectedCard'], (result) => {
          sendResponse({
            success: true,
            status: {
              hasProduct: !!result.lastProduct,
              selectedCard: result.selectedCard,
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
