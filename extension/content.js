/**
 * Content Script
 * Runs on shopping sites to detect products and inject the portal
 */

// Product detection logic
function detectProduct() {
  let product = null;
  const site = detectSite();

  if (site === 'amazon') {
    const title = document.querySelector('h1 span')?.textContent || 'Product';
    const priceStr = document.querySelector('[data-a-price-whole]')?.textContent || '0';
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    product = {
      name: title,
      price: price || 0,
      category: 'electronics',
      site: 'amazon',
      url: window.location.href,
      imageUrl: document.querySelector('img.a-dynamic-image')?.src || null
    };
  } else if (site === 'walmart') {
    const title = document.querySelector('[data-testid="title"]')?.textContent || 'Product';
    const priceStr = document.querySelector('[data-testid="product-price-line"]')?.textContent || '0';
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    product = {
      name: title,
      price: price || 0,
      category: 'general',
      site: 'walmart',
      url: window.location.href,
      imageUrl: null
    };
  } else if (site === 'bestbuy') {
    const title = document.querySelector('h1')?.textContent || 'Product';
    const priceStr = document.querySelector('[aria-hidden="true"]')?.textContent || '0';
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    product = {
      name: title,
      price: price || 0,
      category: 'electronics',
      site: 'bestbuy',
      url: window.location.href,
      imageUrl: null
    };
  } else if (site === 'target') {
    const title = document.querySelector('[data-testid="product-title"]')?.textContent || 'Product';
    const priceStr = document.querySelector('[data-testid="product-price"]')?.textContent || '0';
    const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
    product = {
      name: title,
      price: price || 0,
      category: 'general',
      site: 'target',
      url: window.location.href,
      imageUrl: null
    };
  }

  return product;
}

function detectSite() {
  const hostname = window.location.hostname;
  if (hostname.includes('amazon')) return 'amazon';
  if (hostname.includes('walmart')) return 'walmart';
  if (hostname.includes('bestbuy')) return 'bestbuy';
  if (hostname.includes('target')) return 'target';
  return 'unknown';
}

// Create iframe for portal injection
function createPortalIframe() {
  const iframe = document.createElement('iframe');
  iframe.id = 'onecredit-portal-iframe';
  iframe.src = chrome.runtime.getURL('sidepanel.html');
  iframe.style.cssText = `
    position: fixed;
    right: 0;
    top: 0;
    width: 100%;
    height: 100%;
    border: none;
    z-index: 999999;
    background: transparent;
  `;
  document.body.appendChild(iframe);
  return iframe;
}

// Detect product on page load
window.addEventListener('load', () => {
  const product = detectProduct();
  if (product && product.price > 0) {
    console.log('[OneCredit] Product detected:', product);
    chrome.runtime.sendMessage({ type: 'PRODUCT_DETECTED', data: product });
  }
});

// Fallback detection after timeout
setTimeout(() => {
  const product = detectProduct();
  if (product && product.price > 0) {
    console.log('[OneCredit] Product detected (fallback):', product);
    chrome.runtime.sendMessage({ type: 'PRODUCT_DETECTED', data: product });
  }
}, 2000);
