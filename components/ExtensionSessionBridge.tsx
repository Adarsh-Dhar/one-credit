'use client'
import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (extensionId: string, message: any, callback?: (response: any) => void) => void
      }
    }
  }
}

export function ExtensionSessionBridge() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user) return
    // Only works if the page is loaded inside an extension context
    // (i.e., the web app tab is open and the extension is installed)
    try {
      const extId = process.env.NEXT_PUBLIC_EXTENSION_ID
      if (!extId || !window.chrome?.runtime?.sendMessage) return
      window.chrome.runtime.sendMessage(extId, {
        type: 'SET_USER_SESSION',
        email: session.user.email,
        userId: session.user.id,
        name: session.user.name,
      })
    } catch (e) {
      // Extension not installed or not available — ignore
    }
  }, [session])

  return null
}
