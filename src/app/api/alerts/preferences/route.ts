import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const KEY = process.env.ONBOARDING_API_KEY || ''

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET /api/alerts/preferences — fetch all alert preferences from Railway
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(
    `${RAILWAY_URL}/api/manage/alert-preferences?supabase_user_id=${encodeURIComponent(user.id)}`,
    { headers: { 'X-Onboarding-Key': KEY }, cache: 'no-store' }
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

// PATCH /api/alerts/preferences — update one or more alert preferences
export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const res = await fetch(`${RAILWAY_URL}/api/manage/alert-preferences`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': KEY },
    body: JSON.stringify({ ...body, supabase_user_id: user.id }),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
