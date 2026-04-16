import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

const DEFAULTS = {
  event_alerts_enabled:     true,
  event_alert_radius_km:    2,
  inventory_alerts_enabled: true,
  inventory_threshold:      5,
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// GET /api/alerts/settings — get current alert settings (returns defaults if not set)
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('alert_settings')
    .select('event_alerts_enabled, event_alert_radius_km, inventory_alerts_enabled, inventory_threshold')
    .eq('client_id', user.id)
    .single()

  return NextResponse.json({ settings: data ?? DEFAULTS })
}

// PATCH /api/alerts/settings — update alert settings (upserts)
export async function PATCH(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))

  const allowed = ['event_alerts_enabled', 'event_alert_radius_km', 'inventory_alerts_enabled', 'inventory_threshold']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }
  updates.client_id  = user.id
  updates.updated_at = new Date().toISOString()

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('alert_settings')
    .upsert(updates, { onConflict: 'client_id' })
    .select('event_alerts_enabled, event_alert_radius_km, inventory_alerts_enabled, inventory_threshold')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ settings: data })
}
