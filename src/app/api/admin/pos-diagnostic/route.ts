import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// POST /api/admin/pos-diagnostic
// Live diagnostic fetch — no data is stored at any point.
// Proxies to Railway which holds POS credentials and connector logic.
//
// Railway endpoint required: POST /api/admin/pos-diagnostic
// Body it receives: { supabase_user_id, start_date, end_date }
// Expected response: { payments: DiagPayment[], summary: DiagSummary, period: string }
//
// Auth: Supabase session — daniel@tilltalk.ie only.

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const RAILWAY_KEY = process.env.ONBOARDING_API_KEY || ''
const FOUNDER_EMAIL = 'daniel@tilltalk.ie'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== FOUNDER_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { profile_id: string; start_date: string; end_date: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { profile_id, start_date, end_date } = body

  if (!profile_id || !start_date || !end_date) {
    return NextResponse.json({ error: 'profile_id, start_date and end_date are required' }, { status: 400 })
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    return NextResponse.json({ error: 'Dates must be YYYY-MM-DD' }, { status: 400 })
  }

  // Load profile to confirm it exists and get display name / pos_type
  const admin = createServiceRoleClient()
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, restaurant_name, email, pos_type')
    .eq('id', profile_id)
    .single()

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  if (!RAILWAY_KEY) {
    return NextResponse.json({ error: 'Railway API key not configured' }, { status: 500 })
  }

  // Proxy to Railway bot — it loads POS credentials from its DB and fetches live.
  try {
    const railwayRes = await fetch(`${RAILWAY_URL}/api/admin/pos-diagnostic`, {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'X-Onboarding-Key': RAILWAY_KEY,
      },
      body: JSON.stringify({
        supabase_user_id: profile.id,
        start_date,
        end_date,
      }),
      signal: AbortSignal.timeout(30_000),
    })

    const data = await railwayRes.json().catch(() => ({ error: 'Invalid JSON from Railway' }))

    if (!railwayRes.ok) {
      return NextResponse.json(
        { error: data.error || `Railway returned ${railwayRes.status}` },
        { status: railwayRes.status }
      )
    }

    return NextResponse.json({
      client_name: profile.restaurant_name || profile.email,
      pos_type:    profile.pos_type ?? 'unknown',
      ...data,
    })
  } catch (err) {
    console.error('[pos-diagnostic] Railway error:', err)
    return NextResponse.json({ error: 'Could not reach Railway bot' }, { status: 502 })
  }
}
