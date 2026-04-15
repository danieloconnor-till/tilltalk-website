import { NextResponse } from 'next/server'

// POST /api/cron/cleanup-query-logs
// Called by Vercel cron at 03:00 UTC daily.
// Triggers Railway to null raw_query / raw_response older than 90 days.
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
  const onboardingKey = process.env.ONBOARDING_API_KEY

  if (!railwayUrl || !onboardingKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${railwayUrl}/api/cron/cleanup-raw-queries`, {
      method: 'POST',
      headers: { 'X-Onboarding-Key': onboardingKey },
      signal: AbortSignal.timeout(30_000),
    })
    const data = await res.json().catch(() => ({}))
    console.log('[cron/cleanup-query-logs] result:', data)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[cron/cleanup-query-logs] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
