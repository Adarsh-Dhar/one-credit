// Content script for OneCredit app domain
// Reads NextAuth session and sends it to extension background
import { logger } from './logger'

interface NextAuthSession {
  user?: {
    email?: string
    name?: string
    id?: string
  }
  expires?: string
}

// Read NextAuth session from the page
function readNextAuthSession(): NextAuthSession | null {
  // Try to read from localStorage (NextAuth stores session there)
  const sessionStr = localStorage.getItem('next-auth.session-token')
  if (sessionStr) {
    try {
      const session = JSON.parse(sessionStr)
      return session
    } catch (e) {
      logger.error('Failed to parse session from localStorage:', e)
    }
  }

  // Try to read from the global __NEXT_DATA__ object (server-rendered data)
  const nextData = (window as any).__NEXT_DATA__
  if (nextData?.props?.pageProps?.session) {
    return nextData.props.pageProps.session
  }

  // Try to read cookies via document.cookie
  const cookies = document.cookie.split(';')
  const sessionCookie = cookies.find(c => c.trim().startsWith('next-auth.session-token='))
  if (sessionCookie) {
    const token = sessionCookie.split('=')[1]
    // The token is a JWT, we can decode it to get user info
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      const decoded = JSON.parse(jsonPayload)
      return {
        user: {
          email: decoded.email,
          name: decoded.name,
          id: decoded.sub,
        },
      }
    } catch (e) {
      logger.error('Failed to decode JWT:', e)
    }
  }

  return null
}

// Send session to background script
function sendSessionToBackground(session: NextAuthSession | null) {
  if (session?.user?.email) {
    const email = session.user.email
    const name = session.user.name
    const userId = session.user.id

    chrome.runtime.sendMessage(
      {
        type: 'SET_USER_SESSION',
        data: {
          email,
          name,
          userId,
        },
      },
      (response) => {
        if (response?.success) {
          logger.log('Session sent to extension:', email)
        }
      }
    )
  }
}

// Monitor for session changes
function monitorSession() {
  // Check on page load
  const session = readNextAuthSession()
  if (session) {
    sendSessionToBackground(session)
  }

  // Listen for storage changes (session updates)
  window.addEventListener('storage', (e) => {
    if (e.key === 'next-auth.session-token' || e.key === 'next-auth.csrf-token') {
      const session = readNextAuthSession()
      sendSessionToBackground(session)
    }
  })

  // Poll for session changes every 5 seconds (for SPA navigation)
  setInterval(() => {
    const session = readNextAuthSession()
    sendSessionToBackground(session)
  }, 5000)
}

// Start monitoring
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', monitorSession)
} else {
  monitorSession()
}

logger.log('App content script loaded')
