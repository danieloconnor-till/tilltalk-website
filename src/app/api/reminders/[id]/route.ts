import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const updates: Record<string, string> = {}
  if (body.reminder_text) updates.reminder_text = body.reminder_text.trim()
  if (body.remind_at)     updates.remind_at     = body.remind_at

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('reminders')
    .update(updates)
    .eq('id', id)
    .eq('client_id', user.id)
    .eq('is_sent', false)
    .select('id')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Reminder not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', id)
    .eq('client_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
