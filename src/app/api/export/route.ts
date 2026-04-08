import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
  const onboardingKey = process.env.ONBOARDING_API_KEY

  if (!railwayUrl || !onboardingKey) {
    return NextResponse.json({ error: 'Export service not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(
      `${railwayUrl}/api/export?supabase_user_id=${encodeURIComponent(user.id)}`,
      {
        headers: { 'X-Onboarding-Key': onboardingKey },
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      },
    )

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      console.error('[api/export] Railway error:', res.status, body)
      return NextResponse.json(
        { error: body?.message ?? 'Export failed' },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[api/export] fetch failed:', err)
    return NextResponse.json({ error: 'Export service unreachable' }, { status: 503 })
  }
}
