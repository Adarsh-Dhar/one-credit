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

  console.log('[OneCredit] ExtensionSessionBridge mounted, session:', !!session)

  useEffect(() => {
    if (!session?.user) {
      console.log('[OneCredit] No session user yet')
      return
    }

    const extId = process.env.NEXT_PUBLIC_EXTENSION_ID
    console.log('[OneCredit] ExtensionSessionBridge: session detected', { email: session.user.email, extId })
    if (!extId) {
      console.warn('[OneCredit] NEXT_PUBLIC_EXTENSION_ID is not set — extension will not receive session')
      return
    }
    if (!window.chrome?.runtime?.sendMessage) {
      console.warn('[OneCredit] chrome.runtime.sendMessage not available')
      return
    }

    try {
      console.log('[OneCredit] Sending SET_USER_SESSION to extension', extId)
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
            console.warn('[OneCredit] Extension message failed:', window.chrome.runtime.lastError.message)
          } else {
            console.log('[OneCredit] Extension message sent successfully', response)
          }
        }
      )
    } catch (e) {
      console.warn('[OneCredit] Extension message error:', e)
    }
  }, [session])

  return null
}
