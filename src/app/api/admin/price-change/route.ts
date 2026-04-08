import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  // Admin-only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'daniel@tilltalk.ie') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const { plan, old_price, new_price, effective_date, message } = body ?? {}

  if (!plan || old_price == null || new_price == null || !effective_date) {
    return NextResponse.json({ error: 'Missing required fields: plan, old_price, new_price, effective_date' }, { status: 400 })
  }

  const railwayUrl   = process.env.RAILWAY_ONBOARDING_URL
  const onboardingKey = process.env.ONBOARDING_API_KEY
  if (!railwayUrl || !onboardingKey) {
    return NextResponse.json({ error: 'Railway not configured' }, { status: 503 })
  }

  // Fetch all active subscribers on this plan
  const admin = createServiceRoleClient()
  const { data: profiles, error: dbErr } = await admin
    .from('profiles')
    .select('email, restaurant_name, full_name')
    .eq('plan', plan)
    .eq('active', true)
    .not('stripe_subscription_id', 'is', null)   // paying subscribers only

  if (dbErr) {
    console.error('[admin/price-change] Supabase error:', dbErr)
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0 })
  }

  let sent = 0
  let failed = 0

  for (const profile of profiles) {
    const email       = profile.email
    const client_name = profile.restaurant_name || profile.full_name || 'there'
    if (!email) { failed++; continue }

    try {
      const res = await fetch(`${railwayUrl}/api/send-price-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Onboarding-Key': onboardingKey,
        },
        body: JSON.stringify({ email, client_name, plan, old_price, new_price, effective_date, message }),
        signal: AbortSignal.timeout(10000),
      })
      if (res.ok) { sent++ } else { failed++ }
    } catch (err) {
      console.error('[admin/price-change] send failed for', email, err)
      failed++
    }
  }

  console.log(`[admin/price-change] plan=${plan} sent=${sent} failed=${failed}`)
  return NextResponse.json({ sent, failed, total: profiles.length })
}
