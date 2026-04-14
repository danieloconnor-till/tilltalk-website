'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DeactivatedPage() {
  const router = useRouter()

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
        <div className="w-14 h-14 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Account paused</h1>
        <p className="text-sm text-gray-600 mb-1 leading-relaxed">
          Your TillTalk access has been paused. This can happen when your free trial expires or if there was an issue with your payment.
        </p>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Your data is safe and your POS connection is intact — reactivating restores everything immediately.
        </p>
        <a
          href="mailto:hello@tilltalk.ie?subject=Reactivate my TillTalk account"
          className="inline-block bg-green-600 text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-green-700 transition-colors mb-3 w-full"
        >
          Reactivate my account →
        </a>
        <p className="text-xs text-gray-400 mb-4">
          We'll get you back up and running right away.
        </p>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
