import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// GET /api/admin/query-intelligence
// Returns aggregated query intelligence stats for the admin panel.
// Admin-only route.

const ADMIN_EMAIL = 'daniel@tilltalk.ie'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '30', 10)

  const admin = createServiceRoleClient()
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  // ── Parallel queries ──────────────────────────────────────────────────────────

  const [
    totalAllTime,
    totalRecent,
    costRecent,
    intentBreakdown,
    modelBreakdown,
    complexityBreakdown,
    channelBreakdown,
    posBreakdown,
    dailyCounts,
    dailyCost,
    topQueries,
    highFollowUp,
    slowQueries,
    deterministicCandidates,
    avgResponseTimes,
    followUpByIntent,
    flagByIntent,
    flagByPos,
    flagTrend,
  ] = await Promise.all([
    // Total all time
    admin.from('query_logs').select('id', { count: 'exact', head: true }),

    // Total last N days
    admin.from('query_logs').select('id', { count: 'exact', head: true })
      .gte('created_at', cutoff),

    // Cost last N days
    admin.from('query_logs').select('response_total_cost_eur')
      .gte('created_at', cutoff)
      .not('response_total_cost_eur', 'is', null),

    // Intent breakdown
    admin.from('query_logs').select('intent_type')
      .gte('created_at', cutoff)
      .not('intent_type', 'is', null),

    // Model breakdown
    admin.from('query_logs').select('model_used')
      .gte('created_at', cutoff),

    // Complexity breakdown
    admin.from('query_logs').select('query_complexity')
      .gte('created_at', cutoff)
      .not('query_complexity', 'is', null),

    // Channel breakdown
    admin.from('query_logs').select('channel')
      .gte('created_at', cutoff),

    // POS type breakdown
    admin.from('query_logs').select('pos_type')
      .gte('created_at', cutoff),

    // Daily counts (last N days)
    admin.from('query_logs').select('created_at')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true }),

    // Daily cost
    admin.from('query_logs').select('created_at, response_total_cost_eur')
      .gte('created_at', cutoff)
      .not('response_total_cost_eur', 'is', null)
      .order('created_at', { ascending: true }),

    // Top 50 most common anonymised queries
    admin.from('query_logs').select('anonymised_query')
      .gte('created_at', cutoff)
      .not('anonymised_query', 'is', null),

    // High follow-up rate by intent
    admin.from('query_logs').select('intent_type, follow_up_within_5min')
      .gte('created_at', cutoff)
      .not('intent_type', 'is', null),

    // Slowest queries
    admin.from('query_logs').select('anonymised_query, response_time_ms, model_used, intent_type')
      .gte('created_at', cutoff)
      .not('response_time_ms', 'is', null)
      .order('response_time_ms', { ascending: false })
      .limit(20),

    // Deterministic candidates (purely data driven, classified)
    admin.from('query_logs').select('anonymised_query, intent_type, query_complexity')
      .gte('created_at', cutoff)
      .eq('answer_was_purely_data_driven', true)
      .not('intent_type', 'is', null)
      .limit(50),

    // Avg response time by model
    admin.from('query_logs').select('model_used, response_time_ms')
      .gte('created_at', cutoff)
      .not('response_time_ms', 'is', null),

    // Follow-up rate by intent
    admin.from('query_logs').select('intent_type, follow_up_within_5min')
      .gte('created_at', cutoff)
      .not('intent_type', 'is', null),

    // Flag rate by intent (was_flagged=true joined with intent)
    admin.from('query_logs').select('intent_type, was_flagged')
      .gte('created_at', cutoff)
      .not('intent_type', 'is', null),

    // Flag rate by POS type
    admin.from('query_logs').select('pos_type, was_flagged')
      .gte('created_at', cutoff),

    // Flag trend: daily flag counts
    admin.from('flags').select('created_at, flag_type')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true }),
  ])

  // ── Aggregate ──────────────────────────────────────────────────────────────

  const totalCostEur = (costRecent.data ?? []).reduce(
    (sum, r) => sum + (r.response_total_cost_eur ?? 0), 0
  )
  const avgCostEur = totalRecent.count ? totalCostEur / totalRecent.count : 0
  const projectedMonthly = days > 0 ? (totalCostEur / days) * 30 : 0

  // Intent counts
  const intentCounts: Record<string, number> = {}
  for (const r of intentBreakdown.data ?? []) {
    const k = r.intent_type || 'unknown'
    intentCounts[k] = (intentCounts[k] || 0) + 1
  }
  const intentArr = Object.entries(intentCounts)
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // Model counts
  const modelCounts: Record<string, number> = {}
  for (const r of modelBreakdown.data ?? []) {
    const k = r.model_used || 'haiku'
    modelCounts[k] = (modelCounts[k] || 0) + 1
  }

  // Complexity counts
  const complexityCounts: Record<string, number> = {}
  for (const r of complexityBreakdown.data ?? []) {
    const k = r.query_complexity || 'unknown'
    complexityCounts[k] = (complexityCounts[k] || 0) + 1
  }

  // Channel counts
  const channelCounts: Record<string, number> = {}
  for (const r of channelBreakdown.data ?? []) {
    const k = r.channel || 'whatsapp'
    channelCounts[k] = (channelCounts[k] || 0) + 1
  }

  // POS counts
  const posCounts: Record<string, number> = {}
  for (const r of posBreakdown.data ?? []) {
    const k = r.pos_type || 'unknown'
    posCounts[k] = (posCounts[k] || 0) + 1
  }

  // Daily counts grouped by date
  const dailyMap: Record<string, number> = {}
  for (const r of dailyCounts.data ?? []) {
    const d = r.created_at.slice(0, 10)
    dailyMap[d] = (dailyMap[d] || 0) + 1
  }
  const dailyArr = Object.entries(dailyMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Daily cost grouped by date
  const dailyCostMap: Record<string, number> = {}
  for (const r of dailyCost.data ?? []) {
    const d = r.created_at.slice(0, 10)
    dailyCostMap[d] = (dailyCostMap[d] || 0) + (r.response_total_cost_eur ?? 0)
  }
  const dailyCostArr = Object.entries(dailyCostMap)
    .map(([date, cost]) => ({ date, cost: Math.round(cost * 1000) / 1000 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Top queries by frequency
  const queryCounts: Record<string, number> = {}
  for (const r of topQueries.data ?? []) {
    const q = (r.anonymised_query || '').trim().toLowerCase()
    if (q) queryCounts[q] = (queryCounts[q] || 0) + 1
  }
  const topQueriesArr = Object.entries(queryCounts)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)

  // Follow-up rate by intent
  const intentFollowUp: Record<string, { total: number; follow_up: number }> = {}
  for (const r of followUpByIntent.data ?? []) {
    const k = r.intent_type || 'unknown'
    if (!intentFollowUp[k]) intentFollowUp[k] = { total: 0, follow_up: 0 }
    intentFollowUp[k].total++
    if (r.follow_up_within_5min) intentFollowUp[k].follow_up++
  }
  const followUpArr = Object.entries(intentFollowUp)
    .map(([intent, { total, follow_up }]) => ({
      intent,
      total,
      follow_up,
      rate: total > 0 ? Math.round((follow_up / total) * 100) : 0,
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 20)

  // Flag rate by intent
  const intentFlagMap: Record<string, { total: number; flagged: number }> = {}
  for (const r of flagByIntent.data ?? []) {
    const k = r.intent_type || 'unknown'
    if (!intentFlagMap[k]) intentFlagMap[k] = { total: 0, flagged: 0 }
    intentFlagMap[k].total++
    if (r.was_flagged) intentFlagMap[k].flagged++
  }
  const flagRateByIntent = Object.entries(intentFlagMap)
    .filter(([, v]) => v.total >= 5)
    .map(([intent, { total, flagged }]) => ({
      intent,
      total,
      flagged,
      rate: Math.round((flagged / total) * 1000) / 10,  // percentage to 1dp
    }))
    .sort((a, b) => b.rate - a.rate)

  // Flag rate by POS type
  const posFlagMap: Record<string, { total: number; flagged: number }> = {}
  for (const r of flagByPos.data ?? []) {
    const k = r.pos_type || 'unknown'
    if (!posFlagMap[k]) posFlagMap[k] = { total: 0, flagged: 0 }
    posFlagMap[k].total++
    if (r.was_flagged) posFlagMap[k].flagged++
  }
  const flagRateByPos = Object.entries(posFlagMap)
    .map(([pos, { total, flagged }]) => ({
      pos,
      total,
      flagged,
      rate: total > 0 ? Math.round((flagged / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.rate - a.rate)

  // Daily flag counts by type
  const flagDayMap: Record<string, Record<string, number>> = {}
  for (const r of flagTrend.data ?? []) {
    const d = (r.created_at as string).slice(0, 10)
    if (!flagDayMap[d]) flagDayMap[d] = {}
    const t = (r.flag_type as string) || 'other'
    flagDayMap[d][t] = (flagDayMap[d][t] || 0) + 1
  }
  const flagTrendArr = Object.entries(flagDayMap)
    .map(([date, types]) => ({ date, total: Object.values(types).reduce((s, n) => s + n, 0), types }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Avg response time by model
  const modelTimes: Record<string, number[]> = {}
  for (const r of avgResponseTimes.data ?? []) {
    const k = r.model_used || 'haiku'
    if (!modelTimes[k]) modelTimes[k] = []
    modelTimes[k].push(r.response_time_ms)
  }
  const avgTimeByModel = Object.entries(modelTimes).map(([model, times]) => ({
    model,
    avg_ms: Math.round(times.reduce((s, t) => s + t, 0) / times.length),
  }))

  return NextResponse.json({
    overview: {
      total_all_time:     totalAllTime.count ?? 0,
      total_recent:       totalRecent.count ?? 0,
      total_cost_eur:     Math.round(totalCostEur * 100) / 100,
      avg_cost_eur:       Math.round(avgCostEur * 10000) / 10000,
      cache_hit_rate:     0,
      deterministic_rate: 0,
      projected_monthly_eur: Math.round(projectedMonthly * 100) / 100,
    },
    intent_breakdown:    intentArr,
    model_breakdown:     modelCounts,
    complexity_breakdown: complexityCounts,
    channel_breakdown:   channelCounts,
    pos_breakdown:       posCounts,
    daily_counts:        dailyArr,
    daily_cost:          dailyCostArr,
    top_queries:         topQueriesArr,
    follow_up_by_intent:  followUpArr,
    slowest_queries:      slowQueries.data ?? [],
    deterministic_candidates: deterministicCandidates.data ?? [],
    avg_time_by_model:    avgTimeByModel,
    flag_rate_by_intent:  flagRateByIntent,
    flag_rate_by_pos:     flagRateByPos,
    flag_trend:           flagTrendArr,
  })
}
