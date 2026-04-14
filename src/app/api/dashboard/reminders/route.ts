import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const ONBOARDING_KEY = process.env.ONBOARDING_API_KEY || ''

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(
      `${RAILWAY_URL}/api/dashboard/reminders?supabase_user_id=${encodeURIComponent(user.id)}`,
      {
        headers: { 'X-Onboarding-Key': ONBOARDING_KEY },
        cache: 'no-store',
        signal: AbortSignal.timeout(8_000),
      }
    )
    if (!res.ok) {
      console.error('[dashboard/reminders] Railway returned', res.status)
      return NextResponse.json({ reminders: [] })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('[dashboard/reminders] fetch failed:', err)
    return NextResponse.json({ reminders: [] })
  }
}
