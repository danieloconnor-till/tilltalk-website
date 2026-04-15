import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'daniel@tilltalk.ie'

async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

export async function POST(request: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
  const onboardingKey = process.env.ONBOARDING_API_KEY

  if (!railwayUrl || !onboardingKey) {
    return NextResponse.json({ ok: false, message: 'Railway not configured' }, { status: 500 })
  }

  try {
    const res = await fetch(`${railwayUrl}/api/sandbox/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': onboardingKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ ok: false, message: 'Connection to Railway timed out' }, { status: 502 })
  }
}
