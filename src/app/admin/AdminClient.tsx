'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, TrendingUp, CreditCard, XCircle, X, Search,
  AlertTriangle, Clock, Wifi, WifiOff, RefreshCw,
  Activity, Globe, Smartphone, DollarSign, BarChart2,
  ChevronRight, BadgeAlert, CheckCircle, Minus,
  MessageSquareWarning, Zap, ClipboardCopy,
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

interface HealthCheck {
  status: 'ok' | 'error'
  message: string
}

interface HealthData {
  status: 'ok' | 'degraded' | 'down'
  checks: Record<string, HealthCheck>
  timestamp?: string
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
  if (profile.deactivated_at) {
    const daysLeft = profile.scheduled_deletion_at
      ? Math.max(0, Math.ceil((new Date(profile.scheduled_deletion_at).getTime() - Date.now()) / 86_400_000))
      : null
    return (
      <span className="inline-flex flex-col gap-0.5">
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Deactivated</span>
        {daysLeft !== null && <span className="text-xs text-gray-400">{daysLeft}d until purge</span>}
      </span>
    )
  }
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

// ─── Health check label map ───────────────────────────────────────────────────

const HEALTH_LABELS: Record<string, string> = {
  database:   'Database',
  clover_api: 'Clover API',
  square_api: 'Square API',
  twilio:     'Twilio',
  anthropic:  'Anthropic',
  sendgrid:   'SendGrid',
  scheduler:  'Scheduler',
}

const CHECK_ORDER = ['database', 'scheduler', 'clover_api', 'square_api', 'twilio', 'anthropic', 'sendgrid']

// ─── Section: Operations ─────────────────────────────────────────────────────

function OperationsSection({ onPriceChange }: { onPriceChange: () => void }) {
  const [railway, setRailway] = useState<RailwayStats | null>(null)
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingHealth, setLoadingHealth] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const loadStats = useCallback(() => {
    setLoadingStats(true)
    fetch('/api/admin/railway-stats')
      .then((r) => r.json())
      .then((d: RailwayStats) => setRailway(d))
      .catch(() => setRailway({ status: 'error', error: 'Unreachable' }))
      .finally(() => setLoadingStats(false))
  }, [])

  const loadHealth = useCallback(() => {
    setLoadingHealth(true)
    fetch('/api/admin/health')
      .then((r) => r.json())
      .then((d: HealthData) => { setHealth(d); setLastChecked(new Date()) })
      .catch(() => setHealth({ status: 'down', checks: {}, error: 'Unreachable' }))
      .finally(() => setLoadingHealth(false))
  }, [])

  const loadAll = useCallback(() => { loadStats(); loadHealth() }, [loadStats, loadHealth])

  useEffect(() => {
    loadAll()
    const interval = setInterval(loadHealth, 60_000) // auto-refresh health every 60 s
    return () => clearInterval(interval)
  }, [loadAll, loadHealth])

  const online = railway?.status === 'ok'
  const loading = loadingStats || loadingHealth

  const overallColor =
    health?.status === 'ok' ? 'text-green-600' :
    health?.status === 'degraded' ? 'text-amber-500' :
    'text-red-600'

  const overallBg =
    health?.status === 'ok' ? 'bg-green-50 border-green-200' :
    health?.status === 'degraded' ? 'bg-amber-50 border-amber-200' :
    'bg-red-50 border-red-200'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader id="ops" title="Operations" icon={Wifi} />
        <button
          onClick={onPriceChange}
          className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <DollarSign size={14} />
          Price Change Notification
        </button>
      </div>

      {/* Railway counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <div className="flex items-center gap-2 mb-2">
            {loadingStats
              ? <RefreshCw size={16} className="text-gray-400 animate-spin" />
              : online
              ? <Wifi size={16} className="text-green-600" />
              : <WifiOff size={16} className="text-red-500" />}
            <p className="text-xs text-gray-500">Railway Bot</p>
          </div>
          <p className={`text-sm font-semibold ${loadingStats ? 'text-gray-400' : online ? 'text-green-600' : 'text-red-600'}`}>
            {loadingStats ? 'Checking…' : online ? 'Online' : 'Offline'}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Active clients (Railway)</p>
          <p className="text-3xl font-bold text-gray-900">{loadingStats ? '—' : railway?.active_clients ?? '—'}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">Active numbers</p>
          <p className="text-3xl font-bold text-gray-900">{loadingStats ? '—' : railway?.active_numbers ?? '—'}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500 mb-1">On trial (Railway)</p>
          <p className="text-3xl font-bold text-gray-900">{loadingStats ? '—' : railway?.on_trial ?? '—'}</p>
        </Card>
      </div>

      {/* System health checks */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={15} className="text-gray-400" />
            <p className="text-sm font-semibold text-gray-900">System health</p>
            {!loadingHealth && health && (
              <span className={`text-xs font-semibold capitalize px-2 py-0.5 rounded-full border ${overallBg} ${overallColor}`}>
                {health.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastChecked && (
              <span className="text-xs text-gray-400">
                {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={loadAll}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {CHECK_ORDER.map((key) => {
            const check = health?.checks[key]
            const isOk = check?.status === 'ok'
            const isLoading = loadingHealth && !health

            return (
              <div
                key={key}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 text-sm
                  ${isLoading ? 'bg-gray-50 border-gray-100' :
                    isOk ? 'bg-green-50 border-green-100' :
                    check ? 'bg-red-50 border-red-100' :
                    'bg-gray-50 border-gray-100'}`}
              >
                <div className="mt-0.5 shrink-0">
                  {isLoading || !check ? (
                    <Minus size={14} className="text-gray-300" />
                  ) : isOk ? (
                    <CheckCircle size={14} className="text-green-500" />
                  ) : (
                    <AlertTriangle size={14} className="text-red-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 leading-tight">
                    {HEALTH_LABELS[key] ?? key}
                  </p>
                  <p className={`text-xs mt-0.5 truncate
                    ${isLoading || !check ? 'text-gray-400' :
                      isOk ? 'text-green-700' : 'text-red-600'}`}
                    title={check?.message}
                  >
                    {isLoading || !check ? 'Checking…' : check.message}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {health?.error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
            <WifiOff size={12} />
            <span>{health.error}</span>
          </div>
        )}
      </Card>

      {railway?.error && !online && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <WifiOff size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{railway.error}</p>
          <button onClick={loadAll} className="ml-auto text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
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
  onDeactivate,
  onReactivate,
}: {
  profiles: Profile[]
  onExtend: (id: string, name: string) => void
  onDeactivate: (id: string, name: string, email: string) => void
  onReactivate: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'trial' | 'paid' | 'expired' | 'inactive' | 'deactivated'>('all')

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch =
      p.email.toLowerCase().includes(q) ||
      (p.full_name ?? '').toLowerCase().includes(q) ||
      (p.restaurant_name ?? '').toLowerCase().includes(q)

    const now = new Date()
    const deactivated = !!p.deactivated_at
    const onTrial = !p.stripe_subscription_id && p.trial_end && new Date(p.trial_end) > now && p.active && !deactivated
    const paid = !!p.stripe_subscription_id && p.active && !deactivated
    const expired = !p.stripe_subscription_id && p.trial_end && new Date(p.trial_end) <= now && !deactivated
    const inactive = !p.active && !deactivated

    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'trial' && onTrial) ||
      (statusFilter === 'paid' && paid) ||
      (statusFilter === 'expired' && expired) ||
      (statusFilter === 'inactive' && inactive) ||
      (statusFilter === 'deactivated' && deactivated)

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
            {(['all', 'trial', 'paid', 'expired', 'inactive', 'deactivated'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${statusFilter === f ? (f === 'deactivated' ? 'bg-red-600 text-white' : 'bg-green-600 text-white') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
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
                        {p.email !== 'daniel@tilltalk.ie' && (
                          !p.active ? (
                            <button
                              onClick={() => onReactivate(p.id)}
                              className="text-xs px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap bg-green-50 hover:bg-green-100 text-green-700"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => onDeactivate(p.id, p.restaurant_name || p.full_name || p.email, p.email)}
                              className="text-xs px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap bg-red-50 hover:bg-red-100 text-red-700"
                            >
                              Deactivate
                            </button>
                          )
                        )}
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

// ─── Price Change Modal ───────────────────────────────────────────────────────

function PriceChangeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [plan, setPlan]           = useState('pro')
  const [oldPrice, setOldPrice]   = useState('')
  const [newPrice, setNewPrice]   = useState('')
  const [effDate, setEffDate]     = useState('')
  const [message, setMessage]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<{ sent: number; failed: number } | null>(null)
  const [error, setError]         = useState('')

  function reset() { setOldPrice(''); setNewPrice(''); setEffDate(''); setMessage(''); setResult(null); setError('') }
  function handleClose() { reset(); onClose() }

  async function submit() {
    if (!oldPrice || !newPrice || !effDate) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch('/api/admin/price-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, old_price: parseFloat(oldPrice), new_price: parseFloat(newPrice), effective_date: effDate, message }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error) } else { setResult({ sent: data.sent, failed: data.failed ?? 0 }) }
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  if (!open) return null

  const inputCls = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Price Change Notification</h3>
          <button onClick={handleClose}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-4 text-center">
              <p className="text-2xl font-bold text-green-700">{result.sent}</p>
              <p className="text-sm text-green-600 mt-1">email{result.sent !== 1 ? 's' : ''} sent</p>
              {result.failed > 0 && <p className="text-xs text-red-500 mt-1">{result.failed} failed</p>}
            </div>
            <button onClick={handleClose} className="w-full border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm">Close</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className={inputCls}>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current price (€/mo)</label>
                <input type="number" min="0" step="0.01" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} placeholder="49" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New price (€/mo)</label>
                <input type="number" min="0" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="59" className={inputCls} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective date</label>
              <input type="text" value={effDate} onChange={(e) => setEffDate(e.target.value)} placeholder="1 June 2026" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Optional message</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Any extra context for subscribers…" className={`${inputCls} resize-none`} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={submit}
                disabled={loading || !oldPrice || !newPrice || !effDate}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? 'Sending…' : 'Send notifications'}
              </button>
              <button onClick={handleClose} className="flex-1 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm">Cancel</button>
            </div>
          </div>
        )}
      </div>
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

// ─── Section: Failed Queries ──────────────────────────────────────────────────

interface FailedQuery {
  id: number
  client_id: number
  client_name: string
  phone_number: string | null
  original_query: string
  original_response: string | null
  retry_response: string | null
  created_at: string
}

function FailedQueriesSection() {
  const [queries, setQueries] = useState<FailedQuery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysing, setAnalysing] = useState<Record<number, boolean>>({})
  const [analyses, setAnalyses] = useState<Record<number, string>>({})
  const [copied, setCopied] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetch('/api/admin/failed-queries')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error)
        else setQueries(d.queries ?? [])
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  async function handleAnalyse(q: FailedQuery) {
    setAnalysing((p) => ({ ...p, [q.id]: true }))
    try {
      const res = await fetch('/api/admin/analyse-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuery: q.original_query,
          originalResponse: q.original_response,
          retryResponse: q.retry_response,
          clientName: q.client_name,
        }),
      })
      const data = await res.json()
      setAnalyses((p) => ({ ...p, [q.id]: data.analysis ?? data.error ?? 'No analysis returned' }))
    } catch {
      setAnalyses((p) => ({ ...p, [q.id]: 'Request failed — check console' }))
    } finally {
      setAnalysing((p) => ({ ...p, [q.id]: false }))
    }
  }

  function buildClaudePrompt(q: FailedQuery, analysis: string): string {
    return `# TillTalk Bot Fix — Failed Query

## Context
Client: ${q.client_name}
Timestamp: ${new Date(q.created_at).toLocaleString('en-IE')}

## Failed Interaction
**Original query:** ${q.original_query}

**Original response (Haiku):**
${q.original_response ?? '(none)'}

**Retry response (Sonnet):**
${q.retry_response ?? '(none)'}

## Opus Analysis
${analysis}

## Task
Implement the fix described above in the TillTalk bot codebase. Make the minimum necessary change to resolve this failure class. Commit and push when done.`
  }

  function handleCopy(q: FailedQuery) {
    const analysis = analyses[q.id] ?? ''
    const prompt = buildClaudePrompt(q, analysis)
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied((p) => ({ ...p, [q.id]: true }))
      setTimeout(() => setCopied((p) => ({ ...p, [q.id]: false })), 2000)
    })
  }

  return (
    <div className="space-y-4">
      <SectionHeader id="failed-queries" title="Failed Queries" icon={MessageSquareWarning} />

      {loading && (
        <Card>
          <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
        </Card>
      )}

      {error && (
        <Card>
          <p className="text-sm text-red-500 text-center py-4">{error}</p>
        </Card>
      )}

      {!loading && !error && queries.length === 0 && (
        <Card>
          <p className="text-sm text-gray-400 text-center py-6">No failed queries yet. 🎉</p>
        </Card>
      )}

      {queries.map((q) => (
        <Card key={q.id} className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{q.client_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(q.created_at).toLocaleString('en-IE', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <button
              onClick={() => handleAnalyse(q)}
              disabled={analysing[q.id]}
              className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <Zap size={12} />
              {analysing[q.id] ? 'Analysing…' : 'Analyse & Fix'}
            </button>
          </div>

          {/* Query / responses */}
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Original query</p>
              <p className="text-gray-800 bg-gray-50 rounded-lg px-3 py-2">{q.original_query}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Haiku response</p>
              <p className="text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap text-xs">
                {q.original_response ?? <span className="italic text-gray-400">None recorded</span>}
              </p>
            </div>
            {q.retry_response && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Sonnet retry</p>
                <p className="text-gray-600 bg-blue-50 rounded-lg px-3 py-2 whitespace-pre-wrap text-xs">
                  {q.retry_response}
                </p>
              </div>
            )}
          </div>

          {/* Opus analysis */}
          {analyses[q.id] && (
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Opus Analysis</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap bg-purple-50 rounded-lg px-3 py-2">
                {analyses[q.id]}
              </p>
              <button
                onClick={() => handleCopy(q)}
                className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <ClipboardCopy size={12} />
                {copied[q.id] ? 'Copied!' : 'Approve Fix — Copy as Claude Code Prompt'}
              </button>
            </div>
          )}
        </Card>
      ))}
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
  { id: 'failed-queries', label: 'Quality' },
]

// ─── Root component ───────────────────────────────────────────────────────────

export default function AdminClient({ profiles, stats, signupsPerDay, posBreakdown, utmBreakdown }: Props) {
  const router = useRouter()
  const [extendTarget,     setExtendTarget]     = useState<{ id: string; name: string } | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string; email: string } | null>(null)
  const [showPriceChange,  setShowPriceChange]  = useState(false)
  const [toast,            setToast]            = useState('')
  const [lastRefresh,      setLastRefresh]      = useState<Date>(new Date())
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

  async function handleDeactivateConfirm(profileId: string) {
    try {
      const res = await fetch('/api/admin/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (data.error) { showToast('Error: ' + data.error) }
      else { showToast('Account deactivated — data retained for 7 days'); router.refresh() }
    } catch { showToast('Network error') }
  }

  async function handleReactivate(profileId: string) {
    try {
      const res = await fetch('/api/admin/toggle-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      })
      const data = await res.json()
      if (data.error) { showToast('Error: ' + data.error) }
      else { showToast('Account reactivated'); router.refresh() }
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
        <OperationsSection onPriceChange={() => setShowPriceChange(true)} />
        <MarketingSection signupsPerDay={signupsPerDay} utmBreakdown={utmBreakdown} />
        <PosSection posBreakdown={posBreakdown} />
        <ClientsSection
          profiles={profiles}
          onExtend={(id, name) => setExtendTarget({ id, name })}
          onDeactivate={(id, name, email) => setDeactivateTarget({ id, name, email })}
          onReactivate={handleReactivate}
        />
        <FailedQueriesSection />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3">
          {toast}
          <button onClick={() => setToast('')}><X size={14} /></button>
        </div>
      )}

      {/* Price change modal */}
      <PriceChangeModal open={showPriceChange} onClose={() => setShowPriceChange(false)} />

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

      {/* Deactivate confirmation modal */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-amber-600" />
              </div>
              <button onClick={() => setDeactivateTarget(null)} className="text-gray-400 hover:text-gray-600 mt-1">
                <X size={18} />
              </button>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Deactivate account?</h3>
            <p className="text-sm text-gray-600 mb-2">
              You are about to deactivate <strong>{deactivateTarget.name}</strong> ({deactivateTarget.email}).
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Their data will be <strong>retained for 7 days</strong> and can be fully restored by reactivating within that window. After 7 days, a cleanup job will permanently purge all their data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  const id = deactivateTarget.id
                  setDeactivateTarget(null)
                  await handleDeactivateConfirm(id)
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                Deactivate
              </button>
              <button
                onClick={() => setDeactivateTarget(null)}
                className="flex-1 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-200 px-4 py-2.5 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
