import Link from 'next/link'

const TEST_APP_ID = '834278479749382'

export default function MetaReviewEntryPage() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Meta App Review — Permission Demonstrations
        </h1>
        <p className="text-gray-700 mb-3">
          This page demonstrates the 18 permissions requested by TillTalk&rsquo;s
          Meta App (ID 1373116251311238).
        </p>
        <p className="text-gray-700 mb-3">
          Click below to log in with your Meta account. After granting
          permissions, you&rsquo;ll see each one exercised live against the
          Graph API. Where your account returns empty or limited data (no
          linked Instagram Business account, no Lead Ads history, no
          attribution data, etc.), a clearly labelled &ldquo;Demo data&rdquo;
          panel renders alongside the live response showing a captured
          snapshot from Bella Napoli Ristorante, TillTalk&rsquo;s live
          reference merchant.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          All Graph API calls happen server-side. The Test App secret is never
          exposed to the browser.
        </p>

        <Link
          href="/review/meta-bk2xp9/login"
          className="inline-flex items-center justify-center bg-[#1877F2] hover:bg-[#166fe0] text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
        >
          Log in with Facebook
        </Link>

        <p className="text-xs text-gray-500 mt-6">
          App ID: {TEST_APP_ID} (Test App)
        </p>
      </div>
    </div>
  )
}
