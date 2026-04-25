'use client'

import { Check } from 'lucide-react'
import clsx from 'clsx'

interface PricingCardProps {
  name: string
  monthlyPrice: number
  annualPrice: number
  features: readonly string[]
  isPopular?: boolean
  billingPeriod: 'monthly' | 'annual'
}

export default function PricingCard({
  name,
  monthlyPrice,
  annualPrice,
  features,
  isPopular,
  billingPeriod,
}: PricingCardProps) {
  const price = billingPeriod === 'annual' ? annualPrice : monthlyPrice
  const periodLabel = billingPeriod === 'annual' ? '/year' : '/month'

  return (
    <div
      className={clsx(
        'relative bg-white rounded-2xl p-8 flex flex-col',
        isPopular
          ? 'ring-2 ring-green-500 shadow-xl'
          : 'border border-gray-200 shadow-sm'
      )}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-green-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">{name}</h3>
        <div className="mt-3 flex items-end gap-1">
          <span className="text-4xl font-extrabold text-gray-900">€{price}</span>
          <span className="text-gray-500 mb-1">{periodLabel}</span>
        </div>
        {billingPeriod === 'annual' && (
          <p className="text-sm text-green-600 mt-1 font-medium">2 months free</p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="text-green-500 shrink-0 mt-0.5" size={18} />
            <span className="text-sm text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' })}
        className={clsx(
          'block w-full text-center font-semibold py-3 px-6 rounded-lg transition-colors text-sm',
          isPopular
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
        )}
      >
        Start Free Trial
      </button>
    </div>
  )
}
