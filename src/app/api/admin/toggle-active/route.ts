import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { railwayDeactivate, railwayReactivate, verifyRailwayDataIntegrity } from '@/lib/railway'

const FOUNDER_EMAIL = 'daniel@tilltalk.ie'

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
    // Handles both old-style deactivations (active=false, deactivated_at=null)
    // and soft-delete deactivations (active=false, deactivated_at=set).
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

      // Mirror in Railway so WhatsApp is blocked immediately
      railwayDeactivate(profileId).then(({ wasActive }) => {
        if (wasActive) console.log(`[toggle-active] Railway clients.active set to FALSE for ${profile.email}`)
      })

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

      // Async integrity check — warns to Sentry if Railway data appears missing
      verifyRailwayDataIntegrity(profileId, profile.email, profileId)

      return NextResponse.json({ success: true, active: true, deactivated: false })
    }

  } catch (err) {
    console.error('Toggle active error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
