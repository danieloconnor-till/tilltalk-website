'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()

  function handleStartTrial() {
    setOpen(false)
    if (pathname === '/') {
      document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      router.push('/#chat')
    }
  }

  useEffect(() => {
    const supabase = createClient()

    // Read initial session without a round-trip
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session)
    })

    // Keep in sync if the user signs in/out in another tab
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-green-600">
            TillTalk
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Features
            </Link>
            <Link href="/#pricing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Pricing
            </Link>
            <Link href="/#how-it-works" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              How It Works
            </Link>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-4">
            {loggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Sign In
                </Link>
                <button
                  onClick={handleStartTrial}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Start Free Trial
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-600 hover:text-gray-900"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4 space-y-3">
          <Link
            href="/#features"
            className="block text-gray-600 hover:text-gray-900 text-sm font-medium py-2"
            onClick={() => setOpen(false)}
          >
            Features
          </Link>
          <Link
            href="/#pricing"
            className="block text-gray-600 hover:text-gray-900 text-sm font-medium py-2"
            onClick={() => setOpen(false)}
          >
            Pricing
          </Link>
          <Link
            href="/#how-it-works"
            className="block text-gray-600 hover:text-gray-900 text-sm font-medium py-2"
            onClick={() => setOpen(false)}
          >
            How It Works
          </Link>
          {loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className="block text-gray-600 hover:text-gray-900 text-sm font-medium py-2"
                onClick={() => setOpen(false)}
              >
                Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="block w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg text-center transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="block text-gray-600 hover:text-gray-900 text-sm font-medium py-2"
                onClick={() => setOpen(false)}
              >
                Sign In
              </Link>
              <button
                onClick={handleStartTrial}
                className="block w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg text-center transition-colors"
              >
                Start Free Trial
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
