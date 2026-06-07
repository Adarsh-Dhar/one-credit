import React, { useState, useEffect } from 'react'
import { CreditCard, Settings, ExternalLink, Sparkles, Calculator, User, Crosshair } from 'lucide-react'

interface DetectedProduct {
  name: string
  price: number
  originalPrice?: number | null
  site: string
}

interface UserSession {
  userEmail?: string
  userId?: string
  userName?: string
}

export function Popup() {
  const [product, setProduct] = useState<DetectedProduct | null>(null)
  const [session, setSession] = useState<UserSession>({})
  const [calculating, setCalculating] = useState(false)
  const [pickerStep, setPickerStep] = useState<'idle' | 'name' | 'price'>('idle')
  const [pickerError, setPickerError] = useState<string | null>(null)
  const [cardCount, setCardCount] = useState<number>(0)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'not-connected'>('not-connected')

  useEffect(() => {
    // Fetch session directly from web app API
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    
    fetch(`${API_BASE}/api/auth/session`)
      .then(res => res.json())
      .then(data => {
        if (data?.user?.email) {
          setSession({
            userEmail: data.user.email,
            userName: data.user.name,
            userId: data.user.id,
          })
          setConnectionStatus('connected')
          
          // Store in local storage for persistence
          chrome.storage.local.set({
            userEmail: data.user.email,
            userName: data.user.name,
            userId: data.user.id,
          })

          // Fetch card count from API
          console.log('[OneCredit] Fetching card count for userId:', data.user.id)
          fetch(`${API_BASE}/api/extension/card-count?userId=${data.user.id}`)
            .then(res => {
              console.log('[OneCredit] Card count API response status:', res.status)
              return res.json()
            })
            .then(data => {
              console.log('[OneCredit] Card count API response:', data)
              if (data.cardCount !== undefined) {
                setCardCount(data.cardCount)
              } else {
                console.error('[OneCredit] No cardCount in response:', data)
              }
            })
            .catch(err => {
              console.error('[OneCredit] Failed to fetch card count:', err)
            })
        } else {
          setConnectionStatus('not-connected')
          // Fallback: read local storage
          chrome.storage.local.get(
            ['userEmail', 'userName', 'userId'],
            (local) => {
              if (local.userEmail) {
                setSession({
                  userEmail: local.userEmail as string,
                  userName: local.userName as string | undefined,
                  userId: local.userId as string | undefined,
                })
                setConnectionStatus('connected')

                // Fetch card count from API
                if (local.userId) {
                  console.log('[OneCredit] Fetching card count from fallback for userId:', local.userId)
                  fetch(`${API_BASE}/api/extension/card-count?userId=${local.userId}`)
                    .then(res => {
                      console.log('[OneCredit] Card count API response status (fallback):', res.status)
                      return res.json()
                    })
                    .then(data => {
                      console.log('[OneCredit] Card count API response (fallback):', data)
                      if (data.cardCount !== undefined) {
                        setCardCount(data.cardCount)
                      } else {
                        console.error('[OneCredit] No cardCount in response (fallback):', data)
                      }
                    })
                    .catch(err => {
                      console.error('[OneCredit] Failed to fetch card count (fallback):', err)
                    })
                } else {
                  console.log('[OneCredit] No userId found in local storage')
                }
              } else {
                // Fallback: check sync storage (set manually via options page)
                chrome.storage.sync.get(['accountEmail'], (sync) => {
                  if (sync.accountEmail) {
                    setSession({ userEmail: sync.accountEmail as string })
                  }
                })
              }
            }
          )
        }
      })
      .catch(err => {
        console.error('[OneCredit] Failed to fetch session:', err)
        setConnectionStatus('not-connected')
      })

    // Always load product separately — independent of session state
    chrome.storage.local.get(['lastDetectedProduct'], (local) => {
      if (local.lastDetectedProduct) {
        const rawProduct = local.lastDetectedProduct as DetectedProduct
        // Convert price to USD if it's still in INR (fallback for cached data)
        const productWithUsdPrice = {
          ...rawProduct,
          price: rawProduct.price > 10000 ? rawProduct.price / 90 : rawProduct.price,
          originalPrice: rawProduct.originalPrice && rawProduct.originalPrice > 10000 ? rawProduct.originalPrice / 90 : rawProduct.originalPrice,
        }
        setProduct(productWithUsdPrice)
      }
    })

    const listener = (msg: any) => {
      if (msg.type === 'PRODUCT_DETECTED_UPDATE' && msg.data) {
        const rawProduct = msg.data as DetectedProduct
        // Convert price to USD if it's still in INR (fallback for cached data)
        const productWithUsdPrice = {
          ...rawProduct,
          price: rawProduct.price > 10000 ? rawProduct.price / 90 : rawProduct.price,
          originalPrice: rawProduct.originalPrice && rawProduct.originalPrice > 10000 ? rawProduct.originalPrice / 90 : rawProduct.originalPrice,
        }
        setProduct(productWithUsdPrice)
      }
      if (msg.type === 'PICKER_RESULT') {
        if (msg.data?.error) {
          setPickerStep('idle')
          setPickerError('Could not read that — try clicking closer to the text.')
        } else {
          setPickerStep('idle')
          setPickerError(null)
          // product is already stored via PRODUCT_DETECTED, so it will
          // arrive via PRODUCT_DETECTED_UPDATE — no extra work needed
        }
      }
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const handleOpenSidePanel = async () => {
    const currentWindow = await chrome.windows.getCurrent()
    if (currentWindow.id) {
      await chrome.sidePanel.open({ windowId: currentWindow.id })
    }
  }

  const handleOpenOptions = () => chrome.runtime.openOptionsPage()

  const handleCalculate = async () => {
    if (!product) {
return
}
    setCalculating(true)
    // Open sidepanel which performs the full analysis
    await handleOpenSidePanel()
    // Convert price to USD if it's still in INR (fallback for cached data)
    const productWithUsdPrice = {
      ...product,
      price: product.price > 10000 ? product.price / 90 : product.price, // Assume INR if > 10000
      originalPrice: product.originalPrice && product.originalPrice > 10000 ? product.originalPrice / 90 : product.originalPrice,
    }
    // Pass product context so SidePanel auto-triggers analysis
    chrome.storage.local.set({ pendingAnalysis: productWithUsdPrice })
    setCalculating(false)
  }

  const handleStartPicker = async () => {
    setPickerError(null)
    setPickerStep('name')

    // Inject content script if not already there (handles sites not in manifest)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) return

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['js/content.js'],
      })
    } catch {
      // Already injected — safe to ignore
    }

    chrome.tabs.sendMessage(tab.id, { type: 'START_PICKER' })
    // Close the popup so the user can click on the page
    window.close()
  }

  const initials = session.userName
    ? session.userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : session.userEmail?.[0]?.toUpperCase() || '?'

  return (
    <div className="w-full h-full bg-[#0D0A06] text-[#E8D8B0] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-[#C5AA67] p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h1 className="font-bold text-lg text-[#0D0A06]">OneCredit</h1>
        </div>
        <div className="w-2 h-2 rounded-full bg-[#4ECDA4] animate-pulse" />
      </div>

      {/* Account bar — NEW */}
      {session.userEmail ? (
        <div className="bg-[#261B0E] border-b border-[#3D2E1A] px-4 py-2.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#C5AA67]/40 border border-[#C5AA67]/40 flex items-center justify-center text-xs font-semibold text-[#C5AA67] flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {session.userName && (
              <p className="text-xs font-medium text-[#E8D8B0] truncate">{session.userName}</p>
            )}
            <p className="text-xs text-[#8B8070] truncate">{session.userEmail}</p>
          </div>
        </div>
      ) : (
        <div className="bg-[#261B0E] border-b border-[#3D2E1A] px-4 py-2.5 flex items-center gap-2">
          <User className="w-4 h-4 text-[#6B5E52]" />
          <p className="text-xs text-[#6B5E52]">
            Not connected —{' '}
            <a href="http://localhost:3000/auth/signin" target="blank" rel="noopener noreferrer" className="text-[#C5AA67] underline">
              sign in
            </a>
            {' or '}
            <button onClick={handleOpenOptions} className="text-[#C5AA67] underline bg-transparent border-none cursor-pointer p-0 text-xs">
              set email in settings
            </button>
          </p>
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Detected product — NEW */}
        {product ? (
          <div className="bg-[#261B0E]/80 border border-[#C5AA67]/30 rounded-xl p-3 space-y-2">
            <p className="text-xs text-[#8B8070] font-medium uppercase tracking-wide">Detected on this page</p>
            <p className="text-sm font-medium text-[#E8D8B0] line-clamp-2 leading-snug">{product.name}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-[#E8D8B0]">${product.price.toFixed(2)}</span>
            </div>
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="w-full bg-[#C5AA67] hover:bg-[#A8893F] disabled:opacity-60 text-[#0D0A06] py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              {calculating ? 'Opening analysis…' : 'Calculate best price'}
            </button>
          </div>
        ) : (
          <div className="bg-[#261B0E]/80 border border-[#3D2E1A] rounded-xl p-4 space-y-3">
            <p className="text-[#C4B8A8] text-sm leading-relaxed">
              No product detected on this page.
            </p>

            {pickerStep !== 'idle' ? (
              <div className="bg-[#C5AA67]/20 border border-[#C5AA67]/40 rounded-lg px-3 py-2.5 text-xs text-[#C5AA67] leading-relaxed">
                {pickerStep === 'name'
                  ? '👆 Switch to the page and click the product name'
                  : '👆 Now click the price'}
              </div>
            ) : (
              <button
                onClick={handleStartPicker}
                className="w-full flex items-center justify-center gap-2 bg-[#261B0E] hover:bg-[#3D2E1A] text-[#E8D8B0] py-2.5 px-4 rounded-lg font-semibold text-sm transition-all"
              >
                <Crosshair className="w-4 h-4" />
                Pick product from page
              </button>
            )}

            {pickerError && (
              <p className="text-xs text-red-400">{pickerError}</p>
            )}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Status</p>
            <p className={`text-sm font-medium ${connectionStatus === 'connected' ? 'text-green-400' : 'text-slate-400'}`}>
              {connectionStatus === 'connected' ? 'Connected' : 'Not connected'}
            </p>
          </div>
          <div className="bg-[#261B0E]/80 border border-[#3D2E1A] rounded-xl p-3">
            <p className="text-xs text-[#8B8070] mb-1">Cards</p>
            <p className="text-sm font-medium text-[#C5AA67]">{cardCount}</p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="pt-4 border-t border-[#3D2E1A] space-y-2">
          <a href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between text-xs text-[#8B8070] hover:text-[#C4B8A8] transition-colors py-2">
            <span>Visit OneCredit</span><ExternalLink className="w-3 h-3" />
          </a>
          <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/help`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between text-xs text-[#8B8070] hover:text-[#C4B8A8] transition-colors py-2">
            <span>Help & Support</span><ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
