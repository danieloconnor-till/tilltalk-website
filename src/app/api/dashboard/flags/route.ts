import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// GET /api/dashboard/flags
// Returns whether the current user has any unresolved flags.
// Used by the dashboard to show a subtle support banner.

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ has_flags: false })

  try {
    const admin = createServiceRoleClient()
    const { count } = await admin
      .from('flags')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', user.id)
      .eq('resolved', false)

    return NextResponse.json({ has_flags: (count ?? 0) > 0, count: count ?? 0 })
  } catch {
    return NextResponse.json({ has_flags: false })
  }
}
