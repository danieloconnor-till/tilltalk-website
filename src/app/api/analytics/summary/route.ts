import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const ONBOARDING_KEY = process.env.ONBOARDING_API_KEY || ''

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('location_id') || ''
  const dateFrom   = searchParams.get('date_from')   || ''
  const dateTo     = searchParams.get('date_to')     || ''

  const params = new URLSearchParams({
    supabase_user_id: user.id,
    ...(locationId && { location_id: locationId }),
    ...(dateFrom   && { date_from: dateFrom }),
    ...(dateTo     && { date_to:   dateTo }),
  })

  try {
    const res = await fetch(
      `${RAILWAY_URL}/api/analytics/summary?${params}`,
      { headers: { 'X-Onboarding-Key': ONBOARDING_KEY }, cache: 'no-store' }
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return NextResponse.json(body, { status: res.status })
    }
    return NextResponse.json(await res.json())
  } catch {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 502 })
  }
}
