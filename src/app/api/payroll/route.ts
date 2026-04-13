import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const ONBOARDING_KEY = process.env.ONBOARDING_API_KEY || ''

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('location_id') || ''

  const params = new URLSearchParams({
    supabase_user_id: user.id,
    ...(locationId && { location_id: locationId }),
  })

  try {
    const res = await fetch(
      `${RAILWAY_URL}/api/payroll?${params}`,
      { headers: { 'X-Onboarding-Key': ONBOARDING_KEY }, cache: 'no-store' }
    )
    if (!res.ok) return NextResponse.json({ entries: [] })
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ entries: [] })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  try {
    const res = await fetch(
      `${RAILWAY_URL}/api/payroll`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Onboarding-Key': ONBOARDING_KEY,
        },
        body: JSON.stringify({ ...body, supabase_user_id: user.id }),
      }
    )
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, { status: res.ok ? 201 : res.status })
  } catch {
    return NextResponse.json({ error: 'Failed to save payroll entry' }, { status: 502 })
  }
}
