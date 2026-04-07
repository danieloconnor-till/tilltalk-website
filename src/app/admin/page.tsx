import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

const ADMIN_EMAIL = 'daniel@tilltalk.ie'

const PLAN_PRICES: Record<string, number> = { starter: 29, pro: 49, business: 99 }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  const admin = createServiceRoleClient()
  const { data: rawProfiles } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profiles = (rawProfiles || []) as any[]

  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const activeTrials = profiles.filter(
    (p) => !p.stripe_subscription_id && p.trial_end && new Date(p.trial_end) > now && p.active,
  )
  const expiringSoon = activeTrials.filter((p) => new Date(p.trial_end) <= in7Days)
  const paidSubscribers = profiles.filter((p) => p.stripe_subscription_id && p.active)

  const paidByPlan: Record<string, number> = { starter: 0, pro: 0, business: 0 }
  paidSubscribers.forEach((p) => {
    const plan = p.plan as string
    if (plan in paidByPlan) paidByPlan[plan]++
  })

  const mrr = paidSubscribers.reduce((s: number, p) => s + (PLAN_PRICES[p.plan ?? ''] ?? 0), 0)
  const arr = mrr * 12

  const churnThisMonth = profiles.filter(
    (p) => !p.active && new Date(p.created_at) >= startOfMonth,
  ).length

  const totalExpiredTrials = profiles.filter(
    (p) => !p.stripe_subscription_id && p.trial_end && new Date(p.trial_end) <= now,
  ).length
  const conversionRate =
    totalExpiredTrials + paidSubscribers.length > 0
      ? Math.round((paidSubscribers.length / (totalExpiredTrials + paidSubscribers.length)) * 100)
      : 0

  const ghostSignups = activeTrials.filter((p) => !p.pos_merchant_id).length

  // Signups per day — last 30 days
  const dayMap: Record<string, number> = {}
  const cursor = new Date(thirtyDaysAgo)
  cursor.setHours(0, 0, 0, 0)
  while (cursor <= now) {
    dayMap[cursor.toISOString().slice(0, 10)] = 0
    cursor.setDate(cursor.getDate() + 1)
  }
  profiles.forEach((p) => {
    const d = new Date(p.created_at).toISOString().slice(0, 10)
    if (d in dayMap) dayMap[d]++
  })
  const signupsPerDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }))

  // POS breakdown
  const posMap: Record<string, number> = {}
  profiles.forEach((p) => { if (p.pos_type) posMap[p.pos_type] = (posMap[p.pos_type] ?? 0) + 1 })
  const posBreakdown = Object.entries(posMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // UTM breakdown
  const utmMap: Record<string, number> = {}
  profiles.forEach((p) => {
    const src = (p.utm_source as string | null) ?? 'direct'
    utmMap[src] = (utmMap[src] ?? 0) + 1
  })
  const utmBreakdown = Object.entries(utmMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  const stats = {
    total: profiles.length,
    signupsThisMonth: profiles.filter((p) => new Date(p.created_at) >= startOfMonth).length,
    activeTrials: activeTrials.length,
    expiringSoon,
    paidByPlan,
    mrr,
    arr,
    churnThisMonth,
    conversionRate,
    ghostSignups,
    activeSubscriptions: paidSubscribers.length,
    expired: totalExpiredTrials,
  }

  return (
    <AdminClient
      profiles={profiles}
      stats={stats}
      signupsPerDay={signupsPerDay}
      posBreakdown={posBreakdown}
      utmBreakdown={utmBreakdown}
      adminEmail={user?.email ?? ''}
    />
  )
}
