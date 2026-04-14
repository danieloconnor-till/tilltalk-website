import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { railwayDeactivate, railwayReactivate } from '@/lib/railway'
import Stripe from 'stripe'

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
  } catch (err) {
    console.error('[webhook] Handler error for', event.type, err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
