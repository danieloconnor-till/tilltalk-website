import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAILWAY_URL  = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const ONBOARDING_KEY = process.env.ONBOARDING_API_KEY || ''

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const locationId = req.nextUrl.searchParams.get('location_id')

  const params = new URLSearchParams({ supabase_user_id: user.id })
  if (locationId) params.set('location_id', locationId)

  try {
    const res = await fetch(
      `${RAILWAY_URL}/api/nearby-events?${params}`,
      {
        headers: { 'X-Onboarding-Key': ONBOARDING_KEY },
        cache: 'no-store',
      }
    )
    if (!res.ok) return NextResponse.json({ events: [] })
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ events: [] })
  }
}
