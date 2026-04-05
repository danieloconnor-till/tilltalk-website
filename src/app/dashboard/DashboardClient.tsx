'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PLANS } from '@/lib/plans'
import {
  User,
  CreditCard,
  Shield,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface Profile {
  id: string
  email: string
  full_name: string | null
  restaurant_name: string | null
  pos_type: string | null
  whatsapp_number: string | null
  plan: string | null
  trial_start: string | null
  trial_end: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  active: boolean
  created_at: string
}

interface Props {
  user: SupabaseUser
  profile: Profile | null
}

function getTrialDaysLeft(trialEnd: string | null): number {
  if (!trialEnd) return 0
  const end = new Date(trialEnd)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function DashboardClient({ user, profile }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    restaurantName: profile?.restaurant_name || '',
    whatsappNumber: profile?.whatsapp_number || '',
    fullName: profile?.full_name || '',
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [deletingData, setDeletingData] = useState(false)

  const trialDaysLeft = getTrialDaysLeft(profile?.trial_end || null)
  const isOnTrial = !profile?.stripe_subscription_id
  const currentPlan = (profile?.plan as keyof typeof PLANS) || 'starter'
  const planInfo = PLANS[currentPlan]

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg('')
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        restaurant_name: editForm.restaurantName,
        whatsapp_number: editForm.whatsappNumber,
        full_name: editForm.fullName,
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      setSaveMsg('Error saving. Please try again.')
    } else {
      setSaveMsg('Saved successfully!')
      setEditing(false)
      router.refresh()
    }
  }

  async function handleRequestDeletion() {
    setDeletingData(true)
    await fetch('mailto:privacy@tilltalk.ie')
    alert(
      'To request data deletion, please email privacy@tilltalk.ie with your account email. We will process your request within 30 days.'
    )
    setDeletingData(false)
  }

  const trialProgress = profile?.trial_end && profile?.trial_start
    ? Math.max(
        0,
        Math.min(
          100,
          ((new Date().getTime() - new Date(profile.trial_start).getTime()) /
            (new Date(profile.trial_end).getTime() -
              new Date(profile.trial_start).getTime())) *
            100
        )
      )
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {profile?.restaurant_name || profile?.full_name || user.email}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>

        <div className="space-y-6">
          {/* Trial / Subscription Status */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CreditCard className="text-green-600" size={18} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
            </div>

            {isOnTrial ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {trialDaysLeft > 0 ? (
                    <CheckCircle2 className="text-green-500" size={18} />
                  ) : (
                    <AlertCircle className="text-amber-500" size={18} />
                  )}
                  <p className="font-medium text-gray-900">
                    {trialDaysLeft > 0
                      ? `Free trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining`
                      : 'Your trial has ended'}
                  </p>
                </div>

                {trialDaysLeft > 0 && (
                  <div className="mb-4">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${trialProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Trial expires on{' '}
                      {profile?.trial_end
                        ? new Date(profile.trial_end).toLocaleDateString('en-IE', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    Add card details to continue after your trial
                  </p>
                  <p className="text-xs text-blue-600">
                    Full Stripe integration requires webhook setup. Contact{' '}
                    <a href="mailto:hello@tilltalk.ie" className="underline">
                      hello@tilltalk.ie
                    </a>{' '}
                    to upgrade your plan.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-500" size={18} />
                  <p className="font-medium text-gray-900">
                    Active — {planInfo?.name} Plan (€{planInfo?.monthlyPrice}/month)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <User className="text-green-600" size={18} />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Account Details</h2>
              </div>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-green-600 hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={editForm.restaurantName}
                    onChange={(e) => setEditForm((p) => ({ ...p, restaurantName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.whatsappNumber}
                    onChange={(e) => setEditForm((p) => ({ ...p, whatsappNumber: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                {saveMsg && (
                  <p className={`text-sm ${saveMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                    {saveMsg}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="text-sm text-gray-600 hover:text-gray-900 px-5 py-2 rounded-lg border border-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <dl className="space-y-3">
                {[
                  { label: 'Full Name', value: profile?.full_name || '—' },
                  { label: 'Email', value: user.email || '—' },
                  { label: 'Business', value: profile?.restaurant_name || '—' },
                  { label: 'POS System', value: profile?.pos_type ? profile.pos_type.charAt(0).toUpperCase() + profile.pos_type.slice(1) : '—' },
                  { label: 'WhatsApp', value: profile?.whatsapp_number || '—' },
                  { label: 'Plan', value: planInfo?.name || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center">
                    <dt className="text-sm text-gray-500 w-36 shrink-0">{label}</dt>
                    <dd className="text-sm font-medium text-gray-900">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Billing */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CreditCard className="text-green-600" size={18} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Billing</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <span className="text-sm text-gray-600">Current plan</span>
                <span className="text-sm font-medium text-gray-900">
                  {planInfo?.name} — €{planInfo?.monthlyPrice}/month
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  To upgrade, downgrade or manage billing, please contact{' '}
                  <a href="mailto:hello@tilltalk.ie" className="text-green-600 hover:underline">
                    hello@tilltalk.ie
                  </a>
                  . Full Stripe self-service billing requires webhook setup.
                </p>
              </div>

              <div className="flex gap-3">
                {(['starter', 'pro', 'business'] as const)
                  .filter((p) => p !== currentPlan)
                  .map((p) => (
                    <a
                      key={p}
                      href="mailto:hello@tilltalk.ie?subject=Plan change request"
                      className="text-sm border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-lg text-gray-700 transition-colors"
                    >
                      Switch to {PLANS[p].name}
                    </a>
                  ))}
              </div>
            </div>
          </div>

          {/* Data & Privacy */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Shield className="text-green-600" size={18} />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Data &amp; Privacy</h2>
            </div>

            <div className="space-y-3 mb-6">
              <p className="text-sm font-medium text-gray-700">Data stored for your account:</p>
              {[
                'Email address',
                'Full name',
                'Restaurant name',
                'POS system type',
                'WhatsApp number',
                'Plan and subscription status',
                'Account creation date',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-400 shrink-0" size={14} />
                  <span className="text-sm text-gray-600">{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleRequestDeletion}
              disabled={deletingData}
              className="text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors"
            >
              Request data deletion
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Your data will be permanently deleted within 30 days of your request.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
