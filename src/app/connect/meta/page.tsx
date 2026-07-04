import Link from 'next/link'

export default async function ConnectMetaPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; name?: string; scopes?: string }>
}) {
  const params = await searchParams
  const connected = params.connected === '1'
  const name = params.name?.trim() || 'your account'
  const scopes = (params.scopes ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  if (connected) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">TillTalk</h1>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800 font-medium">
              Connected — TillTalk can now manage ads for {name}.
            </p>
          </div>
          {scopes.length > 0 && (
            <>
              <p className="text-gray-700 text-sm mb-2">Permissions granted:</p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                {scopes.map((scope) => (
                  <li key={scope} className="font-mono">
                    {scope}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">TillTalk</h1>
        <p className="text-gray-700 mb-8">
          Connect your Facebook Business account so TillTalk can run and measure
          your ads.
        </p>

        <Link
          href="/connect/meta/login"
          className="inline-flex items-center justify-center bg-[#1877F2] hover:bg-[#166fe0] text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
        >
          Continue with Facebook
        </Link>
      </div>
    </div>
  )
}
