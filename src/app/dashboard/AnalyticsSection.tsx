'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import {
  BarChart2, DollarSign, ShoppingBag, Clock, PieChart,
  Download, RefreshCw, Shield, Plus, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import type { ApexOptions } from 'apexcharts'

// ApexCharts must be loaded client-side only (no SSR)
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LocationItem { id: number; nickname: string; address: string | null }

interface DailyPoint  { day: string; net: number; transactions: number }
interface Totals       { net_sales: number; transactions: number; cash: number; card: number }
interface ItemRow      { name: string; revenue: number; quantity: number; category: string }
interface HourlyRow    { hour: string; avg_revenue: number; avg_transactions: number }

interface AnalyticsData {
  daily_breakdown: DailyPoint[]
  totals: Totals
  top_items: ItemRow[]
  hourly: HourlyRow[]
}

interface PayrollEntry {
  id?: number
  location_id?: number
  year: number
  week: number
  payroll_total: number
  tips_paid?: number | null
  hours_worked?: number | null
  net_pay?: number | null
  employer_cost?: number | null
  holiday_pay?: number | null
  bank_holiday_pay?: number | null
  notes?: string | null
  created_at?: string
}

interface Props {
  locations: LocationItem[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GREEN = '#16a34a'
const CHART_FONT = 'Inter, ui-sans-serif, system-ui, sans-serif'

function fmt(n: number) {
  return `€${n.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtShort(n: number) {
  return `€${n.toLocaleString('en-IE', { maximumFractionDigits: 0 })}`
}

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function isoMinus(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function isoMonthStart(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset, 1)
  return d.toISOString().slice(0, 10)
}

function isoMonthEnd(offset = 0) {
  const d = new Date()
  d.setMonth(d.getMonth() + offset + 1, 0)
  return d.toISOString().slice(0, 10)
}

function isoYearStart() {
  return `${new Date().getFullYear()}-01-01`
}

// Group daily data into weekly buckets (ISO week Mon–Sun)
function toWeekly(daily: DailyPoint[]): DailyPoint[] {
  const buckets: Record<string, DailyPoint> = {}
  for (const d of daily) {
    // Approximate: parse label as "Tue 14 Jan" — use index-based weekly grouping
    const idx = daily.indexOf(d)
    const weekIdx = Math.floor(idx / 7)
    const key = `Wk ${weekIdx + 1}`
    if (!buckets[key]) buckets[key] = { day: key, net: 0, transactions: 0 }
    buckets[key].net          += d.net
    buckets[key].transactions += d.transactions
  }
  return Object.values(buckets).map(b => ({ ...b, net: Math.round(b.net * 100) / 100 }))
}

// Group daily data into monthly buckets
function toMonthly(daily: DailyPoint[]): DailyPoint[] {
  // Use position-based grouping since labels are "Tue 14 Jan" format
  const buckets: Record<string, DailyPoint> = {}
  daily.forEach((d, idx) => {
    const month = Math.floor(idx / 30.5)
    const key = `Month ${month + 1}`
    if (!buckets[key]) buckets[key] = { day: key, net: 0, transactions: 0 }
    buckets[key].net          += d.net
    buckets[key].transactions += d.transactions
  })
  return Object.values(buckets).map(b => ({ ...b, net: Math.round(b.net * 100) / 100 }))
}

function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const lines   = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

// ---------------------------------------------------------------------------
// Sub-section: Sales Analytics
// ---------------------------------------------------------------------------

function SalesAnalytics({ locations, initialLocId }: { locations: LocationItem[]; initialLocId?: number | null }) {
  const hasMultiLoc = locations.length > 1

  // Default to All Locations (null) when multi-location, else first location
  const defaultLocId = initialLocId !== undefined
    ? initialLocId
    : (locations.length > 1 ? null : (locations[0]?.id ?? null))

  const [activeLocId, setActiveLocId]   = useState<number | null>(defaultLocId)
  const [dateFrom, setDateFrom]         = useState(isoMinus(29))
  const [dateTo,   setDateTo]           = useState(isoToday())
  const [granularity, setGranularity]   = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [data, setData]                 = useState<AnalyticsData | null>(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo })
      if (activeLocId) params.set('location_id', String(activeLocId))
      const res = await fetch(`/api/analytics/summary?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `Server error ${res.status}`)
      }
      setData(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [activeLocId, dateFrom, dateTo])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  // Derived chart data
  const revenuePoints = useMemo(() => {
    if (!data?.daily_breakdown) return []
    if (granularity === 'weekly')  return toWeekly(data.daily_breakdown)
    if (granularity === 'monthly') return toMonthly(data.daily_breakdown)
    return data.daily_breakdown
  }, [data, granularity])

  // Revenue bar chart options
  const revenueOpts: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: CHART_FONT },
    colors: [GREEN],
    dataLabels: { enabled: false },
    xaxis: {
      categories: revenuePoints.map(d => d.day),
      labels: { rotate: -35, style: { fontSize: '10px' } },
    },
    yaxis: { labels: { formatter: v => fmtShort(v) } },
    tooltip: { y: { formatter: v => fmt(v) } },
    plotOptions: { bar: { borderRadius: 3, columnWidth: revenuePoints.length > 30 ? '90%' : '60%' } },
    grid: { borderColor: '#f3f4f6' },
  }

  // Top items bar chart
  const topItemsSorted = useMemo(() =>
    [...(data?.top_items ?? [])].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    [data]
  )
  const itemsOpts: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: CHART_FONT },
    colors: [GREEN],
    dataLabels: { enabled: false },
    plotOptions: { bar: { horizontal: true, borderRadius: 3, barHeight: '65%' } },
    xaxis: { labels: { formatter: v => fmtShort(Number(v)) } },
    yaxis: { labels: { style: { fontSize: '11px' } } },
    tooltip: { y: { formatter: v => fmt(v) } },
    grid: { borderColor: '#f3f4f6' },
  }

  // Hourly chart
  const hourlyOpts: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: CHART_FONT },
    colors: ['#4ade80'],
    dataLabels: { enabled: false },
    xaxis: {
      categories: data?.hourly.map(h => h.hour) ?? [],
      labels: { style: { fontSize: '10px' } },
    },
    yaxis: { labels: { formatter: v => fmtShort(Number(v)) } },
    tooltip: { y: { formatter: v => fmt(Number(v)) } },
    plotOptions: { bar: { borderRadius: 2 } },
    grid: { borderColor: '#f3f4f6' },
  }

  // Payment donut
  const paymentTotal = (data?.totals.cash ?? 0) + (data?.totals.card ?? 0)
  const otherAmt     = Math.max(0, (data?.totals.net_sales ?? 0) - paymentTotal)
  const donutOpts: ApexOptions = {
    chart: { type: 'donut', fontFamily: CHART_FONT },
    colors: [GREEN, '#3b82f6', '#9ca3af'],
    labels: ['Cash', 'Card', 'Other'],
    dataLabels: { enabled: true, style: { fontSize: '12px' } },
    legend: { position: 'bottom' },
    tooltip: { y: { formatter: v => fmt(v) } },
  }
  const donutSeries = [
    Math.max(0, data?.totals.cash ?? 0),
    Math.max(0, data?.totals.card ?? 0),
    otherAmt,
  ]

  function handleDownload() {
    if (!data) return
    const rows = data.daily_breakdown.map(d => ({
      Date: d.day,
      'Net Revenue (€)': d.net.toFixed(2),
      Transactions: d.transactions,
    }))
    downloadCSV(`tilltalk-analytics-${dateFrom}-${dateTo}.csv`, rows)
  }

  const PRESETS = [
    { label: 'Last 7d',    from: isoMinus(6),    to: isoToday() },
    { label: 'Last 30d',   from: isoMinus(29),   to: isoToday() },
    { label: 'This month', from: isoMonthStart(), to: isoToday() },
    { label: 'Last month', from: isoMonthStart(-1), to: isoMonthEnd(-1) },
    { label: 'This year',  from: isoYearStart(),  to: isoToday() },
  ]

  return (
    <div className="space-y-5">

      {/* Location selector */}
      {hasMultiLoc && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveLocId(null)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              activeLocId === null
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
            }`}
          >
            All Locations
          </button>
          {locations.map(loc => (
            <button
              key={loc.id}
              onClick={() => setActiveLocId(loc.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                activeLocId === loc.id
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
              }`}
            >
              {loc.nickname}
            </button>
          ))}
        </div>
      )}

      {/* Date controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => { setDateFrom(p.from); setDateTo(p.to) }}
              className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                dateFrom === p.from && dateTo === p.to
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">From</label>
            <input
              type="date" value={dateFrom} max={dateTo}
              onChange={e => setDateFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 shrink-0">To</label>
            <input
              type="date" value={dateTo} min={dateFrom} max={isoToday()}
              onChange={e => setDateTo(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-green-400"
            />
          </div>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading
              ? <Loader2 size={14} className="animate-spin" />
              : <RefreshCw size={14} />}
            {loading ? 'Loading…' : 'Apply'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!data}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
        <Shield size={16} className="text-green-600 shrink-0 mt-0.5" />
        <p className="text-xs text-green-800">
          TillTalk does not store your sales data. All analytics are generated live from your POS and are never retained on our servers.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Net Revenue',   value: fmt(data.totals.net_sales)  },
            { label: 'Transactions',  value: String(data.totals.transactions) },
            { label: 'Card',          value: fmt(data.totals.card)       },
            { label: 'Cash',          value: fmt(data.totals.cash)       },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Revenue chart */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : data?.daily_breakdown?.length ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                <BarChart2 size={15} className="text-green-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Revenue</span>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {(['daily', 'weekly', 'monthly'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                    granularity === g ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <ReactApexChart
            key={`rev-${granularity}`}
            type="bar"
            series={[{ name: 'Revenue', data: revenuePoints.map(d => d.net) }]}
            options={revenueOpts}
            height={220}
          />
        </div>
      ) : null}

      {/* Top items + Payment types row */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
            <Skeleton className="h-5 w-36 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top items */}
          {topItemsSorted.length > 0 && (
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                  <ShoppingBag size={15} className="text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Top Items</span>
              </div>
              <ReactApexChart
                type="bar"
                series={[{ name: 'Revenue', data: topItemsSorted.map(i => i.revenue) }]}
                options={{
                  ...itemsOpts,
                  xaxis: { categories: topItemsSorted.map(i => i.name) },
                  yaxis: { labels: { maxWidth: 140, style: { fontSize: '11px' } } },
                  chart: { ...itemsOpts.chart, type: 'bar' },
                } as ApexOptions}
                height={Math.max(180, topItemsSorted.length * 30 + 40)}
              />
            </div>
          )}

          {/* Payment types */}
          {paymentTotal > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                  <PieChart size={15} className="text-green-600" />
                </div>
                <span className="text-sm font-semibold text-gray-900">Payment Types</span>
              </div>
              <ReactApexChart
                type="donut"
                series={donutSeries}
                options={donutOpts}
                height={220}
              />
            </div>
          )}
        </div>
      ) : null}

      {/* Busiest hours */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <Skeleton className="h-5 w-36 mb-4" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : data?.hourly?.length ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <Clock size={15} className="text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Busiest Hours (avg revenue/hr)</span>
          </div>
          <ReactApexChart
            type="bar"
            series={[{ name: 'Avg Revenue', data: data.hourly.map(h => h.avg_revenue) }]}
            options={hourlyOpts}
            height={200}
          />
        </div>
      ) : null}

    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-section: Payroll
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  week: '', year: String(new Date().getFullYear()),
  payroll_total: '', net_pay: '', tips_paid: '', hours_worked: '',
  employer_cost: '', holiday_pay: '', bank_holiday_pay: '', notes: '',
}

function PayrollSection({ locations }: { locations: LocationItem[] }) {
  const [entries, setEntries]         = useState<PayrollEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [locId, setLocId]             = useState<number | null>(
    locations.length ? locations[0].id : null
  )

  const fetchPayroll = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (locId) params.set('location_id', String(locId))
      const res = await fetch(`/api/payroll?${params}`)
      const data = await res.json().catch(() => ({ entries: [] }))
      setEntries(data.entries ?? [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [locId])

  useEffect(() => { fetchPayroll() }, [fetchPayroll])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      const body = {
        location_id:      locId,
        year:             Number(form.year),
        week:             Number(form.week),
        payroll_total:    Number(form.payroll_total),
        net_pay:          form.net_pay          ? Number(form.net_pay)          : undefined,
        tips_paid:        form.tips_paid        ? Number(form.tips_paid)        : undefined,
        hours_worked:     form.hours_worked     ? Number(form.hours_worked)     : undefined,
        employer_cost:    form.employer_cost    ? Number(form.employer_cost)    : undefined,
        holiday_pay:      form.holiday_pay      ? Number(form.holiday_pay)      : undefined,
        bank_holiday_pay: form.bank_holiday_pay ? Number(form.bank_holiday_pay) : undefined,
        notes:            form.notes || undefined,
      }
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Save failed')
      setForm(EMPTY_FORM)
      setShowForm(false)
      await fetchPayroll()
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Weekly chart (show last 20 weeks)
  const chartEntries = useMemo(() =>
    [...entries].reverse().slice(-20),
    [entries]
  )
  const payrollChartOpts: ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, fontFamily: CHART_FONT },
    colors: [GREEN],
    dataLabels: { enabled: false },
    xaxis: {
      categories: chartEntries.map(e => `W${e.week} ${e.year}`),
      labels: { rotate: -35, style: { fontSize: '10px' } },
    },
    yaxis: { labels: { formatter: v => fmtShort(v) } },
    tooltip: { y: { formatter: v => fmt(v) } },
    plotOptions: { bar: { borderRadius: 3 } },
    grid: { borderColor: '#f3f4f6' },
  }

  function handleDownload() {
    downloadCSV('tilltalk-payroll.csv', entries.map(e => ({
      Year:              e.year,
      Week:              e.week,
      'Total Gross (€)': e.payroll_total?.toFixed(2) ?? '',
      'Net Pay (€)':     e.net_pay?.toFixed(2)       ?? '',
      'Tips (€)':        e.tips_paid?.toFixed(2)     ?? '',
      'Hours Worked':    e.hours_worked               ?? '',
      'Employer Cost (€)':    e.employer_cost?.toFixed(2)    ?? '',
      'Holiday Pay (€)':      e.holiday_pay?.toFixed(2)      ?? '',
      'Bank Holiday Pay (€)': e.bank_holiday_pay?.toFixed(2) ?? '',
      Notes:             e.notes ?? '',
    })))
  }

  const F = (f: keyof typeof EMPTY_FORM, label: string, required = false, type = 'number') => (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        min={type === 'number' ? '0' : undefined}
        value={form[f]}
        onChange={e => setForm(prev => ({ ...prev, [f]: e.target.value }))}
        required={required}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-400"
      />
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Location selector */}
      {locations.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {locations.map(loc => (
            <button
              key={loc.id}
              onClick={() => setLocId(loc.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
                locId === loc.id
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
              }`}
            >
              {loc.nickname}
            </button>
          ))}
        </div>
      )}

      {/* Add entry toggle */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <Plus size={15} className="text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Add payroll entry</span>
          </div>
          {showForm ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {showForm && (
          <form onSubmit={handleSubmit} className="px-5 pb-5 border-t border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              {F('week',        'Week number',  true)}
              {F('year',        'Year',         true)}
              {F('payroll_total', 'Total Gross (€)', true)}
              {F('net_pay',     'Net Pay (€)')}
              {F('tips_paid',   'Tips (€)')}
              {F('hours_worked','Hours worked')}
              {F('employer_cost',    'Employer Cost (€)')}
              {F('holiday_pay',      'Holiday Pay (€)')}
              {F('bank_holiday_pay', 'Bank Holiday Pay (€)')}
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-400 resize-none"
                placeholder="Optional notes…"
              />
            </div>
            {saveError && (
              <p className="mt-2 text-sm text-red-600">{saveError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 text-sm font-medium px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors min-h-[40px]"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {saving ? 'Saving…' : 'Save entry'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Weekly chart */}
      {!loading && chartEntries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign size={15} className="text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Gross Pay by Week</span>
          </div>
          <ReactApexChart
            type="bar"
            series={[{ name: 'Gross Pay', data: chartEntries.map(e => e.payroll_total) }]}
            options={payrollChartOpts}
            height={200}
          />
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Payroll History</span>
          <button
            onClick={handleDownload}
            disabled={entries.length === 0}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg disabled:opacity-40 transition-colors"
          >
            <Download size={13} />
            Export CSV
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            No payroll entries yet. Add your first entry above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Year', 'Week', 'Total Gross', 'Net Pay', 'Tips', 'Employer Cost', 'Holiday Pay', 'Bank Hol. Pay', 'Hours'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((e, i) => (
                  <tr key={e.id ?? i} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{e.year}</td>
                    <td className="px-4 py-2.5 text-gray-700">{e.week}</td>
                    <td className="px-4 py-2.5 text-gray-900 font-medium">{e.payroll_total != null ? fmt(e.payroll_total) : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{e.net_pay          != null ? fmt(e.net_pay)          : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{e.tips_paid        != null ? fmt(e.tips_paid)        : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{e.employer_cost    != null ? fmt(e.employer_cost)    : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{e.holiday_pay      != null ? fmt(e.holiday_pay)      : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{e.bank_holiday_pay != null ? fmt(e.bank_holiday_pay) : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{e.hours_worked     != null ? e.hours_worked          : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AnalyticsSection({ locations }: Props) {
  const [tab, setTab]             = useState<'sales' | 'payroll'>('sales')
  const [compareMode, setCompare] = useState(false)
  const hasMultiLoc               = locations.length > 1

  const TABS = [
    { id: 'sales'   as const, label: 'Sales Analytics', Icon: BarChart2   },
    { id: 'payroll' as const, label: 'Payroll',          Icon: DollarSign  },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Analytics</h2>

      {/* Sub-tab bar + compare toggle */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Compare mode toggle — only visible on Sales tab with multiple locations */}
        {tab === 'sales' && hasMultiLoc && (
          <button
            onClick={() => setCompare(c => !c)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              compareMode
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-300'
            }`}
          >
            <BarChart2 size={14} />
            Compare locations
          </button>
        )}
      </div>

      {tab === 'sales' && !compareMode && <SalesAnalytics locations={locations} />}

      {tab === 'sales' && compareMode && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Default first two locations side-by-side; each panel is fully independent */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {locations[0]?.nickname ?? 'Location A'}
            </p>
            <SalesAnalytics locations={locations} initialLocId={locations[0]?.id ?? null} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {locations[1]?.nickname ?? 'Location B'}
            </p>
            <SalesAnalytics locations={locations} initialLocId={locations[1]?.id ?? null} />
          </div>
        </div>
      )}

      {tab === 'payroll' && <PayrollSection    locations={locations} />}
    </div>
  )
}
