import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, string>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { merchantId, apiKey, apiSecret, addressStreet, addressCity, addressCountry } = body

  // Build update — only include fields that were actually provided
  const updates: Record<string, string> = {}
  if (merchantId !== undefined) updates.pos_merchant_id = merchantId.trim()
  if (apiKey)      updates.pos_api_key    = apiKey.trim()
  if (apiSecret)   updates.pos_api_secret = apiSecret.trim()
  if (addressStreet  !== undefined) updates.pos_address_street  = addressStreet.trim()
  if (addressCity    !== undefined) updates.pos_address_city    = addressCity.trim()
  if (addressCountry !== undefined) updates.pos_address_country = addressCountry.trim()

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
