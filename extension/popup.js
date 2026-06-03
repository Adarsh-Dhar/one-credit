/**
 * Popup Script
 * Handles user interactions from the extension popup
 */

const statusEl = document.getElementById('status');
const openPortalBtn = document.getElementById('openPortal');
const settingsBtn = document.getElementById('settings');

// Check for product detection
chrome.storage.local.get(['lastDetectedProduct'], (result) => {
  if (result.lastDetectedProduct) {
    statusEl.textContent = `Product detected: ${result.lastDetectedProduct.name}`;
    statusEl.classList.add('active');
    openPortalBtn.disabled = false;
  } else {
    statusEl.textContent = 'No product detected. Visit Amazon, Walmart, Best Buy, or Target.';
  }
});

// Open side panel
openPortalBtn.addEventListener('click', () => {
  chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
});

// Settings
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
