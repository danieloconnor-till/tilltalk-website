import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// POST /api/referrals/claim
// Allows a user to manually claim a referral by entering the referred person's email.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { email } = body as { email?: string }

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  // Look up the referred user by email
  const { data: referred } = await admin
    .from('profiles')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (!referred) {
    return NextResponse.json(
      { error: 'No account found with that email address. They may not have signed up yet.' },
      { status: 404 },
    )
  }

  if (referred.id === user.id) {
    return NextResponse.json({ error: 'You cannot refer yourself.' }, { status: 400 })
  }

  // Check if a referral record already exists for the referred user
  const { data: existing } = await admin
    .from('referrals')
    .select('id, status')
    .eq('referred_id', referred.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'This person has already been attributed to a referral.' },
      { status: 409 },
    )
  }

  // Create a manual_pending referral record
  const { error: insertErr } = await admin.from('referrals').insert({
    referrer_id:    user.id,
    referred_id:    referred.id,
    referred_email: referred.email,
    status:         'manual_pending',
  })

  if (insertErr) {
    console.error('[referrals/claim] insert error:', insertErr)
    return NextResponse.json({ error: 'Failed to create referral. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
