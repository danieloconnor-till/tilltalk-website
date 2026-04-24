'use client'

import { useState } from 'react'
import HowItWorks from '@/components/HowItWorks'
import DemoSection from '@/components/DemoSection'
import FeatureGrid from '@/components/FeatureGrid'
import SupportedPOS from '@/components/SupportedPOS'
import PricingCard from '@/components/PricingCard'
import TrustSection from '@/components/TrustSection'
import WaitlistChat from '@/components/WaitlistChat'
import { PLANS } from '@/lib/plans'
import { ArrowDown, MessageCircle } from 'lucide-react'

export default function Home() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')

  function scrollToChat() {
    document.getElementById('chat')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      {/* Hero */}
      <section className="bg-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Now live for hospitality &amp; retail businesses
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

          {/* Waitlist CTA */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <p className="text-base font-medium text-gray-700 max-w-md">
              We&apos;re onboarding new clients gradually — chat with us below to join the waitlist
            </p>
            <button
              onClick={scrollToChat}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-md flex items-center gap-2"
            >
              <MessageCircle size={20} />
              Chat with us
            </button>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm mt-2"
            >
              See how it works <ArrowDown size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* Prominent chat + QR section */}
      <section id="chat" className="py-16 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Join the waitlist</h2>
            <p className="mt-3 text-gray-600 max-w-xl mx-auto">
              Chat with us now or scan the QR code to message us directly on WhatsApp.
              We&apos;ll be in touch as soon as we&apos;re ready for you.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Inline chat widget */}
            <WaitlistChat />

            {/* QR code + WhatsApp CTA */}
            <div className="flex flex-col items-center justify-center gap-6 py-8">
              <p className="text-lg font-semibold text-gray-800">Or message us on WhatsApp</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://wa.me/353894633835&qzone=2"
                alt="Scan to chat on WhatsApp"
                width={200}
                height={200}
                className="rounded-2xl border border-gray-200 shadow-md"
              />
              <p className="text-sm text-gray-500 text-center">Scan with your phone camera<br />to open WhatsApp</p>
              <a
                href="https://wa.me/353894633835"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1fb856] text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm text-sm"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Open WhatsApp
              </a>
            </div>
          </div>
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
