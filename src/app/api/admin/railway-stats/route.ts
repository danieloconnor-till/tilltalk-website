import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'daniel@tilltalk.ie') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
  const onboardingKey = process.env.ONBOARDING_API_KEY

  if (!railwayUrl || !onboardingKey) {
    return NextResponse.json({ status: 'error', error: 'Railway not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(`${railwayUrl}/api/admin/overview`, {
      headers: { 'X-Onboarding-Key': onboardingKey },
      signal: AbortSignal.timeout(6000),
      cache: 'no-store',
    })
    if (!res.ok) return NextResponse.json({ status: 'error', error: `Railway ${res.status}` }, { status: 503 })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[admin/railway-stats] fetch failed:', err)
    return NextResponse.json({ status: 'error', error: 'Railway unreachable' }, { status: 503 })
  }
}
