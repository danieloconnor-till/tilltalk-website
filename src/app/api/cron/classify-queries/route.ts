import { NextResponse } from 'next/server'

// POST /api/cron/classify-queries
// Called by Vercel cron at 02:00 UTC daily.
// Triggers Railway's /api/admin/classify-queries endpoint.
export async function POST(req: Request) {
  // Vercel cron auth
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
  const onboardingKey = process.env.ONBOARDING_API_KEY

  if (!railwayUrl || !onboardingKey) {
    console.error('[cron/classify-queries] RAILWAY_ONBOARDING_URL or ONBOARDING_API_KEY not set')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${railwayUrl}/api/admin/classify-queries`, {
      method: 'POST',
      headers: { 'X-Onboarding-Key': onboardingKey },
      signal: AbortSignal.timeout(120_000),  // classification can take up to 2 min
    })
    const data = await res.json().catch(() => ({}))
    console.log('[cron/classify-queries] result:', data)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[cron/classify-queries] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
