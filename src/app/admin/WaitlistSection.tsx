'use client'

import { useEffect, useState, useRef } from 'react'

interface WaitlistEntry {
  id: number
  name: string | null
  business_name: string | null
  town: string | null
  pos_type: string | null
  location_count: number | null
  whatsapp_count: number | null
  phone_number: string
  date_enquired: string | null
  status: string
  notes: string | null
  created_at: string
}

export default function WaitlistSection() {
  const [entries, setEntries]   = useState<WaitlistEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [saving, setSaving]     = useState<Record<number, boolean>>({})
  const [saved, setSaved]       = useState<Record<number, boolean>>({})
  const [notes, setNotes]       = useState<Record<number, string>>({})
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    fetch('/api/admin/waitlist')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return }
        const rows: WaitlistEntry[] = d.waitlist ?? []
        setEntries(rows)
        const init: Record<number, string> = {}
        rows.forEach((e) => { init[e.id] = e.notes ?? '' })
        setNotes(init)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  function handleNotesChange(id: number, value: string) {
    setNotes((prev) => ({ ...prev, [id]: value }))
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(() => saveNotes(id, value), 1000)
  }

  async function saveNotes(id: number, value: string) {
    setSaving((p) => ({ ...p, [id]: true }))
    try {
      await fetch(`/api/admin/waitlist/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value }),
      })
      setSaved((p) => ({ ...p, [id]: true }))
      setTimeout(() => setSaved((p) => ({ ...p, [id]: false })), 2000)
    } finally {
      setSaving((p) => ({ ...p, [id]: false }))
    }
  }

  function fmtDate(iso: string | null) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function statusBadge(status: string) {
    const colour = status === 'waiting' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colour}`}>{status}</span>
  }

  return (
    <section id="waitlist" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Waitlist</h2>
        {!loading && !error && (
          <span className="text-sm text-gray-500">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</span>
        )}
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
        </div>
      )}

      {error && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm text-red-500 text-center py-4">{error}</p>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <p className="text-sm text-gray-400 text-center py-4">No waitlist entries yet.</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Town</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">POS</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Locs</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{e.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{e.business_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.town ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.pos_type ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 text-center">{e.location_count ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{e.phone_number}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(e.date_enquired ?? e.created_at)}</td>
                    <td className="px-4 py-3">{statusBadge(e.status)}</td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <input
                          type="text"
                          value={notes[e.id] ?? ''}
                          onChange={(ev) => handleNotesChange(e.id, ev.target.value)}
                          placeholder="Add a note…"
                          className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        {saving[e.id] && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">saving…</span>
                        )}
                        {saved[e.id] && !saving[e.id] && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-600">saved</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
