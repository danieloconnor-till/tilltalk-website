import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const adminClient = createServiceRoleClient()
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  const profiles_list = profiles || []

  const stats = {
    total: profiles_list.length,
    activeTrials: profiles_list.filter(
      (p) => !p.stripe_subscription_id && new Date(p.trial_end) > new Date() && p.active
    ).length,
    activeSubscriptions: profiles_list.filter((p) => p.stripe_subscription_id && p.active).length,
    expired: profiles_list.filter(
      (p) => !p.stripe_subscription_id && new Date(p.trial_end) <= new Date()
    ).length,
  }

  return <AdminClient profiles={profiles_list} stats={stats} adminEmail={user?.email || ''} />
}
