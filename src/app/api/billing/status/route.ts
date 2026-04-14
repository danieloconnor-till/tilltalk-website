import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({
      status: 'trial',
      interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
    })
  }

  try {
    const sub = await stripe.subscriptions.retrieve(profile.stripe_subscription_id)
    return NextResponse.json({
      status: sub.status,
      interval: sub.items.data[0]?.price.recurring?.interval ?? null,
      current_period_end: sub.items.data[0]?.current_period_end
        ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
    })
  } catch {
    return NextResponse.json({
      status: 'unknown',
      interval: null,
      current_period_end: null,
      cancel_at_period_end: false,
    })
  }
}
