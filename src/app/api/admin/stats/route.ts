import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// GET /api/admin/stats
// Called by don-assistant to fetch live TillTalk client metrics.
// Protected by DON_ASSISTANT_SECRET header (set in Railway + Vercel env vars).

export async function GET(req: NextRequest) {
  const secret   = req.headers.get('x-don-assistant-secret') || ''
  const expected = process.env.DON_ASSISTANT_SECRET || ''

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceRoleClient()

  try {
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('active, plan, stripe_subscription_id, trial_end, whatsapp_number, created_at')

    if (error) throw error

    const now     = new Date()
    const weekAgo = new Date(Date.now() - 7 * 86_400_000)

    const active  = profiles.filter(p => p.active)
    const inactive = profiles.filter(p => !p.active)

    const newLast7d    = profiles.filter(p => new Date(p.created_at) > weekAgo).length
    const trialActive  = active.filter(p => !p.stripe_subscription_id && new Date(p.trial_end) > now).length
    const trialExpired = active.filter(p => !p.stripe_subscription_id && new Date(p.trial_end) <= now).length
    const paid         = active.filter(p => Boolean(p.stripe_subscription_id)).length

    const byPlan = {
      starter:  active.filter(p => p.plan === 'starter').length,
      pro:      active.filter(p => p.plan === 'pro').length,
      business: active.filter(p => p.plan === 'business').length,
    }

    const whatsappNumbers = profiles.filter(p => Boolean(p.whatsapp_number)).length

    return NextResponse.json({
      total_all:       profiles.length,
      total_active:    active.length,
      total_inactive:  inactive.length,
      new_last_7d:     newLast7d,
      trial_active:    trialActive,
      trial_expired:   trialExpired,
      paid:            paid,
      by_plan:         byPlan,
      whatsapp_numbers: whatsappNumbers,
      as_of:           now.toISOString(),
    })
  } catch (err) {
    console.error('[admin/stats] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
