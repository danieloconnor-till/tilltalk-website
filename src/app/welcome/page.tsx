import Link from 'next/link'

interface Props {
  searchParams: Promise<{ merchant_id?: string; error?: string }>
}

export default async function WelcomePage({ searchParams }: Props) {
  const params = await searchParams
  const merchantId = params.merchant_id
  const error      = params.error

  const isSuccess = merchantId && !error

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <span className="text-3xl font-bold text-green-600">TillTalk</span>
        </div>

        {isSuccess ? (
          <>
            <div className="text-5xl">🎉</div>
            <h1 className="text-2xl font-semibold text-gray-900">
              You&apos;re connected!
            </h1>
            <p className="text-gray-600">
              TillTalk is connected to your Clover account. We&apos;ve sent a WhatsApp
              message to your registered number with next steps.
            </p>
            <Link
              href="/dashboard"
              className="inline-block bg-green-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Go to dashboard
            </Link>
          </>
        ) : (
          <>
            <div className="text-5xl">⚠️</div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Something went wrong
            </h1>
            <p className="text-gray-500 text-sm font-mono bg-gray-100 rounded px-3 py-2">
              {error ?? 'unknown_error'}
            </p>
            <p className="text-gray-600">
              Please try installing the app again, or contact us for help.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://www.clover.com/appmarket"
                className="inline-block border border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Try installing again
              </a>
              <a
                href="mailto:daniel@tilltalk.ie"
                className="inline-block bg-green-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Contact support
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
