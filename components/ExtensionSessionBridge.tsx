'use client'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (extensionId: string, message: any, callback?: (response: any) => void) => void
        lastError?: { message: string }
      }
    }
  }
}

export function ExtensionSessionBridge() {
  const { data: session } = useSession()

  const log = process.env.NODE_ENV === 'development' ? console.log : () => {}
  const logWarn = process.env.NODE_ENV === 'development' ? console.warn : () => {}

  log('[OneCredit] ExtensionSessionBridge mounted, session:', !!session)

  useEffect(() => {
    log('[OneCredit] ExtensionSessionBridge useEffect triggered', { session: !!session, user: !!session?.user })

    if (!session?.user) {
      log('[OneCredit] No session user yet')
      return
    }

    const extId = process.env.NEXT_PUBLIC_EXTENSION_ID
    log('[OneCredit] ExtensionSessionBridge: session detected', { email: session.user.email, extId, userId: session.user.id })
    if (!extId) {
      logWarn('[OneCredit] NEXT_PUBLIC_EXTENSION_ID is not set — extension will not receive session')
      return
    }
    if (!window.chrome?.runtime?.sendMessage) {
      logWarn('[OneCredit] chrome.runtime.sendMessage not available')
      return
    }

    try {
      log('[OneCredit] Sending SET_USER_SESSION to extension', extId)
      window.chrome.runtime.sendMessage(
        extId,
        {
          type: 'SET_USER_SESSION',
          data: {
            email: session.user.email,
            userId: session.user.id,
            name: session.user.name,
          },
        },
        (response) => {
          if (window.chrome?.runtime?.lastError) {
            logWarn('[OneCredit] Extension message failed:', window.chrome.runtime.lastError.message)
          } else {
            log('[OneCredit] Extension message sent successfully', response)
          }
        }
      )
    } catch (e) {
      logWarn('[OneCredit] Extension message error:', e)
    }
  }, [session, log, logWarn])

  return null
}
