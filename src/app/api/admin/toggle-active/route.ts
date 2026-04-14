import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import * as Sentry from '@sentry/nextjs'

const FOUNDER_EMAIL  = 'daniel@tilltalk.ie'
const RAILWAY_URL    = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const RAILWAY_KEY    = process.env.ONBOARDING_API_KEY || ''

// ── Railway helpers ───────────────────────────────────────────────────────────

async function railwayReactivate(supabaseUserId: string): Promise<{ ok: boolean; wasInactive: boolean }> {
  try {
    const res = await fetch(`${RAILWAY_URL}/api/manage/reactivate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': RAILWAY_KEY },
      body:    JSON.stringify({ supabase_user_id: supabaseUserId }),
      signal:  AbortSignal.timeout(8000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[toggle-active] Railway reactivate failed:', res.status, data)
      return { ok: false, wasInactive: false }
    }
    return { ok: true, wasInactive: data.was_inactive ?? false }
  } catch (err) {
    console.error('[toggle-active] Railway reactivate error:', err)
    return { ok: false, wasInactive: false }
  }
}

/** Verify Railway returns locations+numbers after reactivation. Non-blocking — logs to Sentry if empty. */
async function verifyDataIntegrity(supabaseUserId: string, email: string, profileId: string) {
  try {
    const [locRes, numRes] = await Promise.all([
      fetch(`${RAILWAY_URL}/api/manage/locations?supabase_user_id=${encodeURIComponent(supabaseUserId)}`,
        { headers: { 'X-Onboarding-Key': RAILWAY_KEY }, signal: AbortSignal.timeout(8000) }),
      fetch(`${RAILWAY_URL}/api/manage/numbers?supabase_user_id=${encodeURIComponent(supabaseUserId)}`,
        { headers: { 'X-Onboarding-Key': RAILWAY_KEY }, signal: AbortSignal.timeout(8000) }),
    ])

    const locData = locRes.ok ? await locRes.json().catch(() => ({})) : {}
    const numData = numRes.ok ? await numRes.json().catch(() => ({})) : {}

    const locationCount = (locData.locations ?? []).length
    const numberCount   = (numData.numbers   ?? []).length

    if (locationCount === 0 && numberCount === 0) {
      const msg = `Reactivated account has no Railway data — possible orphaned profile`
      console.warn(`[toggle-active] ${msg}: email=${email} profileId=${profileId}`)
      Sentry.captureMessage(msg, {
        level: 'warning',
        extra: { email, profileId, supabaseUserId, locRes: locRes.status, numRes: numRes.status },
      })
    } else {
      console.log(`[toggle-active] Data integrity OK: ${locationCount} location(s), ${numberCount} number(s) for ${email}`)
    }
  } catch (err) {
    console.warn('[toggle-active] Data integrity check error:', err)
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== FOUNDER_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { profileId } = body

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required.' }, { status: 400 })
    }

    const admin = createServiceRoleClient()

    const { data: profile, error: fetchError } = await admin
      .from('profiles')
      .select('id, active, email, deactivated_at')
      .eq('id', profileId)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    if (profile.email === FOUNDER_EMAIL) {
      return NextResponse.json({ error: 'This account cannot be deactivated.' }, { status: 403 })
    }

    // Use `active` as the sole discriminator.
    // This handles both old-style deactivations (active=false, deactivated_at=null)
    // and new soft-delete deactivations (active=false, deactivated_at=set).
    const isCurrentlyActive = !!profile.active

    if (isCurrentlyActive) {
      // ── Deactivate ──────────────────────────────────────────────────────────
      const now        = new Date()
      const deletionAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

      const { error } = await admin
        .from('profiles')
        .update({
          active:                false,
          deactivated_at:        now.toISOString(),
          scheduled_deletion_at: deletionAt.toISOString(),
        })
        .eq('id', profileId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, active: false, deactivated: true })

    } else {
      // ── Reactivate ──────────────────────────────────────────────────────────
      const { error } = await admin
        .from('profiles')
        .update({
          active:                true,
          deactivated_at:        null,
          scheduled_deletion_at: null,
        })
        .eq('id', profileId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Restore Railway's clients.active = true (non-fatal if Railway is down)
      const { wasInactive } = await railwayReactivate(profileId)
      if (wasInactive) {
        console.log(`[toggle-active] Restored Railway clients.active for ${profile.email} (was inactive in Railway)`)
      }

      // Async integrity check — verify Railway still has data; warns to Sentry if missing
      verifyDataIntegrity(profileId, profile.email, profileId)

      return NextResponse.json({ success: true, active: true, deactivated: false })
    }

  } catch (err) {
    console.error('Toggle active error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
