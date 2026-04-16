'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PLANS } from '@/lib/plans'
import {
  User, CreditCard, Shield, LogOut, CheckCircle2, AlertCircle,
  X, Bell, Calendar,
  LayoutDashboard, TrendingUp, TrendingDown, RefreshCw,
  MessageCircle, Settings, Zap, Download,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import ChatWidget from './ChatWidget'
import CalendarSection from './CalendarSection'
import ManageSection from './ManageSection'
import AnalyticsSection from './AnalyticsSection'
import NotesSection from './NotesSection'
import QueryChat from './QueryChat'
import SubscriptionTab from './SubscriptionTab'
import AccountTab from './AccountTab'

declare global {
  interface Window { Plotly: PlotlyInstance }
}
interface PlotlyInstance {
  newPlot: (el: HTMLElement, data: unknown[], layout: unknown, config?: unknown) => void
  purge: (el: HTMLElement) => void
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string
  email: string
  full_name?: string | null
  restaurant_name?: string | null
  pos_type?: string | null
  pos_merchant_id?: string | null
  whatsapp_number?: string | null
  plan?: string | null
  trial_start?: string | null
  trial_end?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  active?: boolean
  created_at?: string
  pos_address_street?: string | null
  pos_address_city?: string | null
  pos_address_country?: string | null
  pos_api_key_set?: boolean
  pos_api_secret_set?: boolean
}

interface SalesData {
  today: { revenue: number; transactions: number; cash: number; card: number }
  week: { revenue: number; vs_last_week: number | null }
  chart: { label: string; revenue: number }[]
  top_items: { name: string; revenue: number; qty: number }[]
}

interface ReminderItem { id: number; text: string; remind_at: string }
interface NoteItem    { id: number; note_text: string; created_at: string }
interface LocationItem { id: number; nickname: string; address: string | null }

interface Props {
  user: SupabaseUser
  profile: Profile | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTrialDaysLeft(trialEnd: string | null | undefined): number {
  if (!trialEnd) return 0
  return Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / 86_400_000))
}

function fmt(n: number) {
  return `€${n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtShort(n: number) {
  return `€${n.toLocaleString('en-IE', { maximumFractionDigits: 0 })}`
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mobile bottom nav
// ---------------------------------------------------------------------------

// Top-level tabs
const TAB_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard'    },
  { id: 'analytics',   label: 'Analytics'    },
  { id: 'subscription', label: 'Subscription' },
  { id: 'account',     label: 'Account'      },
] as const
type TabId = typeof TAB_ITEMS[number]['id']

// Bottom-nav sections within the Dashboard tab
const NAV_ITEMS = [
  { id: 'overview', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar',  Icon: Calendar },
  { id: 'notes',    label: 'Notes',     Icon: Bell },
  { id: 'manage',   label: 'Manage',    Icon: Settings },
  { id: 'account',  label: 'Account',   Icon: User },
] as const

type SectionId = typeof NAV_ITEMS[number]['id']

function MobileBottomNav({ active, onNav }: { active: SectionId; onNav: (id: SectionId) => void }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-inset-bottom">
      <div className="flex">
        {NAV_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => onNav(id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 min-h-[56px] text-xs font-medium transition-colors ${
              active === id ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={20} className="mb-1" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  id, sectionRef, children, className = '',
}: {
  id: string
  sectionRef: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
  className?: string
}) {
  return (
    <div id={id} ref={sectionRef} className={`scroll-mt-20 space-y-4 ${className}`}>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

function CardHeader({
  icon: Icon, title, action,
}: {
  icon: React.ComponentType<{ size: number; className?: string }>
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
          <Icon size={18} className="text-green-600" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {action}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data & Privacy card (self-contained — owns the export state)
// ---------------------------------------------------------------------------

function DataPrivacyCard() {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      const res = await fetch('/api/export')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `Server error ${res.status}`)
      }
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      a.href     = url
      a.download = `tilltalk-data-export-${date}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed — please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader icon={Shield} title="Data &amp; Privacy" />
      <div className="space-y-2 mb-5">
        {[
          'Email address and full name',
          'Business name and POS system type',
          'WhatsApp number',
          'Plan and subscription status',
          'POS address and API credentials (encrypted at rest)',
          'Aggregated sales summaries for your reports (no raw transactions, no customer data)',
        ].map(item => (
          <div key={item} className="flex items-start gap-2">
            <CheckCircle2 className="text-green-400 shrink-0 mt-0.5" size={14} />
            <span className="text-sm text-gray-600">{item}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-lg transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting
            ? <RefreshCw size={14} className="animate-spin" />
            : <Download size={14} />}
          {exporting ? 'Preparing export…' : 'Export my data'}
        </button>

        <button
          onClick={() => alert('To request data deletion, please email privacy@tilltalk.ie with your account email. We will process your request within 30 days.')}
          className="text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors min-h-[44px]"
        >
          Request data deletion
        </button>
      </div>

      {exportError && (
        <div className="flex items-center gap-2 mt-3 text-sm text-red-600">
          <AlertCircle size={14} className="shrink-0" />
          {exportError}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Export downloads a JSON file with all data we hold for your account.
        Data deletion requests are processed within 30 days.
      </p>
    </Card>
  )
}


// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DashboardClient({ user, profile }: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  // Top-level tab
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')

  // Section refs (Dashboard tab)
  const overviewRef  = useRef<HTMLDivElement>(null)
  const calendarRef  = useRef<HTMLDivElement>(null)
  const notesRef     = useRef<HTMLDivElement>(null)
  const manageRef    = useRef<HTMLDivElement>(null)
  const accountRef   = useRef<HTMLDivElement>(null)
  const chartRef     = useRef<HTMLDivElement>(null)

  // Data state
  const [salesData,   setSalesData]   = useState<SalesData | null>(null)
  const [notesData,   setNotesData]   = useState<{ reminders: ReminderItem[]; notes: NoteItem[] }>({ reminders: [], notes: [] })
  const [locations,   setLocations]   = useState<LocationItem[]>([])
  const [salesLoading,  setSalesLoading]  = useState(true)
  const [notesLoading,  setNotesLoading]  = useState(true)
  const [plotlyLoaded,  setPlotlyLoaded]  = useState(false)
  const [refreshing,    setRefreshing]    = useState(false)

  // Profile editing
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [saveMsg,  setSaveMsg]  = useState('')
  const [editForm, setEditForm] = useState({
    fullName:       profile?.full_name          || '',
    restaurantName: profile?.restaurant_name    || '',
    whatsappNumber: profile?.whatsapp_number    || '',
    addressStreet:  profile?.pos_address_street  || '',
    addressCity:    profile?.pos_address_city    || '',
    addressCountry: profile?.pos_address_country || 'Ireland',
  })

  // Billing
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')
  const [billingLoading,  setBillingLoading]  = useState<string | null>(null) // plan key or 'portal'
  const [upgradedToast,   setUpgradedToast]   = useState(false)

  // Mobile nav
  const [activeSection, setActiveSection] = useState<SectionId>('overview')

  // Flag banner
  const [hasOpenFlags,     setHasOpenFlags]     = useState(false)
  const [flagBannerDismissed, setFlagBannerDismissed] = useState(false)

  const posType = (profile?.pos_type || '').toLowerCase()

  // ── Helpers ──────────────────────────────────────────────────────────────

  const trialDaysLeft = getTrialDaysLeft(profile?.trial_end)
  const isOnTrial     = !profile?.stripe_subscription_id
  const currentPlan   = (profile?.plan as keyof typeof PLANS) || 'starter'
  const planInfo      = PLANS[currentPlan]
  const trialProgress = profile?.trial_end && profile?.trial_start
    ? Math.max(0, Math.min(100,
        (Date.now() - new Date(profile.trial_start).getTime()) /
        (new Date(profile.trial_end).getTime() - new Date(profile.trial_start).getTime()) * 100
      ))
    : 0

  // ── Load Plotly CDN ───────────────────────────────────────────────────────

  useEffect(() => {
    if (window.Plotly) { setPlotlyLoaded(true); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.plot.ly/plotly-basic-2.35.2.min.js'
    s.async = true
    s.onload = () => setPlotlyLoaded(true)
    document.head.appendChild(s)
  }, [])

  // ── Render chart ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!plotlyLoaded || !chartRef.current || !salesData?.chart?.length) return
    const el = chartRef.current
    window.Plotly.purge(el)
    window.Plotly.newPlot(
      el,
      [{
        type: 'bar',
        x: salesData.chart.map(d => d.label),
        y: salesData.chart.map(d => d.revenue),
        marker: { color: '#16a34a', opacity: 0.9 },
        hovertemplate: '<b>%{x}</b><br>€%{y:,.2f}<extra></extra>',
      }],
      {
        paper_bgcolor: 'white',
        plot_bgcolor:  'white',
        margin: { l: 52, r: 12, t: 12, b: 68 },
        xaxis: {
          tickangle: -30,
          tickfont:  { size: 10, family: 'Inter, Arial, sans-serif' },
          showgrid:  false,
          linecolor: '#e5e7eb',
          linewidth: 1,
        },
        yaxis: {
          tickprefix: '€',
          tickfont:   { size: 10, family: 'Inter, Arial, sans-serif' },
          gridcolor:  '#f3f4f6',
          zeroline:   false,
        },
        font: { family: 'Inter, Arial, sans-serif', color: '#374151' },
      },
      { responsive: true, displayModeBar: false }
    )
  }, [plotlyLoaded, salesData])

  // ── Fetch data ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setSalesLoading(true)
    setNotesLoading(true)

    fetch('/api/dashboard/sales')
      .then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(d => { setSalesData(d); setSalesLoading(false) })

    fetch('/api/dashboard/notes')
      .then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(d => { setNotesData({ reminders: d?.reminders || [], notes: d?.notes || [] }); setNotesLoading(false) })

    fetch('/api/manage/locations')
      .then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(d => { setLocations((d?.locations ?? []).map((l: Record<string, unknown>) => ({ id: l.id, nickname: l.nickname, address: l.address ?? null }))) })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Check for open flags (non-fatal — banner is purely informational)
  useEffect(() => {
    fetch('/api/dashboard/flags')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.has_flags) setHasOpenFlags(true) })
      .catch(() => {})
  }, [])

  // Show toast if redirected back from Stripe with ?upgraded=true
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      setUpgradedToast(true)
      // Remove query param without re-render loop
      router.replace('/dashboard', { scroll: false })
      const t = setTimeout(() => setUpgradedToast(false), 5000)
      return () => clearTimeout(t)
    }
  }, [searchParams, router])

  async function handleCheckout(plan: string) {
    setBillingLoading(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval: billingInterval }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // silently fail — user stays on page
    } finally {
      setBillingLoading(null)
    }
  }

  async function handlePortal() {
    setBillingLoading('portal')
    try {
      const res  = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      // silently fail
    } finally {
      setBillingLoading(null)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // ── Nav scroll ───────────────────────────────────────────────────────────

  function navTo(id: SectionId) {
    setActiveSection(id)
    const ref = { overview: overviewRef, calendar: calendarRef, notes: notesRef, manage: manageRef, account: accountRef }[id]
    ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Profile save ─────────────────────────────────────────────────────────

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({
      full_name:           editForm.fullName,
      restaurant_name:     editForm.restaurantName,
      whatsapp_number:     editForm.whatsappNumber,
      pos_address_street:  editForm.addressStreet,
      pos_address_city:    editForm.addressCity,
      pos_address_country: editForm.addressCountry,
    }).eq('id', user.id)
    setSaving(false)
    if (error) { setSaveMsg('Error saving. Please try again.') }
    else        { setSaveMsg('Saved!'); setEditing(false); router.refresh() }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 pb-28 md:pb-10">

      {/* ── Header ───────────────────────────────────────────────────── */}
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

        {/* ── Tab bar ──────────────────────────────────────────────────── */}
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

        {/* ═══════════════════════════════════════════════════════════════
            TAB 1 — Dashboard
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (<>

        {/* Flag support banner — shown when there are unresolved flags */}
        {hasOpenFlags && !flagBannerDismissed && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <AlertCircle size={16} className="text-amber-500 shrink-0" />
            <span className="flex-1">
              Having trouble? Reply to TillTalk on WhatsApp or email{' '}
              <a href="mailto:hello@tilltalk.ie" className="underline font-medium hover:text-amber-900">hello@tilltalk.ie</a>
            </span>
            <button onClick={() => setFlagBannerDismissed(true)} className="text-amber-400 hover:text-amber-600 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* SECTION 1 — Sales Overview */}
        <Section id="overview" sectionRef={overviewRef}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Sales Overview</h2>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 min-h-[44px] px-2"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Stat cards */}
          {salesLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
            </div>
          ) : !salesData ? (
            <Card>
              <div className="text-center py-8">
                <MessageCircle className="mx-auto mb-3 text-gray-300" size={40} />
                <p className="font-medium text-gray-700 mb-1">No data yet</p>
                <p className="text-sm text-gray-500">Connect your POS to get started — message TillTalk on WhatsApp to set up.</p>
              </div>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Revenue today */}
                <Card className="!p-4">
                  <p className="text-xs text-gray-500 font-medium mb-1">Revenue Today</p>
                  <p className="text-2xl font-bold text-gray-900">{fmt(salesData.today.revenue)}</p>
                  <p className="text-xs text-gray-400 mt-1">{salesData.today.transactions} transactions</p>
                </Card>
                {/* Cash / Card */}
                <Card className="!p-4">
                  <p className="text-xs text-gray-500 font-medium mb-1">Cash / Card</p>
                  <p className="text-2xl font-bold text-gray-900">{fmtShort(salesData.today.card)}</p>
                  <p className="text-xs text-gray-400 mt-1">Cash: {fmtShort(salesData.today.cash)}</p>
                </Card>
                {/* This week */}
                <Card className="!p-4">
                  <p className="text-xs text-gray-500 font-medium mb-1">This Week</p>
                  <p className="text-2xl font-bold text-gray-900">{fmt(salesData.week.revenue)}</p>
                  {salesData.week.vs_last_week != null && (
                    <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${salesData.week.vs_last_week >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {salesData.week.vs_last_week >= 0
                        ? <TrendingUp size={12} />
                        : <TrendingDown size={12} />}
                      {salesData.week.vs_last_week >= 0 ? '+' : ''}{salesData.week.vs_last_week.toFixed(1)}% vs last week
                    </p>
                  )}
                </Card>
              </div>

              {/* 7-day chart */}
              {salesData.chart.length > 0 && (
                <Card>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Last 7 days</p>
                  <div ref={chartRef} style={{ height: 240 }} />
                </Card>
              )}

              {/* Top items */}
              {salesData.top_items.length > 0 && (
                <Card>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Top items this week</p>
                  <div className="divide-y divide-gray-50">
                    {salesData.top_items.slice(0, 5).map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-4 text-right">{i + 1}</span>
                          <span className="text-sm text-gray-900">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{fmt(item.revenue)}</p>
                          <p className="text-xs text-gray-400">{item.qty} sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </Section>

        {/* SECTION 2 — Calendar */}
        <Section id="calendar" sectionRef={calendarRef}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-gray-900">Calendar</h2>
          </div>
          {notesLoading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          ) : (
            <CalendarSection
              locations={locations}
            />
          )}
        </Section>

        {/* SECTION 3 — Notes Feed */}
        <Section id="notes" sectionRef={notesRef}>
          <NotesSection
            notes={notesData.notes}
            reminders={notesData.reminders}
            loading={notesLoading}
            onRefresh={fetchData}
          />
        </Section>

        {/* SECTION 4 — Manage */}
        <Section id="manage" sectionRef={manageRef}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-semibold text-gray-900">Manage Team &amp; Locations</h2>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <ManageSection plan={profile?.plan} />
          </div>
        </Section>

        {/* SECTION 5 — Account */}
        <Section id="account" sectionRef={accountRef}>

          {/* Subscription */}
          <Card>
            <CardHeader icon={CreditCard} title="Subscription" />
            {isOnTrial ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  {trialDaysLeft > 0
                    ? <CheckCircle2 className="text-green-500 shrink-0" size={17} />
                    : <AlertCircle  className="text-amber-500 shrink-0" size={17} />}
                  <p className="text-sm font-medium text-gray-900">
                    {trialDaysLeft > 0
                      ? `Free trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining`
                      : 'Your trial has ended'}
                  </p>
                </div>
                {trialDaysLeft > 0 && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${trialProgress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      Expires {profile?.trial_end
                        ? new Date(profile.trial_end).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                )}

                {/* Interval toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
                  {(['monthly', 'annual'] as const).map(iv => (
                    <button key={iv} onClick={() => setBillingInterval(iv)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${billingInterval === iv ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {iv === 'monthly' ? 'Monthly' : 'Annual (2 months free)'}
                    </button>
                  ))}
                </div>

                {/* Plan cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['starter', 'pro', 'business'] as const).map(p => {
                    const pi    = PLANS[p]
                    const price = billingInterval === 'monthly' ? pi.monthlyPrice : pi.annualPrice
                    const isLoading = billingLoading === p
                    return (
                      <div key={p} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{pi.name}</p>
                          <p className="text-xl font-bold text-green-700 mt-0.5">
                            €{price}
                            <span className="text-xs font-normal text-gray-500">
                              /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                            </span>
                          </p>
                        </div>
                        <ul className="space-y-1 flex-1">
                          {pi.features.map(f => (
                            <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                              <CheckCircle2 size={11} className="text-green-500 shrink-0 mt-0.5" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => handleCheckout(p)}
                          disabled={!!billingLoading}
                          className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-semibold px-3 py-2.5 rounded-lg transition-colors min-h-[40px]"
                        >
                          {isLoading ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                          {isLoading ? 'Redirecting…' : 'Subscribe'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-500 shrink-0" size={17} />
                  <p className="text-sm font-medium text-gray-900">
                    Active — {planInfo?.name} Plan
                  </p>
                </div>
                <button
                  onClick={handlePortal}
                  disabled={billingLoading === 'portal'}
                  className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-4 py-2 rounded-lg transition-colors min-h-[44px] disabled:opacity-50"
                >
                  {billingLoading === 'portal'
                    ? <RefreshCw size={13} className="animate-spin" />
                    : <CreditCard size={13} />}
                  Manage billing
                </button>
              </div>
            )}
          </Card>

          {/* Account Details */}
          <Card>
            <CardHeader
              icon={User}
              title="Account Details"
              action={!editing ? (
                <button onClick={() => setEditing(true)} className="text-sm text-green-600 hover:underline min-h-[44px] px-2">
                  Edit
                </button>
              ) : undefined}
            />
            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-3">
                {([ ['fullName', 'Full Name', 'text'], ['restaurantName', 'Business Name', 'text'], ['whatsappNumber', 'WhatsApp Number', 'tel'] ] as [keyof typeof editForm, string, string][]).map(([key, label, type]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type={type}
                      value={editForm[key]}
                      onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                ))}
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-1">Business address</p>
                <p className="text-xs text-gray-400 -mt-2">Used for nearby events and weather alerts.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street address</label>
                    <input type="text" value={editForm.addressStreet}
                      onChange={e => setEditForm(p => ({ ...p, addressStreet: e.target.value }))}
                      placeholder="123 Main Street"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input type="text" value={editForm.addressCity}
                      onChange={e => setEditForm(p => ({ ...p, addressCity: e.target.value }))}
                      placeholder="Dublin"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input type="text" value={editForm.addressCountry}
                    onChange={e => setEditForm(p => ({ ...p, addressCountry: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                </div>
                {saveMsg && <p className={`text-sm ${saveMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{saveMsg}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="submit" disabled={saving}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors min-h-[44px]">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => { setEditing(false); setSaveMsg('') }}
                    className="text-sm text-gray-600 hover:text-gray-900 px-5 py-2.5 rounded-lg border border-gray-200 min-h-[44px]">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="space-y-2.5">
                {([
                  ['Full Name',    profile?.full_name      || '—'],
                  ['Email',        user.email              || '—'],
                  ['Business',     profile?.restaurant_name || '—'],
                  ['POS System',   profile?.pos_type ? profile.pos_type.charAt(0).toUpperCase() + profile.pos_type.slice(1) : '—'],
                  ['WhatsApp',     profile?.whatsapp_number || '—'],
                  ['Plan',         planInfo?.name          || '—'],
                  ['Address',      [profile?.pos_address_street, profile?.pos_address_city, profile?.pos_address_country].filter(Boolean).join(', ') || '—'],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex items-start sm:items-center gap-2">
                    <dt className="text-sm text-gray-500 w-32 shrink-0">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900 break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Card>

          {/* Billing */}
          {!isOnTrial && (
            <Card>
              <CardHeader icon={CreditCard} title="Billing" />
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-600">Current plan</span>
                <span className="text-sm font-medium text-gray-900">{planInfo?.name} — €{planInfo?.monthlyPrice}/mo</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Manage invoices, update payment method, or cancel via the billing portal above.
              </p>
            </Card>
          )}

          {/* Data & Privacy */}
          <DataPrivacyCard />

        </Section>

        </>)} {/* end activeTab === 'dashboard' */}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 2 — Analytics
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'analytics' && (<>

          {/* AI Query Chat + Chart display */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Ask Your Data</h2>
            <QueryChat businessName={profile?.restaurant_name || profile?.full_name || ''} />
          </div>

          {/* Detailed Analytics */}
          <div>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Detailed Analytics</h2>
            <AnalyticsSection locations={locations} />
          </div>

        </>)} {/* end activeTab === 'analytics' */}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 3 — Subscription
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'subscription' && (
          <SubscriptionTab profile={profile} />
        )}

        {/* ═══════════════════════════════════════════════════════════════
            TAB 4 — Account
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'account' && (
          <AccountTab
            profile={profile}
            user={user}
            onProfileUpdate={() => router.refresh()}
            onGoToManage={() => { setActiveTab('dashboard'); setActiveSection('manage') }}
          />
        )}

      </div>

      {/* ── Mobile bottom nav — Dashboard tab only ─────────────────── */}
      {activeTab === 'dashboard' && (
        <MobileBottomNav active={activeSection} onNav={navTo} />
      )}

      {/* ── Upgraded toast ────────────────────────────────────────── */}
      {upgradedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg animate-fade-in">
          <CheckCircle2 size={16} />
          You&apos;re now on the {planInfo?.name} plan!
        </div>
      )}

      {/* ── Floating chat widget ───────────────────────────────────── */}
      <ChatWidget />
    </div>
  )
}
