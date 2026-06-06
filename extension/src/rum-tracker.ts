// RUM Tracker for OneCredit extension
// Collects behavioral signals from the page and flushes to background worker

interface RUMEvent {
  eventType: string
  timestamp: number
  section?: string
  data?: Record<string, unknown>
}

// Local event buffer
let eventBuffer: RUMEvent[] = []
const BUFFER_FLUSH_INTERVAL = 15000 // 15 seconds
const BUFFER_MAX_SIZE = 50

// Flush buffer to background worker
function flushBuffer() {
  if (eventBuffer.length === 0) return

  const eventsToSend = [...eventBuffer]
  eventBuffer = []

  chrome.runtime.sendMessage(
    { type: 'RUM_EVENTS', events: eventsToSend },
    (response) => {
      if (chrome.runtime.lastError) {
        console.error('[RUM Tracker] Failed to send events to background:', chrome.runtime.lastError)
        // Re-add failed events to buffer
        eventBuffer.unshift(...eventsToSend)
      }
    }
  )
}

// Add event to buffer
function trackEvent(event: RUMEvent) {
  eventBuffer.push(event)
  
  if (eventBuffer.length >= BUFFER_MAX_SIZE) {
    flushBuffer()
  }
}

// Start flush timer
let flushTimer: ReturnType<typeof setInterval> | null = null

export function startRUMTracker() {
  if (flushTimer) return // Already started

  flushTimer = setInterval(flushBuffer, BUFFER_FLUSH_INTERVAL)

  // Initialize all collectors
  initRageClickTracker()
  initTabClickTracker()
  initDwellTimeTracker()
  initScrollDepthTracker()
  initBackNavigationTracker()
  initCardInteractionTracker()
  initTransferPartnerClickTracker()
  initWalletButtonTracker()
  initCategorySelectionTracker()
  initCardRecommendationTracker()
  initAnnualFeeTracker()

  // Flush on page hide
  window.addEventListener('pagehide', flushBuffer)
}

export function stopRUMTracker() {
  if (flushTimer) {
    clearInterval(flushTimer)
    flushTimer = null
  }
  flushBuffer()
  window.removeEventListener('pagehide', flushBuffer)
}

// ─── Collector 1: Rage click detector ─────────────────────────────────────────────
function initRageClickTracker() {
  let clickCount = 0
  let lastClickTime = 0
  let lastClickTarget: Element | null = null

  document.addEventListener('click', (e) => {
    const now = Date.now()
    const target = e.target as Element

    // If same element clicked rapidly (within 500ms) 3+ times, it's a rage click
    if (
      lastClickTarget === target &&
      now - lastClickTime < 500
    ) {
      clickCount++
      if (clickCount >= 3) {
        trackEvent({
          eventType: 'rage_click',
          timestamp: now,
          data: { element: target.tagName, selector: getSelector(target) }
        })
        clickCount = 0
      }
    } else {
      clickCount = 1
      lastClickTarget = target
    }
    lastClickTime = now
  })
}

// ─── Collector 2: Tab click tracker ───────────────────────────────────────────────
function initTabClickTracker() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element
    const tab = target.closest('[data-tab]')

    if (tab) {
      const tabName = tab.getAttribute('data-tab')
      trackEvent({
        eventType: 'tab_click',
        timestamp: Date.now(),
        data: { tab: tabName }
      })
    }
  })
}

// ─── Collector 3: Dwell time tracker (IntersectionObserver on data-section) ───────
function initDwellTimeTracker() {
  const sectionDwellTimes = new Map<string, number>()
  const sectionEnterTimes = new Map<string, number>()

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const section = entry.target.getAttribute('data-section')
        if (!section) return

        if (entry.isIntersecting) {
          // Section entered viewport
          sectionEnterTimes.set(section, Date.now())
        } else {
          // Section left viewport
          const enterTime = sectionEnterTimes.get(section)
          if (enterTime) {
            const dwellTime = Date.now() - enterTime
            const currentTotal = sectionDwellTimes.get(section) || 0
            sectionDwellTimes.set(section, currentTotal + dwellTime)
            sectionEnterTimes.delete(section)

            // Track dwell event
            trackEvent({
              eventType: 'dwell_time',
              timestamp: Date.now(),
              section,
              data: { duration: currentTotal + dwellTime }
            })
          }
        }
      })
    },
    { threshold: 0.5 } // Trigger when 50% of element is visible
  )

  // Observe all elements with data-section attribute
  document.querySelectorAll('[data-section]').forEach((el) => observer.observe(el))

  // Also observe dynamically added elements
  const mutationObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element && node.hasAttribute('data-section')) {
          observer.observe(node)
        }
        // Check children
        if (node instanceof Element) {
          node.querySelectorAll('[data-section]').forEach((el) => observer.observe(el))
        }
      })
    })
  })

  mutationObserver.observe(document.body, { childList: true, subtree: true })
}

// ─── Collector 4: Scroll depth tracker ─────────────────────────────────────────────
function initScrollDepthTracker() {
  const trackedDepths = new Set<number>()

  window.addEventListener('scroll', () => {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollTop = window.scrollY
    const scrollPercent = (scrollTop / scrollHeight) * 100

    const thresholds = [25, 50, 75, 90, 100]
    
    thresholds.forEach((threshold) => {
      if (scrollPercent >= threshold && !trackedDepths.has(threshold)) {
        trackedDepths.add(threshold)
        trackEvent({
          eventType: 'scroll_depth',
          timestamp: Date.now(),
          data: { depth: threshold }
        })
      }
    })
  })
}

// ─── Collector 5: Back navigation detector ───────────────────────────────────────────
function initBackNavigationTracker() {
  window.addEventListener('popstate', () => {
    trackEvent({
      eventType: 'back_navigation',
      timestamp: Date.now()
    })
  })
}

// ─── Collector 6: Card interaction tracker ───────────────────────────────────────────
function initCardInteractionTracker() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element

    // Card view
    const cardViewBtn = target.closest('[data-action="card-view"]')
    if (cardViewBtn) {
      const cardId = cardViewBtn.getAttribute('data-card-id')
      trackEvent({
        eventType: 'card_view',
        timestamp: Date.now(),
        data: { cardId }
      })
    }

    // Card compare
    const cardCompareBtn = target.closest('[data-action="card-compare"]')
    if (cardCompareBtn) {
      const cardId = cardCompareBtn.getAttribute('data-card-id')
      trackEvent({
        eventType: 'card_compare',
        timestamp: Date.now(),
        data: { cardId }
      })
    }

    // Card detail expansion
    const cardDetailBtn = target.closest('[data-action="card-detail-expand"]')
    if (cardDetailBtn) {
      trackEvent({
        eventType: 'card_detail_expansion',
        timestamp: Date.now()
      })
    }

    // Calculate best card click
    const calculateBtn = target.closest('[data-action="calculate-best-card"]')
    if (calculateBtn) {
      trackEvent({
        eventType: 'calculate_best_card_click',
        timestamp: Date.now()
      })
    }
  })
}

// ─── Collector 7: Transfer partner click tracker ───────────────────────────────────
function initTransferPartnerClickTracker() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element
    const partnerLink = target.closest('[data-partner]')

    if (partnerLink) {
      const partner = partnerLink.getAttribute('data-partner')
      trackEvent({
        eventType: 'transfer_partner_click',
        timestamp: Date.now(),
        data: { partner }
      })
    }
  })
}

// ─── Collector 8: Wallet button tracker ───────────────────────────────────────────
function initWalletButtonTracker() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element

    // Add to wallet
    const addWalletBtn = target.closest('[data-action="add-to-wallet"]')
    if (addWalletBtn) {
      const cardId = addWalletBtn.getAttribute('data-card-id')
      trackEvent({
        eventType: 'wallet_add',
        timestamp: Date.now(),
        data: { cardId }
      })
    }

    // Compare cards
    const compareBtn = target.closest('[data-action="compare-cards"]')
    if (compareBtn) {
      trackEvent({
        eventType: 'card_compare',
        timestamp: Date.now()
      })
    }
  })
}

// ─── Collector 9: Category selection tracker ───────────────────────────────────────
function initCategorySelectionTracker() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element
    const categoryBtn = target.closest('[data-category]')

    if (categoryBtn) {
      const category = categoryBtn.getAttribute('data-category')
      trackEvent({
        eventType: 'category_selection',
        timestamp: Date.now(),
        data: { category }
      })
    }
  })
}

// ─── Collector 10: Card recommendation tracker ─────────────────────────────────────
function initCardRecommendationTracker() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element
    const recommendSection = target.closest('[data-section="card-recommendation"]')

    if (recommendSection) {
      trackEvent({
        eventType: 'card_recommendation_view',
        timestamp: Date.now()
      })
    }
  })
}

// ─── Collector 11: Annual fee tracker ───────────────────────────────────────────────
function initAnnualFeeTracker() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element
    const feeSection = target.closest('[data-section="annual-fee"]')

    if (feeSection) {
      trackEvent({
        eventType: 'annual_fee_view',
        timestamp: Date.now()
      })
    }
  })
}

// ─── Helper: Get CSS selector for element ───────────────────────────────────────────
function getSelector(element: Element): string {
  if (element.id) {
    return `#${element.id}`
  }
  if (element.className) {
    return `.${element.className.split(' ').join('.')}`
  }
  return element.tagName.toLowerCase()
}
