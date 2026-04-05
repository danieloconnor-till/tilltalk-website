import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    // Verify caller is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== 'daniel@tilltalk.ie') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { profileId, days, reason } = body

    if (!profileId || !days || days < 1) {
      return NextResponse.json({ error: 'profileId and days are required.' }, { status: 400 })
    }

    const admin = createServiceRoleClient()

    // Get current trial_end
    const { data: profile, error: fetchError } = await admin
      .from('profiles')
      .select('trial_end')
      .eq('id', profileId)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    const currentEnd = new Date(profile.trial_end || new Date())
    const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000)

    // Update trial_end
    const { error: updateError } = await admin
      .from('profiles')
      .update({ trial_end: newEnd.toISOString() })
      .eq('id', profileId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Insert trial_extensions record
    await admin.from('trial_extensions').insert({
      profile_id: profileId,
      extended_by_days: days,
      extended_by: user.email,
      reason: reason || null,
    })

    return NextResponse.json({ success: true, newTrialEnd: newEnd.toISOString() })
  } catch (err) {
    console.error('Extend trial error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
