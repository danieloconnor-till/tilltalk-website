import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'daniel@tilltalk.ie') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
  if (!railwayUrl) {
    return NextResponse.json({ status: 'down', error: 'Railway not configured' }, { status: 503 })
  }

  try {
    const res = await fetch(`${railwayUrl}/health`, {
      signal: AbortSignal.timeout(15000),
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[admin/health] fetch failed:', err)
    return NextResponse.json({
      status: 'down',
      checks: {},
      error: 'Railway unreachable',
      timestamp: new Date().toISOString(),
    }, { status: 503 })
  }
}
