import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// GET /api/alerts/stock — list all stock alerts for the authenticated user
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('stock_alerts')
    .select('id, item_name, threshold, active, last_triggered_at, created_at')
    .eq('client_id', user.id)
    .eq('active', true)
    .order('item_name', { ascending: true })

  if (error) return NextResponse.json({ alerts: [] })
  return NextResponse.json({ alerts: data ?? [] })
}

// POST /api/alerts/stock — create or update a stock alert
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const item_name = (body.item_name || '').trim()
  const threshold = parseInt(body.threshold ?? '5', 10)

  if (!item_name) return NextResponse.json({ error: 'item_name is required' }, { status: 400 })
  if (isNaN(threshold) || threshold < 1) {
    return NextResponse.json({ error: 'threshold must be a positive integer' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('stock_alerts')
    .upsert(
      { client_id: user.id, item_name, threshold, active: true, updated_at: new Date().toISOString() },
      { onConflict: 'client_id,item_name' }
    )
    .select('id, item_name, threshold, active, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ alert: data })
}
