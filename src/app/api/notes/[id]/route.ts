import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const note_text = (body.note_text || '').trim()
  if (!note_text) return NextResponse.json({ error: 'note_text is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('notes')
    .update({ note_text })
    .eq('id', id)
    .eq('client_id', user.id)
    .eq('is_complete', false)
    .select('id')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Note not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('client_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
