'use client'

/*
 * Signup form commented out — waitlist mode active.
 * Restore by uncommenting the SignupForm component and export below.
 */

// import { useState, useEffect, Suspense } from 'react'
// import Link from 'next/link'
// import { useRouter, useSearchParams } from 'next/navigation'
// import clsx from 'clsx'
//
// declare global {
//   interface Window {
//     turnstile: {
//       render: (container: string, options: {
//         sitekey: string
//         callback: (token: string) => void
//         theme?: string
//       }) => string
//     }
//   }
// }
//
// const COUNTRY_CODES = [
//   { key: 'IE', dialCode: '+353', label: '🇮🇪 Ireland (+353)' },
//   { key: 'GB', dialCode: '+44',  label: '🇬🇧 UK (+44)' },
//   { key: 'US', dialCode: '+1',   label: '🇺🇸 USA (+1)' },
//   { key: 'AU', dialCode: '+61',  label: '🇦🇺 Australia (+61)' },
//   { key: 'CA', dialCode: '+1',   label: '🇨🇦 Canada (+1)' },
//   { key: 'DE', dialCode: '+49',  label: '🇩🇪 Germany (+49)' },
//   { key: 'FR', dialCode: '+33',  label: '🇫🇷 France (+33)' },
//   { key: 'ES', dialCode: '+34',  label: '🇪🇸 Spain (+34)' },
//   { key: 'IT', dialCode: '+39',  label: '🇮🇹 Italy (+39)' },
//   { key: 'NL', dialCode: '+31',  label: '🇳🇱 Netherlands (+31)' },
// ]
//
// const PLAN_OPTIONS = [
//   { key: 'starter', name: 'Starter', price: '€29/mo', description: '1 location, 2 numbers' },
//   { key: 'pro',     name: 'Pro',     price: '€49/mo', description: '3 locations, 4 numbers',         popular: true },
//   { key: 'business',name: 'Business',price: '€99/mo', description: '10 locations, unlimited numbers' },
// ]
//
// function SignupForm() {
//   const router = useRouter()
//   const searchParams = useSearchParams()
//   const defaultPlan = (searchParams.get('plan') as 'starter' | 'pro' | 'business') || 'pro'
//   const utmSource = searchParams.get('utm_source') || ''
//   const refCode = searchParams.get('ref') || ''
//   const [form, setForm] = useState({
//     fullName: '',
//     email: '',
//     password: '',
//     restaurantName: '',
//     posType: '',
//     whatsappNumber: '',
//     plan: defaultPlan,
//     agreeTerms: false,
//   })
//   const [confirmPassword, setConfirmPassword] = useState('')
//   const [passwordTouched, setPasswordTouched] = useState(false)
//   const [selectedCountry, setSelectedCountry] = useState('IE')
//   const [localNumber, setLocalNumber] = useState('')
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')
//   const [turnstileToken, setTurnstileToken] = useState('')
//
//   useEffect(() => {
//     const script = document.createElement('script')
//     script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
//     script.async = true
//     script.defer = true
//     script.onload = () => {
//       window.turnstile.render('#turnstile-container', {
//         sitekey: '0x4AAAAAAC1ojDJtV4BU68ah',
//         callback: (token: string) => setTurnstileToken(token),
//         theme: 'light',
//       })
//     }
//     document.head.appendChild(script)
//     return () => { document.head.removeChild(script) }
//   }, [])
//
//   const passwordsMatch = form.password.length > 0 && confirmPassword.length > 0 && form.password === confirmPassword
//
//   function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
//     const { name, value, type } = e.target
//     setForm((prev) => ({
//       ...prev,
//       [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
//     }))
//   }
//
//   function buildWhatsappNumber(countryKey: string, local: string) {
//     const dialCode = COUNTRY_CODES.find(c => c.key === countryKey)?.dialCode ?? '+353'
//     const digits = local.replace(/\s/g, '').replace(/^0+/, '')
//     return dialCode + digits
//   }
//
//   function handleCountryChange(e: React.ChangeEvent<HTMLSelectElement>) {
//     const newKey = e.target.value
//     setSelectedCountry(newKey)
//     setForm(prev => ({ ...prev, whatsappNumber: buildWhatsappNumber(newKey, localNumber) }))
//   }
//
//   function handleLocalNumberChange(e: React.ChangeEvent<HTMLInputElement>) {
//     const val = e.target.value
//     setLocalNumber(val)
//     setForm(prev => ({ ...prev, whatsappNumber: buildWhatsappNumber(selectedCountry, val) }))
//   }
//
//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault()
//     setError('')
//     if (!form.agreeTerms) { setError('You must agree to the Terms & Conditions to continue.'); return }
//     if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return }
//     if (!passwordsMatch) { setError('Passwords do not match.'); return }
//     if (!form.posType) { setError('Please select your POS system.'); return }
//     if (!localNumber.trim()) { setError('Please enter your WhatsApp number.'); return }
//     if (!turnstileToken) { setError('Security check failed - please refresh'); return }
//     setLoading(true)
//     try {
//       const res = await fetch('/api/signup', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ ...form, turnstileToken, utmSource, refCode: refCode || undefined }),
//       })
//       const data = await res.json()
//       if (!res.ok || data.error) {
//         setError(data.error || 'Something went wrong. Please try again.')
//       } else {
//         router.push('/signup/success')
//       }
//     } catch {
//       setError('Network error. Please check your connection and try again.')
//     } finally {
//       setLoading(false)
//     }
//   }
//
//   return (
//     <div className="max-w-2xl mx-auto py-12 px-4">
//       <div className="text-center mb-8">
//         <h1 className="text-3xl font-bold text-gray-900">Start your free trial</h1>
//         <p className="mt-2 text-gray-600">14 days free — no credit card required</p>
//       </div>
//       {/* ... full form ... */}
//     </div>
//   )
// }
//
// export default function SignupPage() {
//   return (
//     <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading...</div>}>
//       <SignupForm />
//     </Suspense>
//   )
// }

import WaitlistChat from '@/components/WaitlistChat'
import Link from 'next/link'

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Join the waitlist</h1>
          <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
            We&apos;re onboarding new clients gradually. Chat with us below or scan the QR code
            to message us on WhatsApp — we&apos;ll be in touch as soon as we&apos;re ready for you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          {/* Inline chat */}
          <WaitlistChat />

          {/* QR code + WhatsApp CTA */}
          <div className="flex flex-col items-center justify-center gap-6 py-6">
            <p className="text-lg font-semibold text-gray-800">Or message us directly on WhatsApp</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https://wa.me/353894633835&qzone=2"
              alt="Scan to chat on WhatsApp"
              width={220}
              height={220}
              className="rounded-2xl border border-gray-200 shadow-md"
            />
            <p className="text-sm text-gray-500 text-center">Scan with your phone camera<br />to open WhatsApp</p>
            <a
              href="https://wa.me/353894633835"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1fb856] text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Open WhatsApp
            </a>

            <p className="text-sm text-gray-400 text-center mt-4">
              Already have an account?{' '}
              <Link href="/login" className="text-green-600 hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
