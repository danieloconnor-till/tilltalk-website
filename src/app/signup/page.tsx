'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import clsx from 'clsx'
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3'

const COUNTRY_CODES = [
  { key: 'IE', dialCode: '+353', label: '🇮🇪 Ireland (+353)' },
  { key: 'GB', dialCode: '+44',  label: '🇬🇧 UK (+44)' },
  { key: 'US', dialCode: '+1',   label: '🇺🇸 USA (+1)' },
  { key: 'AU', dialCode: '+61',  label: '🇦🇺 Australia (+61)' },
  { key: 'CA', dialCode: '+1',   label: '🇨🇦 Canada (+1)' },
  { key: 'DE', dialCode: '+49',  label: '🇩🇪 Germany (+49)' },
  { key: 'FR', dialCode: '+33',  label: '🇫🇷 France (+33)' },
  { key: 'ES', dialCode: '+34',  label: '🇪🇸 Spain (+34)' },
  { key: 'IT', dialCode: '+39',  label: '🇮🇹 Italy (+39)' },
  { key: 'NL', dialCode: '+31',  label: '🇳🇱 Netherlands (+31)' },
]

const PLAN_OPTIONS = [
  { key: 'starter', name: 'Starter', price: '€29/mo', description: '1 location, 2 numbers' },
  { key: 'pro',     name: 'Pro',     price: '€49/mo', description: '3 locations, 4 numbers',         popular: true },
  { key: 'business',name: 'Business',price: '€99/mo', description: '10 locations, unlimited numbers' },
]

function SignupForm() {
  const router = useRouter()
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
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('IE')
  const [localNumber, setLocalNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordsMatch = form.password.length > 0 && confirmPassword.length > 0 && form.password === confirmPassword

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  function buildWhatsappNumber(countryKey: string, local: string) {
    const dialCode = COUNTRY_CODES.find(c => c.key === countryKey)?.dialCode ?? '+353'
    const digits = local.replace(/\s/g, '').replace(/^0+/, '')
    return dialCode + digits
  }

  function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newKey = e.target.value
    setSelectedCountry(newKey)
    setForm(prev => ({ ...prev, whatsappNumber: buildWhatsappNumber(newKey, localNumber) }))
  }

  function handleLocalNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setLocalNumber(val)
    setForm(prev => ({ ...prev, whatsappNumber: buildWhatsappNumber(selectedCountry, val) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    console.log('[signup] handleSubmit fired', {
      passwordsMatch,
      agreeTerms: form.agreeTerms,
      posType: form.posType,
      passwordLength: form.password.length,
      executeRecaptcha: typeof executeRecaptcha,
      siteKey: !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
    })

    if (!form.agreeTerms) {
      console.log('[signup] blocked: terms not agreed')
      setError('You must agree to the Terms & Conditions to continue.')
      return
    }
    if (form.password.length < 8) {
      console.log('[signup] blocked: password too short')
      setError('Password must be at least 8 characters.')
      return
    }
    if (!form.posType) {
      console.log('[signup] blocked: no POS selected')
      setError('Please select your POS system.')
      return
    }

    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
    let recaptchaToken: string | null = null
    if (siteKey) {
      console.log('[signup] reCAPTCHA required — executeRecaptcha:', typeof executeRecaptcha)
      if (!executeRecaptcha) {
        setError('Security check failed — please refresh the page and try again.')
        return
      }
      recaptchaToken = await executeRecaptcha('signup')
      console.log('[signup] reCAPTCHA token obtained:', !!recaptchaToken)
    } else {
      console.log('[signup] reCAPTCHA site key not set — skipping')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, recaptchaToken }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong. Please try again.')
      } else {
        router.push('/signup/success')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
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
            id="fullName" name="fullName" type="text" required
            value={form.fullName} onChange={handleChange}
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
            id="email" name="email" type="email" required
            value={form.email} onChange={handleChange}
            placeholder="jane@mybusiness.com"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <div className="relative">
            <input
              id="password" name="password" type="password" required minLength={8}
              value={form.password} onChange={handleChange}
              onBlur={() => setPasswordTouched(true)}
              placeholder="Minimum 8 characters"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {passwordsMatch && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-base leading-none">✓</span>
            )}
          </div>
          {passwordTouched && form.password.length > 0 && form.password.length < 8 ? (
            <p className="mt-1.5 text-xs text-red-600">Password must be at least 8 characters</p>
          ) : (
            <p className="mt-1.5 text-xs text-gray-400">Minimum 8 characters</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password *
          </label>
          <div className="relative">
            <input
              id="confirmPassword" type="password" required
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {passwordsMatch && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-base leading-none">✓</span>
            )}
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1.5 text-xs text-red-600">Passwords do not match</p>
          )}
        </div>

        {/* Business Name */}
        <div>
          <label htmlFor="restaurantName" className="block text-sm font-medium text-gray-700 mb-1">
            Business Name *
          </label>
          <input
            id="restaurantName" name="restaurantName" type="text" required
            value={form.restaurantName} onChange={handleChange}
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
            id="posType" name="posType" required
            value={form.posType} onChange={handleChange}
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
          <label htmlFor="localNumber" className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp Number *
          </label>
          <div className="flex">
            <select
              value={selectedCountry}
              onChange={handleCountryChange}
              className="border border-gray-300 rounded-l-lg px-3 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-r-0 shrink-0"
            >
              {COUNTRY_CODES.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <input
              id="localNumber" type="tel" required
              value={localNumber}
              onChange={handleLocalNumberChange}
              placeholder="87 123 4567"
              className="flex-1 min-w-0 border border-gray-300 rounded-r-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Plan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Choose a plan *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PLAN_OPTIONS.map(({ key, name, price, description, popular }) => (
              <label
                key={key}
                className={clsx(
                  'relative cursor-pointer rounded-xl border-2 p-4 text-center transition-all',
                  form.plan === key ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <input
                  type="radio" name="plan" value={key}
                  checked={form.plan === key} onChange={handleChange}
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
            id="agreeTerms" name="agreeTerms" type="checkbox"
            checked={form.agreeTerms} onChange={handleChange}
            className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          <label htmlFor="agreeTerms" className="text-sm text-gray-700">
            I agree to the{' '}
            <Link href="/terms" className="text-green-600 hover:underline" target="_blank">Terms &amp; Conditions</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-green-600 hover:underline" target="_blank">Privacy Policy</Link>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit" disabled={loading || !passwordsMatch}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-4 rounded-xl transition-colors text-sm"
        >
          {loading ? 'Creating your account...' : 'Start your free 2-week trial — no card required'}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="text-green-600 hover:underline font-medium">Sign in</Link>
        </p>
      </form>
    </div>
  )
}

export default function SignupPage() {
  return (
    <GoogleReCaptchaProvider reCaptchaKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}>
      <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading...</div>}>
        <SignupForm />
      </Suspense>
    </GoogleReCaptchaProvider>
  )
}
