'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import { Suspense } from 'react'
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3'

const PLAN_OPTIONS = [
  {
    key: 'starter',
    name: 'Starter',
    price: '€29/mo',
    description: '1 location, 2 numbers',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '€49/mo',
    description: '3 locations, 4 numbers',
    popular: true,
  },
  {
    key: 'business',
    name: 'Business',
    price: '€99/mo',
    description: '10 locations, unlimited numbers',
  },
]

function SignupForm() {
  const searchParams = useSearchParams()
  const defaultPlan = (searchParams.get('plan') as 'starter' | 'pro' | 'business') || 'pro'
  const { executeRecaptcha } = useGoogleReCaptcha()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    restaurantName: '',
    posType: '',
    whatsappNumber: '',
    plan: defaultPlan,
    agreeTerms: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.agreeTerms) {
      setError('You must agree to the Terms & Conditions to continue.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!form.posType) {
      setError('Please select your POS system.')
      return
    }

    // TODO: re-enable reCAPTCHA after core signup flow is verified
    // if (!executeRecaptcha) {
    //   setError('reCAPTCHA not ready. Please refresh the page and try again.')
    //   return
    // }

    setLoading(true)
    try {
      // const recaptchaToken = await executeRecaptcha('signup')
      const recaptchaToken = 'disabled-for-testing'

      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptchaToken }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [form, executeRecaptcha])

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16 px-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-green-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          You&apos;re all set! 🎉
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-left space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-green-500 mt-0.5 shrink-0" size={18} />
            <p className="text-sm text-gray-700">Check your email to confirm your account</p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-green-500 mt-0.5 shrink-0" size={18} />
            <p className="text-sm text-gray-700">
              You&apos;ll receive WhatsApp setup instructions within 24 hours
            </p>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="text-green-500 mt-0.5 shrink-0" size={18} />
            <p className="text-sm text-gray-700">Your 14-day free trial starts now</p>
          </div>
        </div>
        <p className="mt-6 text-sm text-gray-500">
          Questions?{' '}
          <a href="mailto:hello@tilltalk.ie" className="text-green-600 hover:underline">
            hello@tilltalk.ie
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Start your free trial</h1>
        <p className="mt-2 text-gray-600">14 days free — no credit card required</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            value={form.fullName}
            onChange={handleChange}
            placeholder="Jane Smith"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={form.email}
            onChange={handleChange}
            placeholder="jane@mybusiness.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
            placeholder="Minimum 8 characters"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Business Name */}
        <div>
          <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 mb-1">
            Business Name *
          </label>
          <input
            id="restaurantName"
            name="restaurantName"
            type="text"
            required
            value={form.restaurantName}
            onChange={handleChange}
            placeholder="The Rusty Anchor Café"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* POS Type */}
        <div>
          <label htmlFor="posType" className="block text-sm font-medium text-gray-700 mb-1">
            POS System *
          </label>
          <select
            id="posType"
            name="posType"
            required
            value={form.posType}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
          >
            <option value="">Select your POS system</option>
            <option value="clover">Clover</option>
            <option value="square">Square</option>
            <option value="eposnow">Epos Now</option>
          </select>
        </div>

        {/* WhatsApp Number */}
        <div>
          <label htmlFor="whatsappNumber" className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp Number *
          </label>
          <input
            id="whatsappNumber"
            name="whatsappNumber"
            type="tel"
            required
            value={form.whatsappNumber}
            onChange={handleChange}
            placeholder="+353 87 123 4567"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">Include country code, e.g. +353 for Ireland</p>
        </div>

        {/* Plan selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Choose a plan *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PLAN_OPTIONS.map(({ key, name, price, description, popular }) => (
              <label
                key={key}
                className={clsx(
                  'relative cursor-pointer rounded-xl border-2 p-4 text-center transition-all',
                  form.plan === key
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <input
                  type="radio"
                  name="plan"
                  value={key}
                  checked={form.plan === key}
                  onChange={handleChange}
                  className="sr-only"
                />
                {popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Popular
                  </span>
                )}
                <p className="font-bold text-gray-900 text-sm">{name}</p>
                <p className="text-green-600 font-semibold text-sm mt-1">{price}</p>
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              </label>
            ))}
          </div>
        </div>

        {/* T&Cs */}
        <div className="flex items-start gap-3">
          <input
            id="agreeTerms"
            name="agreeTerms"
            type="checkbox"
            checked={form.agreeTerms}
            onChange={handleChange}
            className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          <label htmlFor="agreeTerms" className="text-sm text-gray-700">
            I agree to the{' '}
            <Link href="/terms" className="text-green-600 hover:underline" target="_blank">
              Terms &amp; Conditions
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-green-600 hover:underline" target="_blank">
              Privacy Policy
            </Link>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-4 rounded-xl transition-colors text-sm"
        >
          {loading ? 'Creating your account...' : 'Start your free 2-week trial — no card required'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}

export default function SignupPage() {
  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? ''}
    >
      <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </GoogleReCaptchaProvider>
  )
}
