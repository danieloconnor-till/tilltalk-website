import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// GET /api/referrals/my
// Returns the current user's referral code, link, and stats.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const admin = createServiceRoleClient()

  // Fetch referral_code from profiles
  const { data: profile } = await admin
    .from('profiles')
    .select('referral_code, restaurant_name')
    .eq('id', user.id)
    .single()

  const referralCode = profile?.referral_code ?? null
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tilltalk.ie'
  const referralUrl = referralCode ? `${siteUrl}/ref/${referralCode}` : null

  // Fetch referral records for this user as referrer
  const { data: referrals } = await admin
    .from('referrals')
    .select('id, referred_email, referred_id, status, stripe_credit_cents, created_at, converted_at, credited_at')
    .eq('referrer_id', user.id)
    .order('created_at', { ascending: false })

  const rows = referrals ?? []
  const stats = {
    total:     rows.length,
    pending:   rows.filter(r => r.status === 'signed_up').length,
    converted: rows.filter(r => r.status === 'converted' || r.status === 'credited').length,
    credited:  rows.filter(r => r.status === 'credited').length,
    total_credit_cents: rows.reduce((sum, r) => sum + (r.stripe_credit_cents ?? 0), 0),
  }

  // Enrich with referred user's name/business from profiles
  const referredIds = rows.map(r => r.referred_id).filter(Boolean) as string[]
  let referredProfiles: Record<string, { restaurant_name?: string }> = {}
  if (referredIds.length > 0) {
    const { data: rps } = await admin
      .from('profiles')
      .select('id, restaurant_name')
      .in('id', referredIds)
    for (const rp of rps ?? []) {
      referredProfiles[rp.id] = rp
    }
  }

  const enrichedReferrals = rows.map(r => ({
    ...r,
    referred_business: r.referred_id ? (referredProfiles[r.referred_id]?.restaurant_name ?? null) : null,
  }))

  return NextResponse.json({
    referral_code: referralCode,
    referral_url:  referralUrl,
    stats,
    referrals: enrichedReferrals,
  })
}
