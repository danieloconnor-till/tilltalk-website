import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const KEY = process.env.ONBOARDING_API_KEY || ''

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const res = await fetch(`${RAILWAY_URL}/api/notes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': KEY },
    body: JSON.stringify({ ...body, supabase_user_id: user.id }),
    signal: AbortSignal.timeout(8_000),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const res = await fetch(`${RAILWAY_URL}/api/notes/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': KEY },
    body: JSON.stringify({ supabase_user_id: user.id }),
    signal: AbortSignal.timeout(8_000),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
