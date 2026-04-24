'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUp, ArrowDown, Search, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  last_contact: string | null
  status: string
  notes: string | null
  removed_at: string | null
  created_at: string
}

type SortKey = keyof WaitlistEntry
type SortDir = 'asc' | 'desc'

const STATUS_OPTIONS = [
  { value: 'waiting',           label: 'Waiting' },
  { value: 'contacted',         label: 'Contacted' },
  { value: 'demo_booked',       label: 'Demo Booked' },
  { value: 'ready_to_onboard',  label: 'Ready to Onboard' },
  { value: 'removed',           label: 'Removed' },
]

const STATUS_COLOURS: Record<string, string> = {
  waiting:          'bg-amber-100 text-amber-700',
  contacted:        'bg-blue-100 text-blue-700',
  demo_booked:      'bg-purple-100 text-purple-700',
  ready_to_onboard: 'bg-green-100 text-green-700',
  removed:          'bg-gray-100 text-gray-500',
}

const POS_OPTIONS = ['All', 'Clover', 'Square', 'Epos Now', 'Lightspeed', 'Toast', 'Other']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function sortValue(entry: WaitlistEntry, key: SortKey): string | number {
  const v = entry[key]
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return v
  // Dates: ISO strings sort lexicographically correctly
  return String(v).toLowerCase()
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function WaitlistClient() {
  const [entries, setEntries]       = useState<WaitlistEntry[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  // Filters
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [posFilter, setPosFilter]   = useState('All')
  const [showRemoved, setShowRemoved] = useState(false)

  // Sort
  const [sortKey, setSortKey]       = useState<SortKey>('date_enquired')
  const [sortDir, setSortDir]       = useState<SortDir>('desc')

  // Inline editing state — keyed by entry id
  const [notes, setNotes]           = useState<Record<number, string>>({})
  const [savingNotes, setSavingNotes] = useState<Record<number, boolean>>({})
  const [savedNotes, setSavedNotes]  = useState<Record<number, boolean>>({})
  const [savingStatus, setSavingStatus] = useState<Record<number, boolean>>({})
  const noteTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/admin/waitlist')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        const rows: WaitlistEntry[] = d.waitlist ?? []
        setEntries(rows)
        const init: Record<number, string> = {}
        rows.forEach(e => { init[e.id] = e.notes ?? '' })
        setNotes(init)
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  // ── Patch helper ───────────────────────────────────────────────────────────

  const patch = useCallback(async (id: number, body: Record<string, unknown>) => {
    await fetch(`/api/admin/waitlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }, [])

  // ── Notes ──────────────────────────────────────────────────────────────────

  function handleNotesChange(id: number, value: string) {
    setNotes(p => ({ ...p, [id]: value }))
    clearTimeout(noteTimers.current[id])
    noteTimers.current[id] = setTimeout(async () => {
      setSavingNotes(p => ({ ...p, [id]: true }))
      await patch(id, { notes: value })
      setSavingNotes(p => ({ ...p, [id]: false }))
      setSavedNotes(p => ({ ...p, [id]: true }))
      setTimeout(() => setSavedNotes(p => ({ ...p, [id]: false })), 2000)
    }, 1000)
  }

  // ── Status ─────────────────────────────────────────────────────────────────

  async function handleStatusChange(id: number, newStatus: string) {
    setSavingStatus(p => ({ ...p, [id]: true }))
    await patch(id, { status: newStatus })
    setEntries(p => p.map(e => e.id === id ? { ...e, status: newStatus } : e))
    setSavingStatus(p => ({ ...p, [id]: false }))
  }

  // ── Remove (soft delete) ───────────────────────────────────────────────────

  async function handleRemove(id: number) {
    await patch(id, { status: 'removed', removed_at: true })
    setEntries(p => p.map(e =>
      e.id === id ? { ...e, status: 'removed', removed_at: new Date().toISOString() } : e
    ))
  }

  // ── Sort ───────────────────────────────────────────────────────────────────

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // ── Filter + sort pipeline ─────────────────────────────────────────────────

  const filtered = entries
    .filter(e => {
      if (!showRemoved && e.status === 'removed') return false
      if (showRemoved && e.status !== 'removed') return false
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (posFilter !== 'All') {
        const pos = (e.pos_type ?? '').toLowerCase()
        if (!pos.includes(posFilter.toLowerCase())) return false
      }
      if (search) {
        const q = search.toLowerCase()
        const haystack = [e.name, e.business_name, e.town, e.pos_type]
          .map(s => (s ?? '').toLowerCase()).join(' ')
        if (!haystack.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      const av = sortValue(a, sortKey)
      const bv = sortValue(b, sortKey)
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const total = entries.filter(e => !showRemoved ? e.status !== 'removed' : e.status === 'removed').length

  // ── Column header ──────────────────────────────────────────────────────────

  function Th({ label, col }: { label: string; col: SortKey }) {
    const active = sortKey === col
    return (
      <th
        onClick={() => handleSort(col)}
        className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-800 whitespace-nowrap"
      >
        <span className="flex items-center gap-1">
          {label}
          {active
            ? (sortDir === 'asc' ? <ArrowUp size={11} className="text-green-600" /> : <ArrowDown size={11} className="text-green-600" />)
            : <span className="w-[11px]" />}
        </span>
      </th>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={15} /> Admin
            </Link>
            <span className="text-gray-300">/</span>
            <h1 className="text-base font-semibold text-gray-900">Waitlist</h1>
          </div>
          <span className="text-sm text-gray-500">
            {filtered.length === total
              ? `${total} entr${total === 1 ? 'y' : 'ies'}`
              : `${filtered.length} of ${total} filtered`}
          </span>
        </div>

        {/* Filters */}
        <div className="max-w-screen-2xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, business, town, POS…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 w-64"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status filter (only when not showing removed) */}
          {!showRemoved && (
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.filter(s => s.value !== 'removed').map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          )}

          {/* POS filter */}
          <select
            value={posFilter}
            onChange={e => setPosFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {POS_OPTIONS.map(p => <option key={p}>{p}</option>)}
          </select>

          {/* Show removed toggle */}
          <button
            onClick={() => { setShowRemoved(v => !v); setStatusFilter('all') }}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              showRemoved
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
            }`}
          >
            {showRemoved ? 'Hide removed' : 'Show removed'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-screen-2xl mx-auto px-4 py-6">
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">Loading…</div>
        )}
        {error && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-red-500">{error}</div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
            {entries.length === 0 ? 'No waitlist entries yet.' : 'No entries match your filters.'}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <Th label="Name"            col="name" />
                    <Th label="Business"        col="business_name" />
                    <Th label="Town"            col="town" />
                    <Th label="POS"             col="pos_type" />
                    <Th label="Locs"            col="location_count" />
                    <Th label="WA #s"           col="whatsapp_count" />
                    <Th label="Phone"           col="phone_number" />
                    <Th label="First Contact"   col="date_enquired" />
                    <Th label="Last Contact"    col="last_contact" />
                    <Th label="Status"          col="status" />
                    <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[220px]">Notes</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(e => (
                    <tr key={e.id} className={`hover:bg-gray-50 transition-colors ${e.status === 'removed' ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{e.name ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{e.business_name ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{e.town ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{e.pos_type ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-600 text-center">{e.location_count ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-600 text-center">{e.whatsapp_count ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">{e.phone_number}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{fmtDate(e.date_enquired ?? e.created_at)}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{fmtDateTime(e.last_contact)}</td>

                      {/* Status dropdown */}
                      <td className="px-3 py-3 whitespace-nowrap">
                        <select
                          value={e.status}
                          disabled={savingStatus[e.id]}
                          onChange={ev => handleStatusChange(e.id, ev.target.value)}
                          className={`text-xs font-medium px-2 py-1 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer ${STATUS_COLOURS[e.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Notes */}
                      <td className="px-3 py-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={notes[e.id] ?? ''}
                            onChange={ev => handleNotesChange(e.id, ev.target.value)}
                            placeholder="Add a note…"
                            className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent min-w-[200px]"
                          />
                          {savingNotes[e.id] && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">saving…</span>
                          )}
                          {savedNotes[e.id] && !savingNotes[e.id] && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-600">saved</span>
                          )}
                        </div>
                      </td>

                      {/* Remove */}
                      <td className="px-3 py-3">
                        {e.status !== 'removed' && (
                          <button
                            onClick={() => handleRemove(e.id)}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors whitespace-nowrap"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
