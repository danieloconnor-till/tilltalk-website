'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, TrendingUp, CreditCard, XCircle, X } from 'lucide-react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  restaurant_name: string | null
  pos_type: string | null
  plan: string | null
  trial_end: string | null
  stripe_subscription_id: string | null
  active: boolean
  created_at: string
}

interface Stats {
  total: number
  activeTrials: number
  activeSubscriptions: number
  expired: number
}

interface Props {
  profiles: Profile[]
  stats: Stats
  adminEmail: string
}

interface ExtendModal {
  profileId: string
  profileName: string
}

export default function AdminClient({ profiles, stats }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [extendModal, setExtendModal] = useState<ExtendModal | null>(null)
  const [extendDays, setExtendDays] = useState('')
  const [extendReason, setExtendReason] = useState('')
  const [extending, setExtending] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.email.toLowerCase().includes(q) ||
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.restaurant_name || '').toLowerCase().includes(q)
    )
  })

  async function handleExtendTrial() {
    if (!extendModal || !extendDays) return
    setExtending(true)
    try {
      const res = await fetch('/api/admin/extend-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: extendModal.profileId,
          days: parseInt(extendDays),
          reason: extendReason,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setActionMsg('Error: ' + data.error)
      } else {
        setActionMsg(`Trial extended by ${extendDays} days`)
        setExtendModal(null)
        setExtendDays('')
        setExtendReason('')
        router.refresh()
      }
    } catch {
      setActionMsg('Network error')
    } finally {
      setExtending(false)
    }
  }

  async function handleToggleActive(profileId: string, currentActive: boolean) {
    try {
      const res = await fetch('/api/admin/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (data.error) {
        setActionMsg('Error: ' + data.error)
      } else {
        setActionMsg(`Account ${currentActive ? 'deactivated' : 'activated'}`)
        router.refresh()
      }
    } catch {
      setActionMsg('Network error')
    }
  }

  function getStatus(p: Profile): { label: string; color: string } {
    if (!p.active) return { label: 'Inactive', color: 'bg-gray-100 text-gray-600' }
    if (p.stripe_subscription_id) return { label: 'Subscribed', color: 'bg-green-100 text-green-700' }
    if (p.trial_end && new Date(p.trial_end) > new Date()) {
      return { label: 'Trial', color: 'bg-blue-100 text-blue-700' }
    }
    return { label: 'Expired', color: 'bg-amber-100 text-amber-700' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">TillTalk client management</p>
        </div>

        {actionMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-green-700">{actionMsg}</p>
            <button onClick={() => setActionMsg('')}>
              <X size={16} className="text-green-600" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total clients', value: stats.total, icon: Users, color: 'text-blue-600' },
            { label: 'Active trials', value: stats.activeTrials, icon: TrendingUp, color: 'text-green-600' },
            { label: 'Subscriptions', value: stats.activeSubscriptions, icon: CreditCard, color: 'text-purple-600' },
            { label: 'Expired', value: stats.expired, icon: XCircle, color: 'text-amber-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500">{label}</p>
                <Icon className={color} size={18} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or business..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Name', 'Business', 'POS', 'Plan', 'Trial End', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                      {search ? 'No clients match your search.' : 'No clients yet.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const status = getStatus(p)
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{p.full_name || '—'}</p>
                          <p className="text-xs text-gray-400">{p.email}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{p.restaurant_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 capitalize">{p.pos_type || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 capitalize">{p.plan || '—'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {p.trial_end
                            ? new Date(p.trial_end).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExtendModal({ profileId: p.id, profileName: p.restaurant_name || p.email })}
                              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Extend trial
                            </button>
                            <button
                              onClick={() => handleToggleActive(p.id, p.active)}
                              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                p.active
                                  ? 'bg-red-50 hover:bg-red-100 text-red-700'
                                  : 'bg-green-50 hover:bg-green-100 text-green-700'
                              }`}
                            >
                              {p.active ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Extend trial modal */}
        {extendModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Extend Trial</h3>
                <button onClick={() => setExtendModal(null)}>
                  <X size={20} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                Extending trial for <strong>{extendModal.profileName}</strong>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days to extend
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={extendDays}
                    onChange={(e) => setExtendDays(e.target.value)}
                    placeholder="e.g. 7"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={extendReason}
                    onChange={(e) => setExtendReason(e.target.value)}
                    placeholder="e.g. Technical issue during setup"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleExtendTrial}
                    disabled={extending || !extendDays}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    {extending ? 'Extending...' : 'Extend Trial'}
                  </button>
                  <button
                    onClick={() => setExtendModal(null)}
                    className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
