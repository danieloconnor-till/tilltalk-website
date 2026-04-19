import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// POST /api/prompt
// Called by don-assistant to store a Claude Code prompt for one-tap copying.
// Protected by DON_ASSISTANT_SECRET header (x-don-secret).
export async function POST(req: NextRequest) {
  const secret   = req.headers.get('x-don-secret') || ''
  const expected = process.env.DON_ASSISTANT_SECRET || ''

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let content: string
  try {
    const body = await req.json()
    content = body.content
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from('claude_prompts')
    .insert({ content, expires_at: expiresAt })
    .select('id')
    .single()

  if (error) {
    console.error('[api/prompt] insert error:', error)
    return NextResponse.json({ error: 'Failed to store prompt' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}

// GET /api/prompt?id=xxx
// Public — no auth. Returns prompt content or 404 if expired/not found.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  const { data, error } = await admin
    .from('claude_prompts')
    .select('content, expires_at')
    .eq('id', id)
    .single()

  if (error) {
    // PGRST116 = "The result contains 0 rows" — genuine not-found, not a DB fault
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('[api/prompt] GET error — code:', error.code, 'msg:', error.message, 'details:', error.details)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Expired' }, { status: 410 })
  }

  return NextResponse.json({ content: data.content })
}
