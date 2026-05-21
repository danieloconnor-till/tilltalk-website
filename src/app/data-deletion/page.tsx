export const metadata = {
  title: "Data Deletion — TillTalk",
  description: "How to delete the data TillTalk holds about you or your business.",
  robots: { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Data Deletion</h1>
        <p className="text-gray-500 text-sm mb-8">
          <strong>Last updated:</strong> 21 May 2026 &middot; Prime Construct Ltd (company number 751535, registered in Ireland)
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">

          <p>
            This page explains how to delete the data TillTalk holds about you or your business. There are three paths depending on what you want to delete.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Stop sharing data from a single connected system</h2>
            <p className="mb-3">
              If you want TillTalk to stop processing data from one specific integration (your POS, an ad platform, or any other connector), the simplest way is to disconnect it on that platform&apos;s own dashboard. For example:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-3">
              <li><strong>Clover:</strong> open your Clover dashboard, go to the &ldquo;More Tools&rdquo; section, find TillTalk, and click <strong>Uninstall</strong>.</li>
              <li><strong>Meta (Facebook / Instagram):</strong> open Meta Business Settings &rarr; Business Integrations, find TillTalk, and remove it.</li>
              <li><strong>Other integrations:</strong> revoke TillTalk&apos;s access from the relevant platform.</li>
            </ul>
            <p className="mb-3">
              When TillTalk receives the disconnect signal, we automatically delete:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>the access token or credential for that integration</li>
              <li>the raw data we cached from that platform (individual transaction snapshots, fetch logs, recent webhook events past their retention window)</li>
            </ul>
            <p>
              Your TillTalk account, conversation history, and other integrations are preserved. You can reconnect the integration later at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Cancel your TillTalk account</h2>
            <p className="mb-3">
              To delete your TillTalk account entirely &mdash; including all integrations, conversation history, dashboard data, and stored credentials &mdash; email{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>{' '}
              from the email address associated with your account, with the subject line &ldquo;Account deletion request&rdquo;.
            </p>
            <p className="mb-3">We will:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>confirm the request within 5 working days</li>
              <li>delete your account and all associated data within 30 days of confirmation</li>
              <li>retain only the records required by law (billing records for 7 years under Irish tax law; security logs for the period set out in our{' '}<a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>)</li>
            </ul>
            <p>A self-service cancellation flow will be added to the dashboard in a future release.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. As a customer of a TillTalk merchant</h2>
            <p>
              If you are a customer of a business that uses TillTalk (for example, you bought something at a restaurant or shop that uses TillTalk for ad attribution), please contact the business directly. They are the data controller for your data and can instruct TillTalk to remove the hashed records relating to you. TillTalk will action the deletion within 30 days of receiving the merchant&apos;s instruction, and will propagate it to ad platforms (Meta, Google, TikTok) where their APIs support deletion. See &sect;11 of our{' '}
              <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>{' '}
              for detail.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">What is deleted, and when</h2>
            <p className="mb-3">
              Detailed retention periods are set out in &sect;8 of our{' '}
              <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>. The two-tier policy above is described in &sect;9.1 of the Privacy Policy.
            </p>
            <p>
              For any data-deletion question not covered above, email{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>. We respond within 5 working days for general queries and within one month for formal data-subject rights requests.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
