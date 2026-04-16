'use client'

import { useState, useEffect } from 'react'
import { Flag, CheckCircle2, AlertTriangle, Clock, Filter, X, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlagRow {
  id: string
  client_id: string | null
  phone_number: string | null
  message_text: string | null
  flag_type: string
  flag_reason: string | null
  auto_flagged: boolean
  confidence_score: number | null
  resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
  query_log_id: string | null
  created_at: string
  profiles?: {
    id: string
    full_name: string | null
    restaurant_name: string | null
    email: string | null
  } | null
}

interface Overview {
  total_open: number
  today_count: number
  avg_resolution_hours: number | null
  most_common_type: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const FLAG_LABELS: Record<string, string> = {
  frustration:      'Frustration',
  data_error:       'Data Error',
  human_requested:  'Human Requested',
  repeated_query:   'Repeated Query',
  bot_failure:      'Bot Failure',
  other:            'Other',
}

const FLAG_COLORS: Record<string, string> = {
  frustration:      'bg-orange-100 text-orange-700',
  data_error:       'bg-red-100 text-red-700',
  human_requested:  'bg-blue-100 text-blue-700',
  repeated_query:   'bg-purple-100 text-purple-700',
  bot_failure:      'bg-rose-100 text-rose-700',
  other:            'bg-gray-100 text-gray-700',
}

function FlagBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${FLAG_COLORS[type] || FLAG_COLORS.other}`}>
      {FLAG_LABELS[type] || type}
    </span>
  )
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Overview cards ────────────────────────────────────────────────────────────

function OverviewCards({ overview }: { overview: Overview }) {
  const cards = [
    { label: 'Open Flags',        value: String(overview.total_open),       icon: <Flag size={16} className="text-red-500" /> },
    { label: 'Flagged Today',     value: String(overview.today_count),      icon: <AlertTriangle size={16} className="text-orange-500" /> },
    { label: 'Avg Resolution',    value: overview.avg_resolution_hours != null ? `${overview.avg_resolution_hours}h` : '—', icon: <Clock size={16} className="text-blue-500" /> },
    { label: 'Top Flag Type',     value: FLAG_LABELS[overview.most_common_type || ''] || '—', icon: <Filter size={16} className="text-purple-500" /> },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon }) => (
        <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500">{label}</span></div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Manual flag modal ─────────────────────────────────────────────────────────

function ManualFlagModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [flagType, setFlagType]     = useState('other')
  const [phone, setPhone]           = useState('')
  const [message, setMessage]       = useState('')
  const [reason, setReason]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/admin/flags', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ flag_type: flagType, phone_number: phone, message_text: message, flag_reason: reason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onCreated()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create flag')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Flag size={18} className="text-red-500" />
            <h3 className="text-base font-semibold text-gray-900">Manual Flag</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Flag Type</label>
            <select value={flagType} onChange={e => setFlagType(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {Object.entries(FLAG_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number (optional)</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+353..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Message (optional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Why are you flagging this?" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50">
              {submitting ? 'Creating…' : 'Create Flag'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 text-sm font-medium text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Resolve modal ─────────────────────────────────────────────────────────────

function ResolveModal({
  flag,
  onClose,
  onResolved,
}: {
  flag: FlagRow
  onClose: () => void
  onResolved: () => void
}) {
  const [notes, setNotes]             = useState('')
  const [sendWa, setSendWa]           = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState('')

  const clientName = flag.profiles?.restaurant_name || flag.profiles?.full_name || ''

  async function handleResolve() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/flags/${flag.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ resolution_notes: notes, send_whatsapp: sendWa, client_name: clientName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      onResolved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resolve')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-green-500" />
            <h3 className="text-base font-semibold text-gray-900">Resolve Flag</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1">
          <div className="flex items-center gap-2">
            <FlagBadge type={flag.flag_type} />
            {flag.profiles?.restaurant_name && (
              <span className="text-sm font-medium text-gray-800">{flag.profiles.restaurant_name}</span>
            )}
          </div>
          {flag.message_text && (
            <p className="text-xs text-gray-600 line-clamp-3">{flag.message_text}</p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Resolution notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="What was the issue? What did you do?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          {flag.phone_number && (
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWa}
                onChange={e => setSendWa(e.target.checked)}
                className="mt-0.5 rounded"
              />
              <div>
                <p className="text-sm font-medium text-gray-800">Send follow-up WhatsApp</p>
                <p className="text-xs text-gray-500">Sends a brief check-in message to {flag.phone_number}</p>
              </div>
            </label>
          )}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={handleResolve} disabled={submitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50">
              {submitting ? 'Resolving…' : 'Mark Resolved'}
            </button>
            <button onClick={onClose} className="flex-1 text-sm font-medium text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Flag row ──────────────────────────────────────────────────────────────────

function FlagRowItem({ flag, onResolved }: { flag: FlagRow; onResolved: () => void }) {
  const [expanded, setExpanded]         = useState(false)
  const [showResolve, setShowResolve]   = useState(false)

  const businessName = flag.profiles?.restaurant_name || flag.profiles?.full_name || flag.phone_number || '—'

  return (
    <>
      <div className={`border-b border-gray-100 last:border-0 ${flag.resolved ? 'opacity-60' : ''}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{businessName}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{flag.message_text?.slice(0, 80) || '—'}</p>
            </div>
            <FlagBadge type={flag.flag_type} />
            <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(flag.created_at)}</span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${flag.resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {flag.resolved ? 'Resolved' : 'Open'}
            </span>
          </div>
          {expanded ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 bg-gray-50/50">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-500 mb-0.5">Business</p>
                <p className="font-medium text-gray-800">{flag.profiles?.restaurant_name || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Phone</p>
                <p className="font-medium text-gray-800">{flag.phone_number || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Confidence</p>
                <p className="font-medium text-gray-800">{flag.confidence_score != null ? `${(flag.confidence_score * 100).toFixed(0)}%` : '—'}</p>
              </div>
              <div>
                <p className="text-gray-500 mb-0.5">Source</p>
                <p className="font-medium text-gray-800">{flag.auto_flagged ? 'Auto-detected' : 'Manual'}</p>
              </div>
            </div>

            {flag.flag_reason && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Detection reason</p>
                <p className="text-xs text-gray-700 bg-white rounded-lg border border-gray-200 px-3 py-2">{flag.flag_reason}</p>
              </div>
            )}

            {flag.message_text && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Full message</p>
                <p className="text-xs text-gray-700 bg-white rounded-lg border border-gray-200 px-3 py-2 whitespace-pre-wrap">{flag.message_text}</p>
              </div>
            )}

            {flag.resolved && flag.resolution_notes && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Resolution notes</p>
                <p className="text-xs text-gray-700 bg-green-50 rounded-lg border border-green-200 px-3 py-2">{flag.resolution_notes}</p>
              </div>
            )}

            {!flag.resolved && (
              <button
                onClick={() => setShowResolve(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <CheckCircle2 size={13} /> Resolve
              </button>
            )}
          </div>
        )}
      </div>

      {showResolve && (
        <ResolveModal
          flag={flag}
          onClose={() => setShowResolve(false)}
          onResolved={onResolved}
        />
      )}
    </>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────

export default function FlagsSection() {
  const [flags, setFlags]               = useState<FlagRow[]>([])
  const [overview, setOverview]         = useState<Overview>({ total_open: 0, today_count: 0, avg_resolution_hours: null, most_common_type: null })
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  // Filters
  const [filterType,     setFilterType]     = useState('')
  const [filterResolved, setFilterResolved] = useState('false')   // default: open only
  const [filterDays,     setFilterDays]     = useState('30')

  const [showManual, setShowManual] = useState(false)

  async function loadFlags() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ days: filterDays })
      if (filterType)     params.set('type',     filterType)
      if (filterResolved) params.set('resolved',  filterResolved)

      const res  = await fetch(`/api/admin/flags?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load flags')
      setFlags(data.flags)
      setOverview(data.overview)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFlags() }, [filterType, filterResolved, filterDays]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section id="flags">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flag size={18} className="text-red-500" />
          <h2 className="text-base font-semibold text-gray-900">Flags</h2>
          {overview.total_open > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{overview.total_open} open</span>
          )}
        </div>
        <button
          onClick={() => setShowManual(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Flag size={13} /> Manual Flag
        </button>
      </div>

      <OverviewCards overview={overview} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mt-4 mb-4">
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="">All types</option>
          {Object.entries(FLAG_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={filterResolved} onChange={e => setFilterResolved(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="false">Open only</option>
          <option value="true">Resolved only</option>
          <option value="">All</option>
        </select>
        <select value={filterDays} onChange={e => setFilterDays(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-12 text-sm text-gray-400">Loading flags…</div>
        )}
        {error && (
          <div className="flex items-center gap-2 py-12 justify-center text-sm text-red-600">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
        {!loading && !error && flags.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400 gap-2">
            <MessageSquare size={24} className="text-gray-300" />
            No flags found for the selected filters
          </div>
        )}
        {!loading && !error && flags.map(flag => (
          <FlagRowItem key={flag.id} flag={flag} onResolved={loadFlags} />
        ))}
      </div>

      {showManual && (
        <ManualFlagModal onClose={() => setShowManual(false)} onCreated={loadFlags} />
      )}
    </section>
  )
}
