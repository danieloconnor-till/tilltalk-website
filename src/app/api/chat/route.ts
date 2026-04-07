import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const ONBOARDING_KEY = process.env.ONBOARDING_API_KEY || ''

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { message?: string; session_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const message = (body.message || '').trim()
  if (!message) {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  try {
    const res = await fetch(`${RAILWAY_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Onboarding-Key': ONBOARDING_KEY,
      },
      body: JSON.stringify({
        message,
        supabase_user_id: user.id,
        session_id: body.session_id || undefined,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: (err as { error?: string }).error || 'Chat service unavailable' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Chat service unavailable' }, { status: 503 })
  }
}
