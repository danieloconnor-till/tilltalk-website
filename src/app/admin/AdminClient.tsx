'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, TrendingUp, CreditCard, XCircle, X, Search,
  AlertTriangle, Clock, Wifi, WifiOff, RefreshCw,
  Activity, Globe, Smartphone, DollarSign, BarChart2,
  ChevronRight, BadgeAlert, CheckCircle, Minus,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Profile = Record<string, any>

interface AdminStats {
  total: number
  signupsThisMonth: number
  activeTrials: number
  expiringSoon: Profile[]
  paidByPlan: Record<string, number>
  mrr: number
  arr: number
  churnThisMonth: number
  conversionRate: number
  ghostSignups: number
  activeSubscriptions: number
  expired: number
}

interface RailwayStats {
  status: 'ok' | 'error'
  active_clients?: number
  total_clients?: number
  by_plan?: Record<string, number>
  active_numbers?: number
  on_trial?: number
  total_messages_all_time?: number
  messages_last_7_days?: number
  messages_last_30_days?: number
  top_clients?: Array<{ name: string; messages: number }>
  error?: string
}

interface Props {
  profiles: Profile[]
  stats: AdminStats
  signupsPerDay: Array<{ date: string; count: number }>
  posBreakdown: Array<{ name: string; count: number }>
  utmBreakdown: Array<{ source: string; count: number }>
  adminEmail: string
}

const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 49, business: 99 }
const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-blue-500',
  pro: 'bg-purple-500',
  business: 'bg-amber-500',
}
const POS_COLORS = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500']

// ─── Mini-chart components ────────────────────────────────────────────────────

function VerticalBarChart({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="flex items-end gap-px h-20 w-full">
      {data.map(({ date, count }) => (
        <div
          key={date}
          title={`${date.slice(5)}: ${count}`}
          className="flex-1 bg-green-500 hover:bg-green-400 rounded-t-[1px] transition-colors cursor-default"
          style={{ height: `${Math.max(count > 0 ? 4 : 0, (count / max) * 100)}%`, minWidth: 1 }}
        />
      ))}
    </div>
  )
}

function HorizBars({
  items,
  colorClass = 'bg-green-500',
  max: overrideMax,
}: {
  items: Array<{ label: string; count: number }>
  colorClass?: string
  max?: number
}) {
  const max = overrideMax ?? Math.max(...items.map((i) => i.count), 1)
  return (
    <div className="space-y-2">
      {items.map(({ label, count }) => (
        <div key={label} className="flex items-center gap-3">
          <div className="w-28 text-xs text-gray-600 truncate text-right shrink-0 capitalize">{label}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-2">
            <div
              className={`${colorClass} h-2 rounded-full transition-all`}
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <div className="w-8 text-xs text-gray-500 text-right shrink-0">{count}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ id, title, icon: Icon }: { id: string; title: string; icon: React.ElementType }) {
  return (
    <div id={id} className="flex items-center gap-2 mb-4 pt-2">
      <Icon size={18} className="text-green-600" />
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
    </div>
  )
}

function StatCard({
  label, value, sub, color = 'text-gray-900', small = false,
}: {
  label: string; value: string | number; sub?: string; color?: string; small?: boolean
}) {
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`font-bold ${small ? 'text-2xl' : 'text-3xl'} ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Card>
  )
}

function TrialDays({ end }: { end: string | null }) {
  if (!end) return <span className="text-gray-400">—</span>
  const days = Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return <span className="text-xs text-gray-400">Expired</span>
  const cls = days <= 2 ? 'text-red-600 font-semibold' : days <= 7 ? 'text-amber-600 font-medium' : 'text-gray-700'
  return <span className={`text-xs ${cls}`}>{days}d left</span>
}

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-gray-400">—</span>
  const colors: Record<string, string> = {
    starter: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    business: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colors[plan] ?? 'bg-gray-100 text-gray-600'}`}>
      {plan}
    </span>
  )
}

function StatusBadge({ profile }: { profile: Profile }) {
  if (!profile.active) return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Inactive</span>
  if (profile.stripe_subscription_id) return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>
  if (profile.trial_end && new Date(profile.trial_end) > new Date()) return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Trial</span>
  return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Expired</span>
}

// ─── Section: MRR / ARR hero ─────────────────────────────────────────────────

function HeroRevenue({ stats }: { stats: AdminStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="bg-green-600 rounded-2xl p-6 text-white">
        <p className="text-green-100 text-sm mb-1">Monthly Recurring Revenue</p>
        <p className="text-5xl font-bold">€{stats.mrr.toLocaleString()}</p>
        <p className="text-green-200 text-xs mt-2">{stats.activeSubscriptions} paid subscriber{stats.activeSubscriptions !== 1 ? 's' : ''}</p>
      </div>
      <div className="bg-gray-800 rounded-2xl p-6 text-white">
        <p className="text-gray-400 text-sm mb-1">Annual Recurring Revenue</p>
        <p className="text-5xl font-bold">€{stats.arr.toLocaleString()}</p>
        <p className="text-gray-500 text-xs mt-2">MRR × 12</p>
      </div>
    </div>
  )
}

// ─── Section: Customer Metrics ───────────────────────────────────────────────

function MetricsSection({ stats }: { stats: AdminStats }) {
  return (
    <div className="space-y-4">
      <SectionHeader id="metrics" title="Customer Metrics" icon={Users} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total signups" value={stats.total} sub="All time" />
        <StatCard label="Signups this month" value={stats.signupsThisMonth} small />
        <StatCard label="Active free trials" value={stats.activeTrials} />
        <StatCard
          label="Expiring in 7 days"
          value={stats.expiringSoon.length}
          color={stats.expiringSoon.length > 0 ? 'text-amber-600' : 'text-gray-900'}
        />
        <StatCard label="Paid subscribers" value={stats.activeSubscriptions} color="text-green-600" />
        <StatCard
          label="Conversion rate"
          value={`${stats.conversionRate}%`}
          sub="Trial → paid"
          small
        />
        <StatCard label="Churn this month" value={stats.churnThisMonth} small />
        <StatCard
          label="Ghost signups"
          value={stats.ghostSignups}
          sub="Active trial, no POS"
          color={stats.ghostSignups > 0 ? 'text-amber-600' : 'text-gray-900'}
          small
        />
      </div>

      {/* Plan breakdown */}
      <Card>
        <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Paid subscribers by plan</p>
        <div className="grid grid-cols-3 gap-4">
          {(['starter', 'pro', 'business'] as const).map((plan) => (
            <div key={plan} className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.paidByPlan[plan] ?? 0}</p>
              <p className="text-xs text-gray-500 capitalize mt-0.5">{plan}</p>
              <p className="text-xs text-gray-400">€{((stats.paidByPlan[plan] ?? 0) * PLAN_PRICES[plan]).toLocaleString()}/mo</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Section: Trial Health ────────────────────────────────────────────────────

function TrialHealthSection({
  stats,
  onExtend,
}: {
  stats: AdminStats
  onExtend: (id: string, name: string) => void
}) {
  const trials = stats.expiringSoon.length > 0 ? stats.expiringSoon : []
  return (
    <div className="space-y-4">
      <SectionHeader id="trials" title="Trial Health" icon={Clock} />

      {stats.expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{stats.expiringSoon.length} trial{stats.expiringSoon.length !== 1 ? 's' : ''}</strong> expire within 7 days
          </p>
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Business', 'Plan', 'Trial ends', 'POS', 'Flags', 'Action'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.expiringSoon.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No trials expiring in the next 7 days
                  </td>
                </tr>
              ) : (
                trials.map((p: Profile) => {
                  const isGhost = !p.pos_merchant_id
                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 text-xs">{p.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">{p.restaurant_name || '—'}</td>
                      <td className="px-4 py-3"><PlanBadge plan={p.plan} /></td>
                      <td className="px-4 py-3"><TrialDays end={p.trial_end} /></td>
                      <td className="px-4 py-3 text-xs text-gray-600 capitalize">{p.pos_type || '—'}</td>
                      <td className="px-4 py-3">
                        {isGhost
                          ? <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><BadgeAlert size={10} /> No POS</span>
                          : <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full"><CheckCircle size={10} /> Connected</span>}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => onExtend(p.id, p.restaurant_name || p.email)}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Extend trial
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Section: Revenue ─────────────────────────────────────────────────────────

function RevenueSection({ stats }: { stats: AdminStats }) {
  const planItems = (['starter', 'pro', 'business'] as const).map((plan) => ({
    label: `${plan} (€${PLAN_PRICES[plan]}/mo)`,
    count: (stats.paidByPlan[plan] ?? 0) * PLAN_PRICES[plan],
  })).filter((i) => i.count > 0)

  return (
    <div className="space-y-4">
      <SectionHeader id="revenue" title="Revenue" icon={DollarSign} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wide">MRR by plan</p>
          {planItems.length === 0
            ? <p className="text-sm text-gray-400">No paid subscribers yet</p>
            : <HorizBars items={planItems} colorClass="bg-green-500" />}
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wide">Subscribers by plan</p>
          <div className="space-y-3">
            {(['starter', 'pro', 'business'] as const).map((plan, i) => (
              <div key={plan} className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${PLAN_COLORS[plan]}`} />
                <span className="text-sm capitalize text-gray-700 w-20">{plan}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`${PLAN_COLORS[plan]} h-2 rounded-full`}
                    style={{ width: `${stats.activeSubscriptions > 0 ? ((stats.paidByPlan[plan] ?? 0) / stats.activeSubscriptions) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-4 text-right">{stats.paidByPlan[plan] ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total MRR</span>
              <span className="font-semibold text-green-600">€{stats.mrr}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">Total ARR</span>
              <span className="font-semibold text-gray-900">€{stats.arr.toLocaleString()}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Section: Usage & Engagement ─────────────────────────────────────────────

function UsageSection() {
  const [railway, setRailway] = useState<RailwayStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/railway-stats')
      .then((r) => r.json())
      .then((d: RailwayStats) => setRailway(d))
      .catch(() => setRailway({ status: 'error' }))
      .finally(() => setLoading(false))
  }, [])

  const fmt = (n?: number) => (loading ? '—' : n != null ? n.toLocaleString() : '—')

  return (
    <div className="space-y-4">
      <SectionHeader id="usage" title="Usage & Engagement" icon={Activity} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total messages all time" value={fmt(railway?.total_messages_all_time)} small />
        <StatCard label="Messages last 7 days" value={fmt(railway?.messages_last_7_days)} small />
        <StatCard label="Messages last 30 days" value={fmt(railway?.messages_last_30_days)} small />
      </div>
      <Card>
        <p className="text-sm font-semibold text-gray-700 mb-3">Most active clients (last 30 days)</p>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : !railway?.top_clients?.length ? (
          <p className="text-sm text-gray-400">No data yet — messages will appear here once clients start chatting.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {railway.top_clients.map((c, i) => (
              <li key={i} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-gray-800">{c.name}</span>
                <span className="text-sm font-semibold text-green-700">{c.messages.toLocaleString()} msgs</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

// ─── Section: Operations ─────────────────────────────────────────────────────

function OperationsSection() {
  const [railway, setRailway] = useState<RailwayStats | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/railway-stats')
      .then((r) => r.json())
      .then((d: RailwayStats) => setRailway(d))
      .catch(() => setRailway({ status: 'error', error: 'Unreachable' }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const online = railway?.status === 'ok'

  return (
    <div className="space-y-4">
      <SectionHeader id="ops" title="Operations" icon={Wifi} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <div className="flex items-center gap-2 mb-2">
            {loading
              ? <RefreshCw size={16} className="text-gray-400 animate-spin" />
              : online
              ? <Wifi size={16} className="text-green-600" />
              : <WifiOff size={16} className="text-red-500" />}
            <p className="text-xs text-gray-500">Railway Bot</p>
          </div>
          <p className={`text-sm font-semibold ${loading ? 'text-gray-400' : online ? 'text-green-600' : 'text-red-600'}`}>
            {loading ? 'Checking…' : online ? 'Online' : 'Offline'}
          </p>
        </Card>

        <Card>
          <p className="text-xs text-gray-500 mb-1">Active clients (Railway)</p>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '—' : railway?.active_clients ?? '—'}
          </p>
        </Card>

        <Card>
          <p className="text-xs text-gray-500 mb-1">Active numbers</p>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '—' : railway?.active_numbers ?? '—'}
          </p>
        </Card>

        <Card>
          <p className="text-xs text-gray-500 mb-1">On trial (Railway)</p>
          <p className="text-3xl font-bold text-gray-900">
            {loading ? '—' : railway?.on_trial ?? '—'}
          </p>
        </Card>
      </div>

      {railway?.error && !online && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <WifiOff size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{railway.error}</p>
          <button onClick={load} className="ml-auto text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Section: Marketing ───────────────────────────────────────────────────────

function MarketingSection({
  signupsPerDay,
  utmBreakdown,
}: {
  signupsPerDay: Array<{ date: string; count: number }>
  utmBreakdown: Array<{ source: string; count: number }>
}) {
  const totalSignups = signupsPerDay.reduce((s, d) => s + d.count, 0)
  const peak = Math.max(...signupsPerDay.map((d) => d.count), 1)
  const peakDay = signupsPerDay.find((d) => d.count === peak)

  return (
    <div className="space-y-4">
      <SectionHeader id="marketing" title="Marketing" icon={Globe} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Signups per day — last 30 days</p>
            <span className="text-xs text-gray-400">{totalSignups} total</span>
          </div>
          {peakDay && peakDay.count > 0 && (
            <p className="text-xs text-gray-400 mb-3">Peak: {peakDay.date.slice(5)} ({peak})</p>
          )}
          <VerticalBarChart data={signupsPerDay} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{signupsPerDay[0]?.date.slice(5)}</span>
            <span>Today</span>
          </div>
        </Card>

        <Card>
          <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wide">Signups by source</p>
          {utmBreakdown.length === 0
            ? <p className="text-sm text-gray-400">No data yet — UTM tracking requires the migration to be pushed.</p>
            : <HorizBars items={utmBreakdown.map((u) => ({ label: u.source, count: u.count }))} colorClass="bg-blue-500" />}
        </Card>
      </div>
    </div>
  )
}

// ─── Section: POS Breakdown ───────────────────────────────────────────────────

function PosSection({
  posBreakdown,
}: {
  posBreakdown: Array<{ name: string; count: number }>
}) {
  return (
    <div className="space-y-4">
      <SectionHeader id="pos" title="POS Breakdown" icon={Smartphone} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wide">Clients by POS type</p>
          {posBreakdown.length === 0
            ? <p className="text-sm text-gray-400">No data yet</p>
            : <HorizBars
                items={posBreakdown.map((p) => ({ label: p.name, count: p.count }))}
                colorClass="bg-green-500"
              />}
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wide">Distribution</p>
          {posBreakdown.length === 0
            ? <p className="text-sm text-gray-400">No data yet</p>
            : posBreakdown.map((p, i) => {
                const total = posBreakdown.reduce((s, d) => s + d.count, 0)
                const pct = total > 0 ? Math.round((p.count / total) * 100) : 0
                return (
                  <div key={p.name} className="flex items-center gap-3 mb-3 last:mb-0">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${POS_COLORS[i % POS_COLORS.length]}`} />
                    <span className="text-sm capitalize text-gray-700 flex-1">{p.name}</span>
                    <span className="text-sm font-medium text-gray-900">{p.count}</span>
                    <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                  </div>
                )
              })}
        </Card>
      </div>
    </div>
  )
}

// ─── Section: All Clients ─────────────────────────────────────────────────────

function ClientsSection({
  profiles,
  onExtend,
  onToggleActive,
}: {
  profiles: Profile[]
  onExtend: (id: string, name: string) => void
  onToggleActive: (id: string, current: boolean) => void
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'trial' | 'paid' | 'expired' | 'inactive'>('all')

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch =
      p.email.toLowerCase().includes(q) ||
      (p.full_name ?? '').toLowerCase().includes(q) ||
      (p.restaurant_name ?? '').toLowerCase().includes(q)

    const now = new Date()
    const onTrial = !p.stripe_subscription_id && p.trial_end && new Date(p.trial_end) > now && p.active
    const paid = !!p.stripe_subscription_id && p.active
    const expired = !p.stripe_subscription_id && p.trial_end && new Date(p.trial_end) <= now
    const inactive = !p.active

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'trial' && onTrial) ||
      (statusFilter === 'paid' && paid) ||
      (statusFilter === 'expired' && expired) ||
      (statusFilter === 'inactive' && inactive)

    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-4">
      <SectionHeader id="clients" title="All Clients" icon={Users} />
      <Card className="!p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or business…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'trial', 'paid', 'expired', 'inactive'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${statusFilter === f ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Name', 'Business', 'POS', 'Plan', 'Status', 'Trial End', 'Signed Up', 'UTM', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No clients match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p: Profile) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 text-xs">{p.full_name || '—'}</p>
                      <p className="text-xs text-gray-400">{p.email}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{p.restaurant_name || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 capitalize">{p.pos_type || '—'}</td>
                    <td className="px-4 py-3"><PlanBadge plan={p.plan} /></td>
                    <td className="px-4 py-3"><StatusBadge profile={p} /></td>
                    <td className="px-4 py-3">
                      <TrialDays end={p.trial_end} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{p.utm_source || <Minus size={12} className="text-gray-300" />}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onExtend(p.id, p.restaurant_name || p.email)}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Extend
                        </button>
                        <button
                          onClick={() => onToggleActive(p.id, p.active)}
                          className={`text-xs px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                            p.active ? 'bg-red-50 hover:bg-red-100 text-red-700' : 'bg-green-50 hover:bg-green-100 text-green-700'
                          }`}
                        >
                          {p.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} of {profiles.length} clients
        </div>
      </Card>
    </div>
  )
}

// ─── Extend Trial Modal ───────────────────────────────────────────────────────

function ExtendModal({
  target,
  onClose,
  onSuccess,
}: {
  target: { id: string; name: string } | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [days, setDays] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!target) { setDays(''); setReason(''); setError('') }
  }, [target])

  if (!target) return null

  async function submit() {
    if (!days) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/extend-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: target!.id, days: parseInt(days), reason }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error) } else { onSuccess() }
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Extend Trial</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        <p className="text-sm text-gray-600 mb-5">Extending trial for <strong>{target.name}</strong></p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Days to extend</label>
            <input
              type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)}
              placeholder="e.g. 7"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <input
              type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Technical issue during setup"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button
              onClick={submit} disabled={loading || !days}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? 'Extending…' : 'Extend Trial'}
            </button>
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section nav ──────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: 'metrics', label: 'Metrics' },
  { id: 'trials', label: 'Trials' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'usage', label: 'Usage' },
  { id: 'ops', label: 'Ops' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'pos', label: 'POS' },
  { id: 'clients', label: 'Clients' },
]

// ─── Root component ───────────────────────────────────────────────────────────

export default function AdminClient({ profiles, stats, signupsPerDay, posBreakdown, utmBreakdown }: Props) {
  const router = useRouter()
  const [extendTarget, setExtendTarget] = useState<{ id: string; name: string } | null>(null)
  const [toast, setToast] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const refreshTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // Auto-refresh every 5 minutes
  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      router.refresh()
      setLastRefresh(new Date())
    }, 5 * 60 * 1000)
    return () => clearInterval(refreshTimer.current)
  }, [router])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  async function handleToggleActive(profileId: string, currentActive: boolean) {
    try {
      const res = await fetch('/api/admin/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (data.error) { showToast('Error: ' + data.error) }
      else { showToast(`Account ${currentActive ? 'deactivated' : 'activated'}`); router.refresh() }
    } catch { showToast('Network error') }
  }

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Founder Dashboard</h1>
            <p className="text-xs text-gray-400">Last refreshed {formatTime(lastRefresh)} · Auto-refreshes every 5 min</p>
          </div>
          <button
            onClick={() => { router.refresh(); setLastRefresh(new Date()) }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Section nav */}
        <div className="max-w-7xl mx-auto px-4 pb-0 overflow-x-auto">
          <div className="flex gap-1 pb-0">
            {NAV_ITEMS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-xs text-gray-500 hover:text-green-700 hover:bg-green-50 px-3 py-2 rounded-t-lg transition-colors whitespace-nowrap flex items-center gap-1"
              >
                {label} <ChevronRight size={10} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">
        <HeroRevenue stats={stats} />
        <MetricsSection stats={stats} />
        <TrialHealthSection stats={stats} onExtend={(id, name) => setExtendTarget({ id, name })} />
        <RevenueSection stats={stats} />
        <UsageSection />
        <OperationsSection />
        <MarketingSection signupsPerDay={signupsPerDay} utmBreakdown={utmBreakdown} />
        <PosSection posBreakdown={posBreakdown} />
        <ClientsSection
          profiles={profiles}
          onExtend={(id, name) => setExtendTarget({ id, name })}
          onToggleActive={handleToggleActive}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3">
          {toast}
          <button onClick={() => setToast('')}><X size={14} /></button>
        </div>
      )}

      {/* Extend modal */}
      <ExtendModal
        target={extendTarget}
        onClose={() => setExtendTarget(null)}
        onSuccess={() => {
          showToast(`Trial extended`)
          setExtendTarget(null)
          router.refresh()
        }}
      />
    </div>
  )
}
