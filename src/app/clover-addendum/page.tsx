export const metadata = {
  title: "Clover Privacy Addendum — TillTalk",
  description: "TillTalk's privacy addendum for merchants using the Clover POS integration.",
};

export default function CloverAddendumPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Clover Privacy Addendum</h1>
        <p className="text-gray-500 text-sm mb-8">
          <strong>Last updated:</strong> 22 May 2026 &middot; <strong>Effective:</strong> 22 May 2026 &middot; Prime Construct Ltd (trading as TillTalk)
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">

          <p>
            This Clover Privacy Addendum (&ldquo;Addendum&rdquo;) supplements TillTalk&apos;s{' '}
            <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>{' '}
            and applies specifically to merchants who connect TillTalk to their Clover point-of-sale system. It describes how TillTalk receives, uses, stores, and shares data obtained through the Clover platform. In the event of a conflict between this Addendum and the Privacy Policy, this Addendum takes precedence for Clover-related processing.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Scope</h2>
            <p className="mb-3">
              This Addendum applies when a TillTalk client (a business owner, &ldquo;Merchant&rdquo;) authorises TillTalk to access their Clover merchant account for the purpose of reading transaction data.
            </p>
            <p>
              TillTalk accesses the Clover platform solely as a service provider to the Merchant. TillTalk does not operate an independent relationship with Clover&apos;s end-customers. All access is strictly read-only; TillTalk does not create, modify, or delete any records in the Merchant&apos;s Clover account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Data received from Clover</h2>
            <p className="mb-3">Through the Clover API, TillTalk reads the following data on the Merchant&apos;s instruction:</p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Transaction data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Transaction amount, tip amount, total</li>
                  <li>Tender type (cash, card, gift card)</li>
                  <li>Transaction timestamp</li>
                  <li>Channel (in-person, online)</li>
                  <li>Refund status</li>
                  <li>Clover order ID and payment ID (internal reference only)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Customer-level identifiers (where present in the transaction)</h3>
                <p className="mb-2 text-gray-600">
                  Where a Clover transaction includes customer-identifying fields (e.g., email or phone captured at the till, via a loyalty programme, or through online ordering), TillTalk reads and immediately hashes these fields using deterministic SHA-256 before any storage or onward transmission. Raw values are never written to disk by TillTalk.
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Customer email (hashed in memory; raw value discarded)</li>
                  <li>Customer phone number (hashed in memory; raw value discarded)</li>
                  <li>Customer first name and last name (hashed in memory; raw value discarded)</li>
                  <li>Card token (an opaque reference from Clover; never the card number itself)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Merchant account data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Merchant ID</li>
                  <li>OAuth access token (encrypted at rest; used only to authenticate API calls)</li>
                </ul>
              </div>
            </div>

            <p className="mt-4 text-gray-500 bg-gray-50 rounded-lg p-4">
              Cash transactions and transactions that contain no customer-identifying fields are not hashed and cannot be attributed to an individual customer. Such transactions are used only in aggregate revenue reporting.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How TillTalk uses this data</h2>
            <p className="mb-3">TillTalk uses the data received from Clover exclusively for the following purposes, all carried out on the Merchant&apos;s instruction:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Ad performance verification:</strong> hashed customer identifiers and transaction values are sent to the ad platforms (Meta, Google, TikTok) specified by the Merchant, so the platforms can verify which ad campaigns drove real in-store revenue</li>
              <li><strong>Revenue reporting and analytics:</strong> transaction totals and aggregated metrics are used to produce weekly performance reports for the Merchant</li>
              <li><strong>Campaign optimisation:</strong> aggregated and anonymised signals are used to adjust the Merchant&apos;s ad targeting and budget allocation</li>
            </ul>
            <p className="mt-3">
              TillTalk does not use Clover data for any purpose beyond those listed above. TillTalk does not sell Clover data, does not use one Merchant&apos;s Clover data to benefit another Merchant, and does not build cross-merchant profiles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Storage and security</h2>
            <div className="space-y-3">
              <p>
                <strong>Hashed identifiers:</strong> stored in TillTalk&apos;s Railway-hosted PostgreSQL database, encrypted at rest. Row-level records are retained for 24 months from the transaction date; after that, they are aggregated into daily summaries and the row-level data is deleted.
              </p>
              <p>
                <strong>Transaction metadata:</strong> retained in aggregate form for the duration of the client relationship plus two years.
              </p>
              <p>
                <strong>OAuth credentials:</strong> the Clover OAuth access token is encrypted using Fernet symmetric encryption before storage. It is decrypted only in memory for the duration of an API call and never logged.
              </p>
              <p>
                <strong>Transmission:</strong> all communication between TillTalk and Clover uses TLS 1.2 or higher.
              </p>
              <p>
                <strong>Access controls:</strong> access to production systems is restricted to authorised personnel (currently limited to the founder). No third party has access to raw Clover data within TillTalk&apos;s systems.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Sharing</h2>
            <p className="mb-3">
              Data received from Clover is shared only with the following parties, and only as required to deliver the service:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>
                <strong>Ad platforms (on Merchant instruction):</strong> hashed customer identifiers and transaction values are transmitted to Meta, Google, and TikTok via their respective conversion APIs, solely for the purpose of matching ad conversions to real in-store purchases. Only hashed data is shared; raw values are never transmitted to ad platforms.
              </li>
              <li>
                <strong>Infrastructure sub-processors:</strong> data passes through TillTalk&apos;s hosting providers (Railway, Vercel, Supabase) in the course of normal service operation. See the{' '}
                <a href="/sub-processors" className="text-green-600 hover:underline">sub-processor list</a>{' '}
                for details.
              </li>
            </ul>
            <p className="mt-3">
              Clover data is never sold, licensed, or shared with any party not listed above.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Merchant rights</h2>
            <div className="space-y-3">
              <p>
                <strong>Access:</strong> Merchants may request a copy of all data TillTalk holds relating to their Clover account by contacting{' '}
                <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>.
              </p>
              <p>
                <strong>Disconnection and deletion:</strong> a Merchant may revoke TillTalk&apos;s Clover access at any time via the Clover dashboard or by contacting TillTalk. Upon revocation, TillTalk will cease all further reads from Clover. Hashed transaction data already stored is retained for the period set out in §4, unless the Merchant requests earlier deletion. On request, TillTalk will delete all hashed records for the Merchant within 30 days.
              </p>
              <p>
                <strong>Correction:</strong> transaction data is read-only from Clover and cannot be modified by TillTalk. To correct a transaction record, update it in the Clover system; TillTalk will reflect the correction on the next data sync.
              </p>
              <p>
                <strong>Customer deletion requests:</strong> if a customer of the Merchant requests deletion of their data, the Merchant should instruct TillTalk at{' '}
                <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>.
                {' '}TillTalk will delete the relevant hashed records and, where ad platforms expose deletion APIs (such as Meta&apos;s CAPI deletion event), will propagate the deletion to the relevant platform on the Merchant&apos;s instruction.
              </p>
              <p>
                <strong>Automated deletion on Clover uninstall:</strong> When a Merchant uninstalls the TillTalk Clover app, TillTalk receives an <code className="font-mono text-xs">APP_UNINSTALLED</code> webhook from Clover and immediately marks the Merchant&apos;s Clover data as pending deletion. The access token and Clover-sourced records are retained for 48 hours to allow accidental-uninstall recovery &mdash; reinstalling within that window restores access without data loss. After 48 hours, an automated job hard-deletes the access token, transaction snapshots, identity records, and webhook events older than 90 days. The Merchant&apos;s TillTalk account and other connectors are preserved either way; see{' '}
                <a href="/data-deletion" className="text-green-600 hover:underline">tilltalk.ie/data-deletion</a>{' '}
                for full-account deletion.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Compliance posture</h2>
            <div className="space-y-3">
              <p>
                <strong>GDPR:</strong> TillTalk operates as a data processor for personal data received through Clover, with the Merchant acting as data controller of their customers&apos; data. TillTalk&apos;s processing is governed by a Data Processing Agreement with each Merchant (incorporated into the Terms of Service).
              </p>
              <p>
                <strong>Clover Developer Agreement:</strong> TillTalk accesses Clover data under the Clover Developer Agreement, which sets out permitted use cases for marketplace applications. TillTalk&apos;s use is limited to the use cases described in this Addendum and does not extend beyond what is permitted by that agreement.
              </p>
              <p>
                <strong>Data minimisation:</strong> TillTalk reads only the transaction fields required for ad performance verification. No POS inventory data, employee data, or device data is accessed.
              </p>
              <p>
                <strong>Audit log:</strong> TillTalk maintains an internal log of all Clover API calls, including timestamp, endpoint, and response code. This log is retained for 90 days and is available to Merchants on request.
              </p>
            </div>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contact</h2>
            <p className="mb-2">For any question or request relating to Clover data processing:</p>
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a><br />
              <strong>Post:</strong> Prime Construct Ltd, Farran, Mourneabbey, Co. Cork, P51 KF88, Ireland
            </p>
            <p className="mt-4 text-gray-500 text-xs">
              Related documents:{' '}
              <a href="/privacy" className="hover:underline">Privacy Policy</a>{' '}
              &middot;{' '}
              <a href="/sub-processors" className="hover:underline">Sub-Processor List</a>{' '}
              &middot;{' '}
              <a href="/terms" className="hover:underline">Terms of Service</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
