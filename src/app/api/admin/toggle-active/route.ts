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
    const { profileId } = body

    if (!profileId) {
      return NextResponse.json({ error: 'profileId is required.' }, { status: 400 })
    }

    const admin = createServiceRoleClient()

    // Get current active status
    const { data: profile, error: fetchError } = await admin
      .from('profiles')
      .select('active')
      .eq('id', profileId)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'Profile not found.' }, { status: 404 })
    }

    // Toggle
    const { error: updateError } = await admin
      .from('profiles')
      .update({ active: !profile.active })
      .eq('id', profileId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, active: !profile.active })
  } catch (err) {
    console.error('Toggle active error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
