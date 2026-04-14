import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import DeactivatedPage from './DeactivatedPage'

const ADMIN_EMAIL = 'daniel@tilltalk.ie'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Owner account — redirect straight to admin dashboard
  if (user.email === ADMIN_EMAIL) {
    redirect('/admin')
  }

  const { data: raw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Block deactivated accounts — show message instead of dashboard
  if (raw?.deactivated_at) {
    return <DeactivatedPage />
  }

  // Never send credential values to the client — only boolean indicators
  const profile = raw ? (() => {
    const { pos_api_key, pos_api_secret, ...rest } = raw as Record<string, unknown>
    return {
      ...rest,
      pos_api_key_set: !!pos_api_key,
      pos_api_secret_set: !!pos_api_secret,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  })() : null

  return <DashboardClient user={user} profile={profile} />
}
