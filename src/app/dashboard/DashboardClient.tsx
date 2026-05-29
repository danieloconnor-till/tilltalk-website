'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import AnalyticsSection from './AnalyticsSection'
import QueryChat from './QueryChat'
import AccountTab from './AccountTab'

interface Profile {
  id: string
  email: string
  full_name?: string | null
  restaurant_name?: string | null
  pos_type?: string | null
  pos_merchant_id?: string | null
  whatsapp_number?: string | null
  active?: boolean
}

interface LocationItem {
  id: number
  nickname: string
  address: string | null
}

interface Props {
  user: SupabaseUser
  profile: Profile | null
}

const TAB_ITEMS = [
  { id: 'analytics', label: 'Analytics' },
  { id: 'account',   label: 'Account'   },
] as const
type TabId = typeof TAB_ITEMS[number]['id']

export default function DashboardClient({ user, profile }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('analytics')
  const [locations, setLocations] = useState<LocationItem[]>([])

  const fetchLocations = useCallback(async () => {
    const res = await fetch('/api/manage/locations').catch(() => null)
    const d   = res && res.ok ? await res.json() : null
    setLocations(
      (d?.locations ?? []).map((l: Record<string, unknown>) => ({
        id:       l.id as number,
        nickname: l.nickname as string,
        address:  (l.address as string | null) ?? null,
      })),
    )
  }, [])

  useEffect(() => { fetchLocations() }, [fetchLocations])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
              {profile?.restaurant_name || profile?.full_name || 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-2 rounded-lg transition-colors min-h-[44px]"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {TAB_ITEMS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-6">

        {activeTab === 'analytics' && (
          <>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Ask Your Data</h2>
              <QueryChat
                businessName={profile?.restaurant_name || profile?.full_name || ''}
                locationIds={locations.map(l => l.id)}
              />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 mb-3">Detailed Analytics</h2>
              <AnalyticsSection locations={locations} />
            </div>
          </>
        )}

        {activeTab === 'account' && (
          <AccountTab
            profile={profile}
            user={user}
            onProfileUpdate={() => router.refresh()}
          />
        )}
      </div>
    </div>
  )
}
