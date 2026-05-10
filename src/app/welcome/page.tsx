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
            <div className="text-5xl">✓</div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Connected
            </h1>
            <p className="text-gray-600">
              Your Clover account is connected. We&apos;ll send setup instructions
              once your account is activated.
            </p>
          </>
        ) : (
          <>
            <div className="text-5xl">⚠️</div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Something went wrong
            </h1>
            <p className="text-gray-600">
              Something went wrong during connection. Please try again or contact{' '}
              <a href="mailto:support@tilltalk.ie" className="text-green-600 hover:underline">
                support@tilltalk.ie
              </a>
            </p>
          </>
        )}
      </div>
    </main>
  )
}
