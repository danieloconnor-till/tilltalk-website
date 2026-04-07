'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Smartphone, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaInit() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {/* non-fatal */})
    }
  }, [])

  // Capture install prompt
  useEffect(() => {
    if (sessionStorage.getItem('pwa_dismissed')) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Show banner after 30 s, but only on /dashboard
  useEffect(() => {
    if (!deferredPrompt || !pathname.startsWith('/dashboard')) return
    if (sessionStorage.getItem('pwa_dismissed')) return

    const t = setTimeout(() => setShowBanner(true), 30_000)
    return () => clearTimeout(t)
  }, [deferredPrompt, pathname])

  function dismiss() {
    setShowBanner(false)
    sessionStorage.setItem('pwa_dismissed', '1')
  }

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setShowBanner(false)
    if (outcome === 'dismissed') sessionStorage.setItem('pwa_dismissed', '1')
    setDeferredPrompt(null)
  }

  if (!showBanner || !deferredPrompt) return null

  return (
    <div className="fixed bottom-24 right-5 z-40 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 max-w-[280px]">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
          <Smartphone size={20} className="text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Add to home screen</p>
          <p className="text-xs text-gray-500 mt-0.5">Quick access to your sales analytics</p>
        </div>
        <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 -mt-0.5 -mr-0.5 p-1">
          <X size={15} />
        </button>
      </div>
      <button
        onClick={install}
        className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
      >
        Add to Home Screen
      </button>
    </div>
  )
}
