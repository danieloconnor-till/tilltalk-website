import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

// POST /api/admin/cleanup-expired
// Purges accounts whose scheduled_deletion_at has passed.
// Call manually from the admin panel or via a cron job.
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== 'daniel@tilltalk.ie') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createServiceRoleClient()

    // Find all profiles past their scheduled deletion date
    const { data: expired, error: fetchError } = await admin
      .from('profiles')
      .select('id, email, restaurant_name')
      .eq('active', false)
      .not('scheduled_deletion_at', 'is', null)
      .lte('scheduled_deletion_at', new Date().toISOString())

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!expired || expired.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'No expired accounts to purge.' })
    }

    const results: { email: string; ok: boolean; error?: string }[] = []

    for (const profile of expired) {
      // Deleting the auth user cascades to profiles (and all related data via FK)
      const { error } = await admin.auth.admin.deleteUser(profile.id)
      results.push({
        email: profile.email,
        ok: !error,
        ...(error ? { error: error.message } : {}),
      })
    }

    const deleted = results.filter(r => r.ok).length
    console.log(`[cleanup-expired] Purged ${deleted}/${expired.length} expired accounts`)

    return NextResponse.json({ deleted, total: expired.length, results })
  } catch (err) {
    console.error('[cleanup-expired] Error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
