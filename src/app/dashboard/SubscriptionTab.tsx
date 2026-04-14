'use client'

import { useState, useEffect } from 'react'
import {
  CreditCard, CheckCircle2, AlertCircle, RefreshCw,
  Zap, MapPin, Phone, ArrowRight,
} from 'lucide-react'
import { PLANS } from '@/lib/plans'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string
  plan?: string | null
  trial_start?: string | null
  trial_end?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
}

interface SubStatus {
  status: string
  interval: 'month' | 'year' | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({
  icon: Icon, title,
}: { icon: React.ComponentType<{ size: number; className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
        <Icon size={18} className="text-green-600" />
      </div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SubscriptionTab({ profile }: { profile: Profile | null }) {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')
  const [billingLoading,  setBillingLoading]  = useState<string | null>(null)
  const [subStatus,       setSubStatus]       = useState<SubStatus | null>(null)
  const [locationsCount,  setLocationsCount]  = useState(0)
  const [numbersCount,    setNumbersCount]    = useState(0)

  const currentPlan = (profile?.plan as keyof typeof PLANS) || 'starter'
  const planInfo    = PLANS[currentPlan]
  const isOnTrial   = !profile?.stripe_subscription_id

  const trialDaysLeft = profile?.trial_end
    ? Math.max(0, Math.ceil((new Date(profile.trial_end).getTime() - Date.now()) / 86_400_000))
    : 0
  const trialProgress = profile?.trial_end && profile?.trial_start
    ? Math.max(0, Math.min(100,
        (Date.now() - new Date(profile.trial_start).getTime()) /
        (new Date(profile.trial_end).getTime() - new Date(profile.trial_start).getTime()) * 100
      ))
    : 0

  useEffect(() => {
    fetch('/api/billing/status')
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => { if (d) setSubStatus(d) })

    fetch('/api/manage/locations')
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => setLocationsCount((d?.locations ?? []).filter((l: { active: boolean }) => l.active).length))

    fetch('/api/manage/numbers')
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => setNumbersCount((d?.numbers ?? []).filter((n: { active: boolean }) => n.active).length))
  }, [])

  async function handlePortal() {
    setBillingLoading('portal')
    try {
      const res  = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally { setBillingLoading(null) }
  }

  async function handleCheckout(plan: string) {
    setBillingLoading(plan)
    try {
      const res  = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval: billingInterval }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally { setBillingLoading(null) }
  }

  const billingPeriodLabel = subStatus?.interval === 'year' ? 'Annual' : 'Monthly'
  const billingPrice = subStatus?.interval === 'year' ? planInfo?.annualPrice : planInfo?.monthlyPrice
  const billingUnit  = subStatus?.interval === 'year' ? '/yr' : '/mo'

  return (
    <div className="space-y-4">

      {/* ── Current plan ───────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={CreditCard} title="Your Plan" />

        {isOnTrial ? (
          <div className="space-y-4">
            <div className={`flex items-start gap-3 p-3 rounded-xl border ${
              trialDaysLeft > 0 ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'
            }`}>
              {trialDaysLeft > 0
                ? <CheckCircle2 className="text-green-500 shrink-0 mt-0.5" size={16} />
                : <AlertCircle  className="text-amber-500 shrink-0 mt-0.5" size={16} />}
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {trialDaysLeft > 0
                    ? `Free trial — ${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} remaining`
                    : 'Your free trial has ended'}
                </p>
                {profile?.trial_end && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {trialDaysLeft > 0 ? 'Expires' : 'Expired'}{' '}
                    {new Date(profile.trial_end).toLocaleDateString('en-IE', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
            {trialDaysLeft > 0 && (
              <div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${trialProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">Trial progress</p>
              </div>
            )}
            <p className="text-sm text-gray-500">Subscribe to a plan below to keep full access after your trial.</p>
          </div>

        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {planInfo?.name} Plan
                  {subStatus?.cancel_at_period_end && (
                    <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Cancels at period end
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  €{billingPrice}{billingUnit} · {billingPeriodLabel} billing
                </p>
              </div>
              <button
                onClick={handlePortal}
                disabled={billingLoading === 'portal'}
                className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-4 py-2 rounded-lg transition-colors min-h-[40px] disabled:opacity-50 shrink-0"
              >
                {billingLoading === 'portal'
                  ? <RefreshCw size={13} className="animate-spin" />
                  : <CreditCard size={13} />}
                Manage billing
              </button>
            </div>

            {subStatus?.current_period_end && (
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5">
                <span className="text-gray-400">Next billing date</span>
                <span className="font-medium text-gray-700">
                  {new Date(subStatus.current_period_end).toLocaleDateString('en-IE', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── Usage ──────────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={MapPin} title="Usage" />
        <div className="space-y-5">
          {([
            { label: 'Locations connected', used: locationsCount, limit: planInfo?.locations ?? 1,  Icon: MapPin  },
            { label: 'WhatsApp numbers',    used: numbersCount,   limit: planInfo?.numbers  ?? 999, Icon: Phone   },
          ] as { label: string; used: number; limit: number; Icon: typeof MapPin }[]).map(({ label, used, limit, Icon }) => {
            const unlimited = limit >= 999
            const pct = unlimited ? 0 : Math.min(100, (used / limit) * 100)
            const over = !unlimited && used >= limit
            const near = !unlimited && !over && pct >= 80
            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Icon size={13} className="text-gray-400" />
                    {label}
                  </div>
                  <span className={`text-sm font-semibold ${over ? 'text-red-600' : 'text-gray-900'}`}>
                    {used}
                    <span className="font-normal text-gray-400"> / {unlimited ? '∞' : limit}</span>
                  </span>
                </div>
                {!unlimited && (
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all ${
                        over ? 'bg-red-500' : near ? 'bg-amber-400' : 'bg-green-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                {over && (
                  <p className="text-xs text-red-600 mt-1">
                    Over limit — upgrade your plan to add more.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Change plan ────────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Zap} title="Change Plan" />

        {/* Interval toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-5">
          {(['monthly', 'annual'] as const).map(iv => (
            <button
              key={iv}
              onClick={() => setBillingInterval(iv)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                billingInterval === iv
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {iv === 'monthly' ? 'Monthly' : 'Annual (2 months free)'}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['starter', 'pro', 'business'] as const).map(p => {
            const pi        = PLANS[p]
            const isCurrent = p === currentPlan && !isOnTrial
            const price     = billingInterval === 'monthly' ? pi.monthlyPrice : pi.annualPrice
            const isLoading = billingLoading === p
            return (
              <div
                key={p}
                className={`border rounded-xl p-4 flex flex-col gap-3 ${
                  isCurrent
                    ? 'border-green-500 ring-1 ring-green-500 bg-green-50/40'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{pi.name}</p>
                    <p className="text-xl font-bold text-green-700 mt-0.5 leading-none">
                      €{price}
                      <span className="text-xs font-normal text-gray-500">
                        {billingInterval === 'monthly' ? '/mo' : '/yr'}
                      </span>
                    </p>
                  </div>
                  {isCurrent && (
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                      Current
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5 flex-1">
                  {pi.features.map(f => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <CheckCircle2 size={11} className="text-green-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <button
                    onClick={handlePortal}
                    disabled={!!billingLoading}
                    className="w-full text-xs font-medium text-green-700 border border-green-300 hover:bg-green-50 px-3 py-2.5 rounded-lg transition-colors min-h-[40px] disabled:opacity-50"
                  >
                    Manage
                  </button>
                ) : (
                  <button
                    onClick={() => handleCheckout(p)}
                    disabled={!!billingLoading}
                    className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-xs font-semibold px-3 py-2.5 rounded-lg transition-colors min-h-[40px]"
                  >
                    {isLoading
                      ? <RefreshCw size={13} className="animate-spin" />
                      : <ArrowRight size={13} />}
                    {isLoading ? 'Redirecting…' : isOnTrial ? 'Subscribe' : 'Switch plan'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Cancel ─────────────────────────────────────────────────────── */}
      {!isOnTrial && (
        <p className="text-xs text-center text-gray-400 pb-2">
          To cancel your subscription, open the{' '}
          <button
            onClick={handlePortal}
            disabled={billingLoading === 'portal'}
            className="underline underline-offset-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            billing portal
          </button>
          .
        </p>
      )}
    </div>
  )
}
