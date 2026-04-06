import Link from 'next/link'
import { CheckCircle2, Mail } from 'lucide-react'

export default function SignupSuccessPage() {
  return (
    <div className="max-w-lg mx-auto text-center py-20 px-4">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <Mail className="text-green-600" size={36} />
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">Check your email</h1>
      <p className="text-gray-600 mb-8">
        We&apos;ve sent you a confirmation email. Click the{' '}
        <strong>Confirm my account</strong> button in the email to activate your account.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 text-left space-y-4 mb-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-green-500 mt-0.5 shrink-0" size={18} />
          <p className="text-sm text-gray-700">Confirm your email to activate your account</p>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-green-500 mt-0.5 shrink-0" size={18} />
          <p className="text-sm text-gray-700">
            You&apos;ll receive WhatsApp setup instructions within 24 hours
          </p>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-green-500 mt-0.5 shrink-0" size={18} />
          <p className="text-sm text-gray-700">Your 14-day free trial starts now — no credit card needed</p>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Didn&apos;t receive the email? Check your spam folder or{' '}
        <a href="mailto:hello@tilltalk.ie" className="text-green-600 hover:underline">
          contact support
        </a>.
      </p>

      <Link href="/login" className="text-sm text-green-600 hover:underline font-medium">
        Already confirmed? Sign in →
      </Link>
    </div>
  )
}
