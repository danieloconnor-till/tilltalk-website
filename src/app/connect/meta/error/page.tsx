import Link from 'next/link'

const REASON_TEXT: Record<string, string> = {
  invalid_state:
    'Invalid state. The CSRF nonce did not match — restart the flow from the connect page.',
  missing_config:
    'Server is missing required configuration. Set META_REVIEW_APP_ID, META_REVIEW_APP_SECRET, META_CONNECT_REDIRECT_URI, TILLTALK1_BASE_URL and TILLTALK1_ONBOARDING_KEY in Vercel.',
  token_exchange_failed:
    'Failed to exchange the authorization code for an access token.',
  no_token: 'No access token was returned by Meta.',
  long_lived_exchange_failed:
    'Failed to exchange the short-lived token for a long-lived one.',
  token_store_failed:
    'Connected to Facebook, but storing the token with TillTalk failed. Please try again.',
  network_error: 'Network error while contacting Meta.',
}

export default async function ConnectMetaErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; detail?: string }>
}) {
  const params = await searchParams
  const reason = params.reason ?? 'unknown'
  const reasonText =
    REASON_TEXT[reason] ?? 'An unexpected error occurred while connecting.'
  const detail = params.detail

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Connect Facebook — error
        </h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700 font-medium mb-1">
            Error: {reason}
          </p>
          <p className="text-sm text-red-600">{reasonText}</p>
          {detail && (
            <p className="text-xs text-red-500 mt-2 font-mono break-all">
              {detail}
            </p>
          )}
        </div>
        <Link
          href="/connect/meta"
          className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
        >
          Return to connect page
        </Link>
      </div>
    </div>
  )
}
