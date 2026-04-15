import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// GET /api/admin/referrals
// Returns all referral records for the admin panel.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const ADMIN_EMAIL = 'daniel@tilltalk.ie'
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createServiceRoleClient()

  const { data: referrals, error } = await admin
    .from('referrals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[admin/referrals] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build a map of profile id → restaurant_name for all involved users
  const allIds = new Set<string>()
  for (const r of referrals ?? []) {
    if (r.referrer_id) allIds.add(r.referrer_id)
    if (r.referred_id) allIds.add(r.referred_id)
  }

  let profileMap: Record<string, string> = {}
  if (allIds.size > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, restaurant_name')
      .in('id', Array.from(allIds))

    for (const p of profiles ?? []) {
      profileMap[p.id] = p.restaurant_name ?? p.id
    }
  }

  return NextResponse.json({ referrals: referrals ?? [], profiles: profileMap })
}
