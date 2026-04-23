import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { railwayDeactivate, railwayReactivate } from '@/lib/railway'
import Stripe from 'stripe'

// Referral credit: €30 per conversion (in cents)
const REFERRAL_CREDIT_CENTS = 3000

async function applyReferralCredit(admin: ReturnType<typeof createServiceRoleClient>, userId: string) {
  try {
    // Find a 'signed_up' referral for this user
    const { data: referral } = await admin
      .from('referrals')
      .select('id, referrer_id')
      .eq('referred_id', userId)
      .eq('status', 'signed_up')
      .maybeSingle()

    if (!referral) return

    // Get referrer's Stripe customer ID
    const { data: referrerProfile } = await admin
      .from('profiles')
      .select('stripe_customer_id, restaurant_name')
      .eq('id', referral.referrer_id)
      .maybeSingle()

    if (!referrerProfile?.stripe_customer_id) {
      // Mark converted even without credit (referrer may not be a paying customer yet)
      await admin.from('referrals').update({ status: 'converted', converted_at: new Date().toISOString() }).eq('id', referral.id)
      console.log('[webhook/referral] referrer has no Stripe customer — marked converted without credit')
      return
    }

    // Apply balance credit to referrer's Stripe account
    const creditTx = await stripe.customers.createBalanceTransaction(
      referrerProfile.stripe_customer_id,
      {
        amount:   -REFERRAL_CREDIT_CENTS,   // negative = credit
        currency: 'eur',
        description: `Referral credit — new subscriber joined via your link`,
      },
    )
    console.log('[webhook/referral] credit applied:', creditTx.id, 'for referrer', referral.referrer_id)

    // Mark credited in Supabase
    await admin.from('referrals').update({
      status: 'credited',
      converted_at: new Date().toISOString(),
      credited_at: new Date().toISOString(),
      stripe_credit_cents: REFERRAL_CREDIT_CENTS,
    }).eq('id', referral.id)

    // Notify referrer via Railway WhatsApp
    const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
    const onboardingKey = process.env.ONBOARDING_API_KEY
    if (railwayUrl && onboardingKey) {
      const { data: referred } = await admin
        .from('profiles')
        .select('restaurant_name')
        .eq('id', userId)
        .maybeSingle()

      fetch(`${railwayUrl}/api/referral-credit-notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': onboardingKey },
        body: JSON.stringify({
          referrer_profile_id: referral.referrer_id,
          referred_name: referred?.restaurant_name ?? 'Someone',
          credit_euros: REFERRAL_CREDIT_CENTS / 100,
        }),
        signal: AbortSignal.timeout(8000),
      }).catch((e: unknown) => console.error('[webhook/referral] notify error (non-fatal):', e))
    }
  } catch (err) {
    console.error('[webhook/referral] applyReferralCredit error (non-fatal):', err)
  }
}

// Stripe requires the raw body for signature verification — do not parse as JSON
export const config = { api: { bodyParser: false } }

// ── Shared helpers ────────────────────────────────────────────────────────────

function softDeactivateFields() {
  const now       = new Date()
  const deletionAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return {
    active:                false,
    deactivated_at:        now.toISOString(),
    scheduled_deletion_at: deletionAt.toISOString(),
  }
}

function reactivateFields() {
  return {
    active:                true,
    deactivated_at:        null,
    scheduled_deletion_at: null,
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[webhook] Signature verification failed:', msg)
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  const { data: existingEvent } = await admin
    .from('stripe_events')
    .select('id')
    .eq('id', event.id)
    .maybeSingle()

  if (existingEvent) {
    console.log('[webhook] duplicate event ignored:', event.id)
    return NextResponse.json({ received: true })
  }

  try {
    switch (event.type) {

      // ── Checkout completed → activate + clear deactivation ─────────────────
      case 'checkout.session.completed': {
        const session      = event.data.object as Stripe.Checkout.Session
        const userId       = session.metadata?.supabase_user_id
        const plan         = session.metadata?.plan
        const customerId   = typeof session.customer    === 'string' ? session.customer    : session.customer?.id
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

        if (userId && plan) {
          await admin.from('profiles').update({
            plan,
            stripe_customer_id:     customerId     ?? undefined,
            stripe_subscription_id: subscriptionId ?? undefined,
            ...reactivateFields(),
          }).eq('id', userId)

          railwayReactivate(userId).catch((e: unknown) =>
            console.error('[webhook] Railway reactivate after checkout error:', e)
          )

          // Apply referral credit if this user was referred (non-fatal)
          applyReferralCredit(admin, userId).catch((e: unknown) =>
            console.error('[webhook] referral credit error (non-fatal):', e)
          )
        }
        break
      }

      // ── Subscription updated ───────────────────────────────────────────────
      case 'customer.subscription.updated': {
        const sub    = event.data.object as Stripe.Subscription
        const plan   = sub.metadata?.plan
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        const isActive    = sub.status === 'active' || sub.status === 'trialing'
        const isSuspended = sub.status === 'past_due' || sub.status === 'canceled' || sub.status === 'unpaid' || sub.status === 'incomplete_expired'

        if (isActive) {
          await admin.from('profiles').update({
            plan: plan ?? undefined,
            ...reactivateFields(),
          }).eq('id', userId)

          railwayReactivate(userId).catch((e: unknown) =>
            console.error('[webhook] Railway reactivate on sub update error:', e)
          )
        } else if (isSuspended) {
          await admin.from('profiles').update({
            plan: plan ?? undefined,
            ...softDeactivateFields(),
          }).eq('id', userId)

          railwayDeactivate(userId).catch((e: unknown) =>
            console.error('[webhook] Railway deactivate on sub update error:', e)
          )

          console.log(`[webhook] subscription ${sub.id} status=${sub.status} — account suspended for userId=${userId}`)
        }
        break
      }

      // ── Subscription deleted → soft-deactivate ─────────────────────────────
      case 'customer.subscription.deleted': {
        const sub    = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        await admin.from('profiles').update(softDeactivateFields()).eq('id', userId)

        railwayDeactivate(userId).catch((e: unknown) =>
          console.error('[webhook] Railway deactivate on sub deleted error:', e)
        )

        console.log(`[webhook] subscription deleted — account suspended for userId=${userId}`)
        break
      }

      // ── Payment failed → soft-deactivate ──────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as Stripe.Customer | null)?.id
        if (!customerId) break

        // Look up profile by stripe_customer_id (invoice doesn't carry supabase_user_id)
        const { data: profiles } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .eq('active', true)    // only suspend if currently active
          .limit(1)

        const profile = profiles?.[0]
        if (!profile) break

        await admin.from('profiles').update(softDeactivateFields()).eq('id', profile.id)

        railwayDeactivate(profile.id).catch((e: unknown) =>
          console.error('[webhook] Railway deactivate on payment failure error:', e)
        )

        console.log(`[webhook] payment failed for customerId=${customerId} — account suspended for profileId=${profile.id}`)
        break
      }

      // ── Invoice paid (retry succeeded) → reactivate ────────────────────────
      case 'invoice.paid': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as Stripe.Customer | null)?.id
        if (!customerId) break

        // Reactivate if the account was suspended due to a previous payment failure
        const { data: profiles } = await admin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .eq('active', false)
          .not('deactivated_at', 'is', null)
          .limit(1)

        const profile = profiles?.[0]
        if (!profile) break

        await admin.from('profiles').update(reactivateFields()).eq('id', profile.id)

        railwayReactivate(profile.id).catch((e: unknown) =>
          console.error('[webhook] Railway reactivate on invoice.paid error:', e)
        )

        console.log(`[webhook] invoice.paid — account reactivated for profileId=${profile.id}`)
        break
      }

      default:
        break
    }

    // Record processed event for idempotency (Stripe may retry webhooks)
    await admin.from('stripe_events').insert({ id: event.id, event_type: event.type })
  } catch (err) {
    console.error('[webhook] Handler error for', event.type, err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
