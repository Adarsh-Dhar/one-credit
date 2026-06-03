/**
 * Background Service Worker
 * Handles extension lifecycle and messaging
 */

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PRODUCT_DETECTED') {
    // Forward product data to main app
    chrome.storage.local.set({
      lastDetectedProduct: request.data,
      detectionTime: new Date().getTime()
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'GET_USER_CARDS') {
    // Fetch user's cards from main app
    fetch(request.appUrl + '/api/fiat-cards?userId=' + request.userId)
      .then(r => r.json())
      .then(data => sendResponse({ cards: data.cards }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (request.type === 'CALCULATE_OP_COST') {
    // Fetch OP cost calculation from main app
    fetch(request.appUrl + '/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.data)
    })
      .then(r => r.json())
      .then(data => sendResponse({ result: data }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }
});

// Listen for sidebar open/close
chrome.runtime.onInstalled.addListener(() => {
  console.log('[OneCredit] Extension installed');
});
