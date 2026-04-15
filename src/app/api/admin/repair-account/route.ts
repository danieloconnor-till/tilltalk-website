/**
 * POST /api/admin/repair-account
 *
 * Repairs a broken deactivation/reactivation cycle where Supabase has
 * active=true but Railway's clients.active is still false, causing the
 * dashboard manage panel to return empty data.
 *
 * Steps:
 *   1. Look up the profile in Supabase
 *   2. If Supabase has stale deactivation flags, clear them
 *   3. Call Railway /api/manage/reactivate to force clients.active=TRUE
 *   4. Return a full diagnostic so the admin can see what was fixed
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { railwayReactivate } from '@/lib/railway'

const FOUNDER_EMAIL = 'daniel@tilltalk.ie'

export async function POST(request: Request) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== FOUNDER_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { profileId } = body
  if (!profileId) {
    return NextResponse.json({ error: 'profileId is required' }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  // ── 1. Fetch current Supabase state ─────────────────────────────────────────
  const { data: profile, error: fetchError } = await admin
    .from('profiles')
    .select('id, email, active, deactivated_at, scheduled_deletion_at, trial_end, stripe_subscription_id')
    .eq('id', profileId)
    .single()

  if (fetchError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const before = {
    active: profile.active,
    deactivated_at: profile.deactivated_at,
    scheduled_deletion_at: profile.scheduled_deletion_at,
  }

  // ── 2. Ensure Supabase flags are clear ──────────────────────────────────────
  let supabaseFixed = false
  if (!profile.active || profile.deactivated_at || profile.scheduled_deletion_at) {
    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        active: true,
        deactivated_at: null,
        scheduled_deletion_at: null,
      })
      .eq('id', profileId)

    if (updateErr) {
      return NextResponse.json({ error: 'Supabase update failed: ' + updateErr.message }, { status: 500 })
    }
    supabaseFixed = true
    console.log(`[repair-account] cleared deactivation flags for ${profile.email}`)
  }

  // ── 3. Force Railway active ─────────────────────────────────────────────────
  const railwayResult = await railwayReactivate(profileId)
  console.log(
    `[repair-account] Railway reactivate for ${profile.email}:`,
    railwayResult.ok ? `ok (wasInactive=${railwayResult.wasInactive})` : 'FAILED',
  )

  return NextResponse.json({
    email: profile.email,
    supabase: {
      before,
      fixed: supabaseFixed,
      after: {
        active: true,
        deactivated_at: null,
        scheduled_deletion_at: null,
      },
    },
    railway: {
      ok: railwayResult.ok,
      wasInactive: railwayResult.wasInactive,
    },
    message: railwayResult.ok
      ? `Repair complete for ${profile.email}. Railway was ${railwayResult.wasInactive ? 'inactive — now restored' : 'already active'}.`
      : `Supabase fixed but Railway sync failed — Railway may be down. Try again in a moment.`,
  })
}
