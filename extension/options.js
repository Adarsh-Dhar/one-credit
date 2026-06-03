/**
 * Options Page Script
 * Handles settings management for the OneCredit extension
 */

const DEFAULT_SETTINGS = {
  accountEmail: '',
  enabledSites: {
    amazon: true,
    walmart: true,
    bestbuy: true,
    target: true,
  },
  preferences: {
    autoAnalysis: false,
    notifications: true,
    showTips: true,
    cardView: 'detailed',
  },
  privacy: {
    analytics: true,
    history: true,
  },
};

// Load settings on page load
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
});

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    // Account
    if (!settings.accountEmail) {
      // Try to load from local (set by web app session bridge)
      chrome.storage.local.get(['userEmail'], (local) => {
        if (local.userEmail) {
          document.getElementById('accountEmail').value = local.userEmail
        }
      })
    } else {
      document.getElementById('accountEmail').value = settings.accountEmail
    }

    // Sites
    Object.keys(settings.enabledSites).forEach((site) => {
      const checkbox = document.getElementById(`site_${site}`);
      if (checkbox) {
        checkbox.checked = settings.enabledSites[site];
      }
    });

    // Preferences
    document.getElementById('pref_autoAnalysis').checked =
      settings.preferences.autoAnalysis;
    document.getElementById('pref_notifications').checked =
      settings.preferences.notifications;
    document.getElementById('pref_showTips').checked = settings.preferences.showTips;
    document.getElementById('pref_cardView').value = settings.preferences.cardView;

    // Privacy
    document.getElementById('privacy_analytics').checked = settings.privacy.analytics;
    document.getElementById('privacy_history').checked = settings.privacy.history;
  });
}

// Save settings
function saveSettings() {
  const settings = {
    accountEmail: document.getElementById('accountEmail').value,
    enabledSites: {
      amazon: document.getElementById('site_amazon').checked,
      walmart: document.getElementById('site_walmart').checked,
      bestbuy: document.getElementById('site_bestbuy').checked,
      target: document.getElementById('site_target').checked,
    },
    preferences: {
      autoAnalysis: document.getElementById('pref_autoAnalysis').checked,
      notifications: document.getElementById('pref_notifications').checked,
      showTips: document.getElementById('pref_showTips').checked,
      cardView: document.getElementById('pref_cardView').value,
    },
    privacy: {
      analytics: document.getElementById('privacy_analytics').checked,
      history: document.getElementById('privacy_history').checked,
    },
  };

  chrome.storage.sync.set(settings, () => {
    // Also mirror email to local storage so the popup can read it immediately
    chrome.storage.local.set({
      userEmail: settings.accountEmail,
      userName: '',
    }, () => {
      showStatus('Settings saved successfully!', 'success');
    })
  });
}

// Reset to defaults
function resetSettings() {
  if (confirm('Are you sure? This will reset all settings to their default values.')) {
    chrome.storage.sync.clear(() => {
      loadSettings();
      showStatus('Settings reset to defaults', 'success');
    });
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}
