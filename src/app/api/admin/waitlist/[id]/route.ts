import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'daniel@tilltalk.ie') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
  const onboardingKey = process.env.ONBOARDING_API_KEY

  if (!railwayUrl || !onboardingKey) {
    return NextResponse.json({ error: 'Railway not configured' }, { status: 503 })
  }

  const { id } = await params
  const body = await req.json()

  // Forward only recognised fields
  const payload: Record<string, unknown> = {}
  if ('notes'      in body) payload.notes      = body.notes
  if ('status'     in body) payload.status     = body.status
  if ('removed_at' in body) payload.removed_at = body.removed_at

  try {
    const res = await fetch(`${railwayUrl}/api/admin/waitlist/${id}`, {
      method: 'PATCH',
      headers: {
        'X-Onboarding-Key': onboardingKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Railway ${res.status}` }, { status: 503 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/waitlist/patch] fetch failed:', err)
    return NextResponse.json({ error: 'Railway unreachable' }, { status: 503 })
  }
}
