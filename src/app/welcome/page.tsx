import {
  CONNECTED_MESSAGE,
  PENDING_MESSAGE,
  resolveWelcomeOutcome,
  type WelcomeParams,
} from './_outcome'

interface Props {
  searchParams: Promise<WelcomeParams>
}

export default async function WelcomePage({ searchParams }: Props) {
  const params = await searchParams
  const outcome = resolveWelcomeOutcome(params)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <span className="text-3xl font-bold text-green-600">TillTalk</span>
        </div>

        {outcome.kind === 'connected' && (
          <>
            <div className="text-5xl">✓</div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Connected
            </h1>
            <p className="text-gray-600">{CONNECTED_MESSAGE[outcome.provider]}</p>
          </>
        )}

        {/* Neither a success nor a failure: the authorisation landed, but the app
            credentials are not configured yet, so there is nothing for the owner
            to retry and nothing they did wrong. */}
        {outcome.kind === 'pending' && (
          <>
            <div className="text-5xl">⏳</div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Almost there
            </h1>
            <p className="text-gray-600">{PENDING_MESSAGE[outcome.provider]}</p>
          </>
        )}

        {outcome.kind === 'error' && (
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
