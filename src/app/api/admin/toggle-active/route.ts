import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

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
      .select('active, email, deactivated_at')
      .eq('id', profileId)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    // Founder account is never deactivatable
    if (profile.email === FOUNDER_EMAIL) {
      return NextResponse.json({ error: 'This account cannot be deactivated.' }, { status: 403 })
    }

    const nowActive = !!profile.active && !profile.deactivated_at

    if (nowActive) {
      // Deactivate: soft delete — set timestamps, mark inactive
      const now = new Date()
      const deletionAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // +7 days
      const { error } = await admin
        .from('profiles')
        .update({
          active: false,
          deactivated_at: now.toISOString(),
          scheduled_deletion_at: deletionAt.toISOString(),
        })
        .eq('id', profileId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, active: false, deactivated: true })
    } else {
      // Reactivate: clear soft-delete timestamps, restore active
      const { error } = await admin
        .from('profiles')
        .update({
          active: true,
          deactivated_at: null,
          scheduled_deletion_at: null,
        })
        .eq('id', profileId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, active: true, deactivated: false })
    }
  } catch (err) {
    console.error('Toggle active error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
