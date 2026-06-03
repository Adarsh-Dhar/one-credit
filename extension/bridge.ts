/**
 * Extension-to-App Bridge
 * Handles all communication between the extension and the main app
 */

const APP_URL = process.env.REACT_APP_URL || 'http://localhost:3000';

export class OneCreditBridge {
  static async analyzeProduct(product: any, userId: string) {
    try {
      const response = await fetch(`${APP_URL}/api/extension/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-ID': chrome.runtime.id,
          'X-User-ID': userId,
        },
        body: JSON.stringify({ product, userId }),
      });

      if (!response.ok) throw new Error('Failed to analyze product');
      return await response.json();
    } catch (error) {
      console.error('[OneCredit Bridge] Analysis error:', error);
      throw error;
    }
  }

  static async recordCheckout(
    product: any,
    selectedCard: string,
    userId: string,
    savings: number
  ) {
    try {
      const response = await fetch(`${APP_URL}/api/extension/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Extension-ID': chrome.runtime.id,
          'X-User-ID': userId,
        },
        body: JSON.stringify({
          product,
          selectedCard,
          userId,
          savings,
        }),
      });

      if (!response.ok) throw new Error('Failed to record checkout');
      return await response.json();
    } catch (error) {
      console.error('[OneCredit Bridge] Checkout error:', error);
      throw error;
    }
  }

  static async checkStatus(userId: string) {
    try {
      const response = await fetch(`${APP_URL}/api/extension/status`, {
        method: 'GET',
        headers: {
          'X-Extension-ID': chrome.runtime.id,
          'X-User-ID': userId,
        },
      });

      if (!response.ok) throw new Error('Failed to check status');
      return await response.json();
    } catch (error) {
      console.error('[OneCredit Bridge] Status check error:', error);
      throw error;
    }
  }

  static async getUserCards(userId: string) {
    try {
      const response = await fetch(
        `${APP_URL}/api/fiat-cards?userId=${userId}`,
        {
          method: 'GET',
          headers: {
            'X-Extension-ID': chrome.runtime.id,
            'X-User-ID': userId,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch cards');
      return await response.json();
    } catch (error) {
      console.error('[OneCredit Bridge] Card fetch error:', error);
      throw error;
    }
  }

  /**
   * Listen for messages from content scripts
   */
  static setupMessageListener(callback: (message: any) => void) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      callback({ request, sender, sendResponse });
    });
  }

  /**
   * Send message to content script
   */
  static sendToContentScript(tabId: number, message: any) {
    return chrome.tabs.sendMessage(tabId, message);
  }
}

export default OneCreditBridge;
