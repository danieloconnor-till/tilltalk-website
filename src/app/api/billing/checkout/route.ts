import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { stripe, STRIPE_PRICES } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { plan, interval } = await req.json() as { plan: string; interval: string }

  if (!plan || !interval) {
    return NextResponse.json({ error: 'Missing plan or interval' }, { status: 400 })
  }
  const priceId = STRIPE_PRICES[plan]?.[interval]
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan or interval' }, { status: 400 })
  }

  // Get or create Stripe customer
  const admin = createServiceRoleClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, full_name')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: 'https://tilltalk.ie/dashboard?upgraded=true',
    cancel_url:  'https://tilltalk.ie/dashboard',
    metadata: { supabase_user_id: user.id, plan, interval },
    subscription_data: { metadata: { supabase_user_id: user.id, plan } },
  })

  return NextResponse.json({ url: session.url })
}
