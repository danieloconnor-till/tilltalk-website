'use client'

import Link from 'next/link'
import { useState } from 'react'
import HowItWorks from '@/components/HowItWorks'
import DemoSection from '@/components/DemoSection'
import FeatureGrid from '@/components/FeatureGrid'
import SupportedPOS from '@/components/SupportedPOS'
import PricingCard from '@/components/PricingCard'
import TrustSection from '@/components/TrustSection'
import { PLANS } from '@/lib/plans'
import { ArrowDown } from 'lucide-react'

export default function Home() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  return (
    <>
      {/* Hero */}
      <section className="bg-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Now live for Irish restaurants
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
            Talk to your POS on{' '}
            <span className="text-green-600">WhatsApp.</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
            Get instant sales insights — no dashboards needed.
          </p>
          <p className="mt-3 text-lg text-gray-500 max-w-2xl mx-auto">
            Ask natural questions like{' '}
            <span className="italic text-gray-700">&quot;What sold best this week?&quot;</span>{' '}
            and get answers in seconds.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-md"
            >
              Start Free Trial — 2 Weeks Free
            </Link>
            <a
              href="#how-it-works"
              className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 font-medium px-8 py-4 rounded-xl border border-gray-200 hover:border-gray-300 transition-colors text-lg"
            >
              See how it works <ArrowDown size={18} />
            </a>
          </div>
          <p className="mt-5 text-sm text-gray-400">
            No credit card required · Cancel anytime · Setup in 5 minutes
          </p>
        </div>
      </section>

      <HowItWorks />
      <DemoSection />
      <FeatureGrid />
      <SupportedPOS />

      {/* Pricing */}
      <section id="pricing" className="py-20 bg-gray-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              First 2 weeks free — no card required. Cancel anytime.
            </p>

            {/* Billing toggle */}
            <div className="mt-8 inline-flex items-center bg-white border border-gray-200 rounded-xl p-1">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  billingPeriod === 'annual'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Annual
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${billingPeriod === 'annual' ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700'}`}>
                  2 months free
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <PricingCard
              planKey="starter"
              name={PLANS.starter.name}
              monthlyPrice={PLANS.starter.monthlyPrice}
              annualPrice={PLANS.starter.annualPrice}
              features={PLANS.starter.features}
              isPopular={false}
              billingPeriod={billingPeriod}
            />
            <PricingCard
              planKey="pro"
              name={PLANS.pro.name}
              monthlyPrice={PLANS.pro.monthlyPrice}
              annualPrice={PLANS.pro.annualPrice}
              features={PLANS.pro.features}
              isPopular={true}
              billingPeriod={billingPeriod}
            />
            <PricingCard
              planKey="business"
              name={PLANS.business.name}
              monthlyPrice={PLANS.business.monthlyPrice}
              annualPrice={PLANS.business.annualPrice}
              features={PLANS.business.features}
              isPopular={false}
              billingPeriod={billingPeriod}
            />
          </div>
        </div>
      </section>

      <TrustSection />
    </>
  )
}
