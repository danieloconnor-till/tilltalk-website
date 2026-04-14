/**
 * Vercel cron: runs daily at midnight UTC.
 * Finds accounts whose 14-day trial has expired with no paid Stripe subscription,
 * soft-deactivates them, sends a "trial expired" email, and blocks Railway access.
 *
 * Secured by Vercel's CRON_SECRET — Vercel adds `Authorization: Bearer <CRON_SECRET>`
 * automatically. Set CRON_SECRET in Vercel environment variables.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { railwayDeactivate } from '@/lib/railway'
import { sendEmail } from '@/lib/sendgrid'
import { trialExpiredEmail } from '@/lib/email-templates'

const FOUNDER_EMAIL = 'daniel@tilltalk.ie'

export async function GET(req: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  const now       = new Date()
  const deletionAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  // Find all active accounts where trial has expired and there is no paid subscription
  const { data: expired, error } = await admin
    .from('profiles')
    .select('id, email, full_name, trial_end, stripe_subscription_id')
    .lt('trial_end', now.toISOString())
    .is('stripe_subscription_id', null)
    .eq('active', true)
    .neq('email', FOUNDER_EMAIL)

  if (error) {
    console.error('[expire-trials] query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const profiles = expired ?? []
  console.log(`[expire-trials] found ${profiles.length} expired trial(s)`)

  let deactivated = 0
  const errors: string[] = []

  for (const profile of profiles) {
    // Soft-deactivate in Supabase
    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        active:                false,
        deactivated_at:        now.toISOString(),
        scheduled_deletion_at: deletionAt.toISOString(),
      })
      .eq('id', profile.id)

    if (updateErr) {
      console.error(`[expire-trials] update failed for ${profile.email}:`, updateErr)
      errors.push(profile.email)
      continue
    }

    deactivated++

    // Block WhatsApp access in Railway (non-fatal, fire-and-forget)
    railwayDeactivate(profile.id).then(({ ok }) => {
      if (!ok) console.warn(`[expire-trials] Railway deactivate failed for ${profile.email}`)
    })

    // Send "trial expired" email (non-fatal)
    const name = profile.full_name || profile.email.split('@')[0]
    const emailContent = trialExpiredEmail(name)
    sendEmail({
      to: profile.email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    }).catch((err: unknown) =>
      console.error(`[expire-trials] email failed for ${profile.email}:`, err)
    )
  }

  console.log(`[expire-trials] deactivated ${deactivated}/${profiles.length}`)
  return NextResponse.json({
    deactivated,
    total: profiles.length,
    ...(errors.length ? { errors } : {}),
  })
}
