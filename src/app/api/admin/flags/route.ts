import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// ── Admin guard ───────────────────────────────────────────────────────────────

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === 'daniel@tilltalk.ie'
}

// ── GET /api/admin/flags ──────────────────────────────────────────────────────
// Returns all flags joined with profile data.
// Query params: type, resolved, days, client_id, limit

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin  = createServiceRoleClient()
  const params = req.nextUrl.searchParams

  const flagType  = params.get('type')     || null
  const resolved  = params.get('resolved') || null  // 'true' | 'false' | null
  const days      = parseInt(params.get('days') || '30', 10)
  const clientId  = params.get('client_id') || null
  const limitVal  = parseInt(params.get('limit') || '200', 10)

  try {
    const cutoff = new Date(Date.now() - days * 86400_000).toISOString()

    let query = admin
      .from('flags')
      .select(`
        id, client_id, phone_number, message_text,
        flag_type, flag_reason, auto_flagged, confidence_score,
        resolved, resolved_at, resolved_by, resolution_notes,
        query_log_id, created_at,
        profiles!flags_client_id_fkey (
          id, full_name, restaurant_name, email
        )
      `)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(limitVal)

    if (flagType)  query = query.eq('flag_type', flagType)
    if (clientId)  query = query.eq('client_id', clientId)
    if (resolved === 'true')  query = query.eq('resolved', true)
    if (resolved === 'false') query = query.eq('resolved', false)

    const { data, error } = await query
    if (error) throw error

    // Overview counts (for stat cards) — always unfiltered by resolved/type
    const [
      { count: totalOpen },
      { count: todayCount },
    ] = await Promise.all([
      admin.from('flags').select('id', { count: 'exact', head: true }).eq('resolved', false),
      admin.from('flags').select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 86400_000).toISOString()),
    ])

    // Average resolution time (resolved flags only)
    const { data: resolvedFlags } = await admin
      .from('flags')
      .select('created_at, resolved_at')
      .eq('resolved', true)
      .not('resolved_at', 'is', null)
      .gte('created_at', cutoff)
      .limit(500)

    let avgResolutionHours: number | null = null
    if (resolvedFlags && resolvedFlags.length > 0) {
      const totalMs = resolvedFlags.reduce((sum, f) => {
        const diff = new Date(f.resolved_at!).getTime() - new Date(f.created_at).getTime()
        return sum + diff
      }, 0)
      avgResolutionHours = Math.round(totalMs / resolvedFlags.length / 3600_000 * 10) / 10
    }

    // Most common flag type
    const typeCounts: Record<string, number> = {}
    for (const f of (data || [])) {
      typeCounts[f.flag_type] = (typeCounts[f.flag_type] || 0) + 1
    }
    const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    return NextResponse.json({
      flags: data || [],
      overview: {
        total_open:          totalOpen   ?? 0,
        today_count:         todayCount  ?? 0,
        avg_resolution_hours: avgResolutionHours,
        most_common_type:    mostCommonType,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST /api/admin/flags ─────────────────────────────────────────────────────
// Manual flag creation from admin panel.

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createServiceRoleClient()

  try {
    const body = await req.json()
    const { client_id, phone_number, message_text, flag_type, flag_reason } = body

    if (!flag_type || !['frustration','data_error','human_requested','repeated_query','bot_failure','other'].includes(flag_type)) {
      return NextResponse.json({ error: 'Invalid flag_type' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('flags')
      .insert({
        client_id:        client_id   || null,
        phone_number:     phone_number || null,
        message_text:     message_text || null,
        flag_type,
        flag_reason:      flag_reason  || 'Manually flagged by admin',
        auto_flagged:     false,
        confidence_score: 1.0,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ flag: data }, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
