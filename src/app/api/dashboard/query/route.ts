import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const KEY = process.env.ONBOARDING_API_KEY || ''

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const res = await fetch(`${RAILWAY_URL}/api/dashboard/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': KEY },
    body: JSON.stringify({ ...body, supabase_user_id: user.id }),
    signal: AbortSignal.timeout(45_000), // Claude queries can take up to ~30s
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
