'use client'

import { useState, useEffect } from 'react'
import { BarChart2, Zap, Clock, TrendingUp, MessageSquare, Layers, RefreshCw } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Overview {
  total_all_time: number
  total_recent: number
  total_cost_eur: number
  avg_cost_eur: number
  projected_monthly_eur: number
}

interface IntentItem { intent: string; count: number }
interface DayCount { date: string; count: number }
interface DayCost { date: string; cost: number }
interface QueryItem { query: string; count: number }
interface FollowUpItem { intent: string; total: number; follow_up: number; rate: number }
interface SlowQuery { anonymised_query: string; response_time_ms: number; model_used: string; intent_type: string | null }
interface DeterministicItem { anonymised_query: string; intent_type: string | null; query_complexity: string | null }
interface AvgTimeItem { model: string; avg_ms: number }
interface FlagRateItem { intent?: string; pos?: string; total: number; flagged: number; rate: number }
interface FlagTrendDay { date: string; total: number; types: Record<string, number> }

interface QueryIntelligenceData {
  overview: Overview
  intent_breakdown: IntentItem[]
  model_breakdown: Record<string, number>
  complexity_breakdown: Record<string, number>
  channel_breakdown: Record<string, number>
  pos_breakdown: Record<string, number>
  daily_counts: DayCount[]
  daily_cost: DayCost[]
  top_queries: QueryItem[]
  follow_up_by_intent: FollowUpItem[]
  slowest_queries: SlowQuery[]
  deterministic_candidates: DeterministicItem[]
  avg_time_by_model: AvgTimeItem[]
  flag_rate_by_intent: FlagRateItem[]
  flag_rate_by_pos: FlagRateItem[]
  flag_trend: FlagTrendDay[]
}

// ─── Mini-charts ──────────────────────────────────────────────────────────────

function SparkBars({ data, color = 'bg-green-500' }: { data: number[]; color?: string }) {
  const max = Math.max(...data, 1)
  return (
    <div className="flex items-end gap-px h-16 w-full">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 ${color} rounded-t-[1px] opacity-80`}
          style={{ height: `${Math.max(v > 0 ? 4 : 0, (v / max) * 100)}%`, minWidth: 2 }}
        />
      ))}
    </div>
  )
}

function HorizBar({
  label, count, max, color = 'bg-green-500',
}: { label: string; count: number; max: number; color?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs text-gray-500 truncate text-right shrink-0 capitalize">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${(count / max) * 100}%` }} />
      </div>
      <div className="w-8 text-xs text-gray-500 text-right shrink-0">{count}</div>
    </div>
  )
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 ${className}`}>
      {children}
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{children}</p>
}

function Stat({ label, value, sub, green }: { label: string; value: string | number; sub?: string; green?: boolean }) {
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${green ? 'text-green-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </Card>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function QueryIntelligenceSection() {
  const [days, setDays] = useState(30)
  const [data, setData] = useState<QueryIntelligenceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(d: number) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/query-intelligence?days=${d}`)
      if (!res.ok) { setError('Failed to load query intelligence data'); setLoading(false); return }
      setData(await res.json())
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(days) }, [days])

  return (
    <div id="query-intelligence">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 pt-2">
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-green-600" />
          <h2 className="text-base font-semibold text-gray-900">Query Intelligence</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Day-range selector */}
          {([7, 14, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                days === d
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {d}d
            </button>
          ))}
          <button
            onClick={() => load(days)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 px-2 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-gray-400 py-8 text-center">Loading query data…</div>
      )}
      {error && (
        <div className="text-sm text-red-500 py-4 text-center">{error}</div>
      )}

      {!loading && !error && data && (
        <div className="space-y-6">
          {/* ── Overview cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Stat
              label={`Queries (${days}d)`}
              value={data.overview.total_recent.toLocaleString()}
              sub={`${data.overview.total_all_time.toLocaleString()} all time`}
            />
            <Stat
              label={`AI Cost (${days}d)`}
              value={`€${data.overview.total_cost_eur.toFixed(2)}`}
              sub={`€${data.overview.avg_cost_eur.toFixed(4)} avg/query`}
              green
            />
            <Stat
              label="Projected / Month"
              value={`€${data.overview.projected_monthly_eur.toFixed(2)}`}
              sub="based on current period"
            />
            <Stat
              label="Queries / Day (avg)"
              value={days > 0 ? (data.overview.total_recent / days).toFixed(1) : '—'}
              sub={`over ${days} days`}
            />
            <Stat
              label="Cost / Day (avg)"
              value={days > 0 ? `€${(data.overview.total_cost_eur / days).toFixed(3)}` : '—'}
              sub="AI spend per day"
            />
          </div>

          {/* ── Daily charts row ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardTitle>Queries per Day</CardTitle>
              <SparkBars data={data.daily_counts.map((d) => d.count)} />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>{data.daily_counts[0]?.date?.slice(5) ?? ''}</span>
                <span>{data.daily_counts[data.daily_counts.length - 1]?.date?.slice(5) ?? ''}</span>
              </div>
            </Card>
            <Card>
              <CardTitle>AI Cost per Day (€)</CardTitle>
              <SparkBars data={data.daily_cost.map((d) => d.cost)} color="bg-blue-400" />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>{data.daily_cost[0]?.date?.slice(5) ?? ''}</span>
                <span>{data.daily_cost[data.daily_cost.length - 1]?.date?.slice(5) ?? ''}</span>
              </div>
            </Card>
          </div>

          {/* ── Breakdown row ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Model breakdown */}
            <Card>
              <CardTitle>Model Used</CardTitle>
              <div className="space-y-2">
                {Object.entries(data.model_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([model, count]) => (
                    <HorizBar
                      key={model}
                      label={model}
                      count={count}
                      max={Math.max(...Object.values(data.model_breakdown), 1)}
                      color={model === 'sonnet' ? 'bg-purple-500' : model === 'opus' ? 'bg-amber-500' : 'bg-green-500'}
                    />
                  ))}
              </div>
            </Card>

            {/* Channel breakdown */}
            <Card>
              <CardTitle>Channel</CardTitle>
              <div className="space-y-2">
                {Object.entries(data.channel_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([channel, count]) => (
                    <HorizBar
                      key={channel}
                      label={channel}
                      count={count}
                      max={Math.max(...Object.values(data.channel_breakdown), 1)}
                      color={channel === 'dashboard' ? 'bg-blue-500' : 'bg-green-500'}
                    />
                  ))}
              </div>
            </Card>

            {/* Complexity breakdown */}
            <Card>
              <CardTitle>Query Complexity</CardTitle>
              <div className="space-y-2">
                {Object.entries(data.complexity_breakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([complexity, count]) => (
                    <HorizBar
                      key={complexity}
                      label={complexity}
                      count={count}
                      max={Math.max(...Object.values(data.complexity_breakdown), 1)}
                      color={
                        complexity === 'complex' ? 'bg-red-400' :
                        complexity === 'moderate' ? 'bg-amber-400' :
                        'bg-green-500'
                      }
                    />
                  ))}
              </div>
            </Card>

            {/* Avg response time by model */}
            <Card>
              <CardTitle>Avg Response Time</CardTitle>
              <div className="space-y-2">
                {data.avg_time_by_model
                  .sort((a, b) => b.avg_ms - a.avg_ms)
                  .map(({ model, avg_ms }) => (
                    <HorizBar
                      key={model}
                      label={model}
                      count={avg_ms}
                      max={Math.max(...data.avg_time_by_model.map((x) => x.avg_ms), 1)}
                      color={model === 'sonnet' ? 'bg-purple-500' : model === 'opus' ? 'bg-amber-500' : 'bg-green-500'}
                    />
                  ))}
                <p className="text-[10px] text-gray-400 mt-1">values in ms</p>
              </div>
            </Card>
          </div>

          {/* ── Intent breakdown ───────────────────────────────────────────── */}
          {data.intent_breakdown.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Layers size={14} className="text-green-600" />
                <CardTitle>Intent Types (classified)</CardTitle>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                {data.intent_breakdown.map(({ intent, count }) => (
                  <HorizBar
                    key={intent}
                    label={intent.replace(/_/g, ' ')}
                    count={count}
                    max={data.intent_breakdown[0]?.count ?? 1}
                    color="bg-green-500"
                  />
                ))}
              </div>
            </Card>
          )}

          {/* ── Follow-up rate by intent ───────────────────────────────────── */}
          {data.follow_up_by_intent.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare size={14} className="text-blue-500" />
                <CardTitle>Follow-up Rate by Intent</CardTitle>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Intent</th>
                      <th className="text-right pb-2 font-medium">Queries</th>
                      <th className="text-right pb-2 font-medium">Follow-ups</th>
                      <th className="text-right pb-2 font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.follow_up_by_intent.map(({ intent, total, follow_up, rate }) => (
                      <tr key={intent} className="hover:bg-gray-50">
                        <td className="py-1.5 capitalize text-gray-700">{intent.replace(/_/g, ' ')}</td>
                        <td className="py-1.5 text-right text-gray-500">{total}</td>
                        <td className="py-1.5 text-right text-gray-500">{follow_up}</td>
                        <td className="py-1.5 text-right">
                          <span className={`font-semibold ${rate >= 30 ? 'text-amber-600' : 'text-gray-700'}`}>
                            {rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Top queries ────────────────────────────────────────────────── */}
          {data.top_queries.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-green-600" />
                <CardTitle>Top Anonymised Queries</CardTitle>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">#</th>
                      <th className="text-left pb-2 font-medium">Query</th>
                      <th className="text-right pb-2 font-medium">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.top_queries.slice(0, 30).map(({ query, count }, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-1.5 text-gray-400 pr-2">{i + 1}</td>
                        <td className="py-1.5 text-gray-700 max-w-lg truncate">{query}</td>
                        <td className="py-1.5 text-right font-medium text-gray-700">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Slowest queries ────────────────────────────────────────────── */}
          {data.slowest_queries.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={14} className="text-amber-500" />
                <CardTitle>Slowest Queries</CardTitle>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Query</th>
                      <th className="text-left pb-2 font-medium">Model</th>
                      <th className="text-left pb-2 font-medium">Intent</th>
                      <th className="text-right pb-2 font-medium">Time (ms)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.slowest_queries.map((q, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-1.5 text-gray-700 max-w-xs truncate">{q.anonymised_query}</td>
                        <td className="py-1.5 text-gray-500 capitalize">{q.model_used}</td>
                        <td className="py-1.5 text-gray-500">{q.intent_type?.replace(/_/g, ' ') ?? '—'}</td>
                        <td className="py-1.5 text-right font-semibold text-amber-600">
                          {q.response_time_ms.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── Deterministic candidates ───────────────────────────────────── */}
          {data.deterministic_candidates.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-yellow-500" />
                <CardTitle>Deterministic Candidates</CardTitle>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                These queries were answered with purely data-driven responses — candidates for caching or code-gen shortcuts.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">Query</th>
                      <th className="text-left pb-2 font-medium">Intent</th>
                      <th className="text-left pb-2 font-medium">Complexity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.deterministic_candidates.map((q, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-1.5 text-gray-700 max-w-xs truncate">{q.anonymised_query}</td>
                        <td className="py-1.5 text-gray-500">{q.intent_type?.replace(/_/g, ' ') ?? '—'}</td>
                        <td className="py-1.5 text-gray-500 capitalize">{q.query_complexity ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Flag Rates */}
          {((data.flag_rate_by_intent?.length ?? 0) > 0 || (data.flag_trend?.length ?? 0) > 0) && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                🚩 Flag Rates
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data.flag_rate_by_intent?.length ?? 0) > 0 && (
                  <Card>
                    <p className="text-xs font-semibold text-gray-600 mb-3">Flag Rate by Intent</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="text-left py-1.5 font-medium">Intent</th>
                          <th className="text-right py-1.5 font-medium">Queries</th>
                          <th className="text-right py-1.5 font-medium">Flagged</th>
                          <th className="text-right py-1.5 font-medium">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.flag_rate_by_intent.map(({ intent, total, flagged, rate }) => (
                          <tr key={intent} className="border-b border-gray-50 last:border-0">
                            <td className="py-1.5 font-medium text-gray-800">{intent}</td>
                            <td className="py-1.5 text-right text-gray-500">{total}</td>
                            <td className="py-1.5 text-right text-gray-500">{flagged}</td>
                            <td className={`py-1.5 text-right font-semibold ${rate > 5 ? 'text-red-600' : rate > 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                              {rate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )}

                {(data.flag_rate_by_pos?.length ?? 0) > 0 && (
                  <Card>
                    <p className="text-xs font-semibold text-gray-600 mb-3">Flag Rate by POS Type</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-100">
                          <th className="text-left py-1.5 font-medium">POS</th>
                          <th className="text-right py-1.5 font-medium">Queries</th>
                          <th className="text-right py-1.5 font-medium">Flagged</th>
                          <th className="text-right py-1.5 font-medium">Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.flag_rate_by_pos.map(({ pos, total, flagged, rate }) => (
                          <tr key={pos} className="border-b border-gray-50 last:border-0">
                            <td className="py-1.5 font-medium text-gray-800 uppercase">{pos}</td>
                            <td className="py-1.5 text-right text-gray-500">{total}</td>
                            <td className="py-1.5 text-right text-gray-500">{flagged}</td>
                            <td className={`py-1.5 text-right font-semibold ${rate > 5 ? 'text-red-600' : rate > 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                              {rate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                )}
              </div>

              {(data.flag_trend?.length ?? 0) > 0 && (
                <Card>
                  <p className="text-xs font-semibold text-gray-600 mb-3">Daily Flag Volume</p>
                  <SparkBars
                    data={data.flag_trend.map(d => d.total)}
                    color="bg-red-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{data.flag_trend[0]?.date}</span>
                    <span>{data.flag_trend[data.flag_trend.length - 1]?.date}</span>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
