import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  const updates: Record<string, unknown> = {}
  if (body.threshold !== undefined) updates.threshold = parseInt(body.threshold, 10)
  if (body.item_name !== undefined) updates.item_name = body.item_name.trim()
  updates.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('stock_alerts')
    .update(updates)
    .eq('id', id)
    .eq('client_id', user.id)
    .select('id')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('stock_alerts')
    .delete()
    .eq('id', id)
    .eq('client_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
