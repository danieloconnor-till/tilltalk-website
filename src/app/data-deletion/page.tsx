export const metadata = {
  title: "Data Deletion — TillTalk",
  description: "How to request deletion of personal data held by TillTalk.",
  robots: { index: true, follow: true },
};

export default function DataDeletionPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Data Deletion Instructions</h1>
        <p className="text-gray-500 text-sm mb-8">
          <strong>Last updated:</strong> 19 May 2026 &middot; Prime Construct Ltd (company number 751535, registered in Ireland)
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">

          <p>
            This page explains how to request deletion of personal data held by TillTalk (operated by Prime Construct Ltd, company number 751535, registered in Ireland).
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Who can request deletion</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>TillTalk clients</strong> (businesses signed up to the service) can request deletion of their account data and the personal data processed on their behalf</li>
              <li><strong>Customers of TillTalk clients</strong> (people who paid at a TillTalk client&apos;s till) can request deletion of any personal data TillTalk processed about them on the client&apos;s instruction</li>
              <li><strong>Anyone</strong> who interacted with TillTalk (signup-form visitors, prospect chats, support emails, etc.) can request deletion of their personal data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">How to request deletion</h2>
            <p className="mb-3">
              Send an email to{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>{' '}
              with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>The subject line &ldquo;Data deletion request&rdquo;</li>
              <li>Your name (or the business name, if requesting as a client)</li>
              <li>The email address or phone number you used with TillTalk, or any other identifier that helps us locate your data</li>
              <li>A short description of the deletion you want (your account, a specific client&apos;s data, your customer record at a TillTalk client, etc.)</li>
            </ul>
            <p>
              If you are a customer of a TillTalk client and you know which business it is, please mention the business &mdash; TillTalk processes customer data only on each client&apos;s instruction, and we coordinate with the client when fulfilling such requests.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">What we do when we receive a request</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>We acknowledge the request within five working days</li>
              <li>We verify the request (we may ask for proof of identity for sensitive deletions)</li>
              <li>We delete the relevant personal data and instruct our sub-processors to delete corresponding data within their systems</li>
              <li>Where ad platforms (Meta, Google, TikTok) expose deletion endpoints, we propagate deletion to those platforms &mdash; note that ad platforms apply their own processing timelines outside our control</li>
              <li>We confirm the deletion in writing within 30 days of receiving the request</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">What gets deleted</h2>
            <p className="mb-3">
              We delete the personal data tied to the requesting party. This typically includes:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Account data (name, email, phone, business details)</li>
              <li>Conversation history (WhatsApp messages, dashboard chat, voice-note transcripts)</li>
              <li>Hashed customer identifiers tied to a client&apos;s account, where the client is the requesting party</li>
              <li>Any other personal data we hold that we cannot retain on a legal basis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">What we may retain</h2>
            <p className="mb-3">
              We may retain certain data after deletion of an account where retention is required by law, by legitimate business interest, or because the data is no longer personal data within the meaning of GDPR. This includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-3">
              <li><strong>Billing records</strong> (Irish tax law requires retention for 7 years)</li>
              <li><strong>Records of disputes, complaints, or legal claims</strong></li>
              <li><strong>Backup snapshots</strong> until the next backup cycle (typically 30 days)</li>
              <li><strong>Aggregated, derived, and statistical artefacts</strong> generated by TillTalk&apos;s systems while operating the service &mdash; for example, anonymised performance models, audience-response patterns, daypart capacity models, and anomaly-detection calibrations. These derived artefacts are TillTalk&apos;s proprietary work product, do not constitute personal data once aggregated and anonymised, and are retained as part of TillTalk&apos;s models for operating the service for all clients</li>
            </ul>
            <p>
              The retention practices summarised here are described more fully in our{' '}
              <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>{' '}
              and our{' '}
              <a href="/terms" className="text-green-600 hover:underline">Terms of Service</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">SLA</h2>
            <p>
              We commit to processing valid deletion requests within 30 days of receipt, in accordance with Article 17 GDPR. Most requests are processed within 5&ndash;10 working days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Questions or complaints</h2>
            <p className="mb-3">
              If you are not satisfied with how TillTalk handles your deletion request, you have the right to lodge a complaint with the Irish Data Protection Commission:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1">
              <p><strong>Irish Data Protection Commission</strong></p>
              <p>21 Fitzwilliam Square South, Dublin 2, D02 RD28, Ireland</p>
              <p>Phone: +353 (0)761 104 800</p>
              <p>Website:{' '}<a href="https://dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">dataprotection.ie</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">Contact</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1">
              <p><strong>Email:</strong>{' '}<a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a></p>
              <p><strong>Post:</strong> Prime Construct Ltd, Farran, Mourneabbey, Co. Cork, P51 KF88, Ireland</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
