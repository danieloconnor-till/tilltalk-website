import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

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
  const note_text = (body.note_text || '').trim()
  if (!note_text) return NextResponse.json({ error: 'note_text is required' }, { status: 400 })

  const admin = createServiceRoleClient()
  const { data, error } = await admin
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
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createServiceRoleClient()
  const { error } = await admin
    .from('notes')
    .delete()
    .eq('id', id)
    .eq('client_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
