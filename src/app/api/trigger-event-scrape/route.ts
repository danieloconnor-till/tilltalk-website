import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const ONBOARDING_KEY = process.env.ONBOARDING_API_KEY || ''

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { lat, lng } = body

  try {
    const res = await fetch(`${RAILWAY_URL}/api/trigger-event-scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Onboarding-Key': ONBOARDING_KEY,
      },
      body: JSON.stringify({ lat, lng }),
      // Scrape can take up to ~90s — set a generous timeout via signal
      signal: AbortSignal.timeout(120_000),
    })
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.ok ? 200 : res.status })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Scrape request failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
