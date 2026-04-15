import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/admin'

const ADMIN_EMAIL = 'daniel@tilltalk.ie'

async function requireAdmin() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) return null
  return user
}

export async function GET(request: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const posType = url.searchParams.get('pos_type')
  if (!posType) {
    return NextResponse.json({ error: 'pos_type required' }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('sandbox_clients')
    .select('pos_type, api_token, merchant_id, api_base')
    .eq('pos_type', posType)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

export async function PUT(request: Request) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { pos_type, api_token, merchant_id, api_base } = body

  if (!pos_type) {
    return NextResponse.json({ error: 'pos_type required' }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const { error } = await admin
    .from('sandbox_clients')
    .upsert(
      { pos_type, api_token: api_token ?? '', merchant_id: merchant_id ?? '', api_base: api_base ?? '', updated_at: new Date().toISOString() },
      { onConflict: 'pos_type' },
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
