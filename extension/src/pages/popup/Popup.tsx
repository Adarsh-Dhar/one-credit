import React, { useState, useEffect } from 'react'
import { CreditCard, Settings, ExternalLink, Sparkles, Calculator, User } from 'lucide-react'

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

  useEffect(() => {
    // Try to fetch session from web app API via background script (avoids CSP)
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response) => {
      if (response?.success && response?.data?.user?.email) {
        setSession({
          userEmail: response.data.user.email,
          userName: response.data.user.name,
          userId: response.data.user.id,
        })
        // Store in local storage for persistence
        chrome.storage.local.set({
          userEmail: response.data.user.email,
          userName: response.data.user.name,
          userId: response.data.user.id,
        })
      } else {
        // Fallback: read local storage (set by session bridge or background)
        chrome.storage.local.get(
          ['userEmail', 'userName', 'userId'],
          (local) => {
            if (local.userEmail) {
              setSession({
                userEmail: local.userEmail as string,
                userName: local.userName as string | undefined,
                userId: local.userId as string | undefined,
              })
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
    if (!product) return
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

  const initials = session.userName
    ? session.userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : session.userEmail?.[0]?.toUpperCase() || '?'

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-yellow-500 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h1 className="font-bold text-lg">OneCredit</h1>
        </div>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </div>

      {/* Account bar — NEW */}
      {session.userEmail ? (
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-purple-600/40 border border-purple-500/40 flex items-center justify-center text-xs font-semibold text-purple-300 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            {session.userName && (
              <p className="text-xs font-medium text-white truncate">{session.userName}</p>
            )}
            <p className="text-xs text-slate-400 truncate">{session.userEmail}</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex items-center gap-2">
          <User className="w-4 h-4 text-slate-500" />
          <p className="text-xs text-slate-500">
            Not connected —{' '}
            <a href="http://localhost:3000/auth/signin" target="blank" rel="noopener noreferrer" className="text-purple-400 underline">
              sign in
            </a>
            {' or '}
            <button onClick={handleOpenOptions} className="text-purple-400 underline bg-transparent border-none cursor-pointer p-0 text-xs">
              set email in settings
            </button>
          </p>
        </div>
      )}

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Detected product — NEW */}
        {product ? (
          <div className="bg-slate-800/60 border border-purple-500/30 rounded-xl p-3 space-y-2">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Detected on this page</p>
            <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{product.name}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-white">${product.price.toFixed(2)}</span>
            </div>
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 disabled:opacity-60 text-white py-2.5 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              {calculating ? 'Opening analysis…' : 'Calculate best price'}
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-300 text-sm leading-relaxed">
              AI-powered credit card optimizer. Navigate to an Amazon product page to get card recommendations.
            </p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Status</p>
            <p className="text-sm font-medium text-green-400">Active</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">Cards</p>
            <p className="text-sm font-medium text-purple-300">12</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleOpenSidePanel}
            className="w-full bg-gradient-to-r from-purple-600 to-yellow-500 hover:from-purple-700 hover:to-yellow-600 text-white py-3 px-4 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Open Transaction Portal
          </button>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-xl font-medium text-sm transition-all border border-slate-600"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>

        {/* Footer Links */}
        <div className="pt-4 border-t border-slate-700 space-y-2">
          <a href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between text-xs text-slate-400 hover:text-slate-300 transition-colors py-2">
            <span>Visit OneCredit</span><ExternalLink className="w-3 h-3" />
          </a>
          <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/help`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between text-xs text-slate-400 hover:text-slate-300 transition-colors py-2">
            <span>Help & Support</span><ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
