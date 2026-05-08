export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">
          <strong>Last updated:</strong> 8 May 2026 &middot; <strong>Effective:</strong> 6 May 2026 &middot; Prime Construct Ltd (trading as TillTalk)
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">

          <div className="space-y-3">
            <p>
              This Privacy Policy explains how Prime Construct Ltd (&ldquo;TillTalk&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) collects, uses, shares, and protects personal data in connection with the TillTalk service. It applies to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Visitors to the TillTalk website at tilltalk.ie</li>
              <li>Business owners who sign up for TillTalk as clients</li>
              <li>Customers of TillTalk&apos;s clients whose transaction data passes through TillTalk&apos;s systems</li>
            </ul>
            <p>
              If you have any questions about this policy or want to exercise your rights, contact us at{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who we are</h2>
            <p className="mb-3"><strong>Data controller for our website and our clients:</strong></p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1 mb-3">
              <p>Prime Construct Ltd</p>
              <p>Trading as TillTalk</p>
              <p>Registered office: Farran, Mourneabbey, Co. Cork, P51 KF88, Ireland</p>
              <p>Company registration number: 751535</p>
              <p>VAT number: IE4224722DH</p>
              <p>Contact: <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a></p>
            </div>
            <p>
              For the personal data of our clients&apos; customers, TillTalk acts as a <strong>data processor</strong> on behalf of the client. The client is the data controller of their own customer data; TillTalk processes that data only on the client&apos;s instructions, under a Data Processing Agreement (DPA).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. What TillTalk does</h2>
            <p className="mb-3">TillTalk is an AI-managed marketing service for independent hospitality and retail businesses. Our system:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Runs Meta, Google, and TikTok advertising campaigns on behalf of our clients</li>
              <li>Reads point-of-sale (POS) transaction data from our clients&apos; till systems (Clover, Square, etc.) on a strictly read-only basis</li>
              <li>Pushes hashed conversion events to ad platforms via the Meta Conversions API (CAPI), Google Enhanced Conversions, and TikTok Events API to verify which ads led to real revenue</li>
              <li>Generates weekly reports and recommendations for each client</li>
            </ul>
            <p className="mt-3">Understanding what TillTalk does is important for understanding how we use personal data.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Personal data we collect</h2>
            <div className="space-y-6">

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3.1 From website visitors</h3>
                <p className="mb-2">When you visit tilltalk.ie:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li><strong>Technical data:</strong> IP address, browser type, device type, operating system, pages visited, referrer URL, time and date of visit</li>
                  <li><strong>Cookies and similar technologies:</strong> see our Cookie Policy</li>
                  <li><strong>Cloudflare Turnstile:</strong> we use Cloudflare&apos;s bot-protection challenge on signup forms; this collects technical signals about your browser</li>
                  <li><strong>Analytics:</strong> if enabled, aggregated usage statistics</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3.2 From clients (business owners who sign up)</h3>
                <p className="mb-2">When you sign up as a client:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li><strong>Account data:</strong> name, email address, business name, business address, phone number, business category, website</li>
                  <li><strong>Authentication data:</strong> password (hashed; never stored in plain text)</li>
                  <li><strong>Billing data:</strong> payment information processed by Stripe; we do not store full card numbers</li>
                  <li><strong>Communications:</strong> WhatsApp messages, dashboard chat messages, emails between you and TillTalk</li>
                  <li><strong>Voice notes:</strong> audio you send via WhatsApp is transcribed via a third-party speech-to-text service. Audio files are processed and not retained by TillTalk after transcription; the resulting text is retained as part of your conversation history.</li>
                  <li><strong>POS connection credentials:</strong> tokens or OAuth grants for your POS system, encrypted at rest. We use these to read transaction data only.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3.3 From clients&apos; customers (your customers&apos; data, when you are a client)</h3>
                <p className="mb-2">When TillTalk reads your client&apos;s POS transactions to verify ad performance, the following customer-level fields may be processed:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li><strong>Hashed identifiers:</strong> customer email, phone number, first name, last name (each hashed via deterministic SHA-256 before any storage or transmission)</li>
                  <li><strong>Card token:</strong> an opaque token from the POS system, never the card number itself</li>
                  <li><strong>Transaction metadata:</strong> amount, tip, tender type (cash/card/gift card), channel, timestamp, refund status</li>
                </ul>
                <p className="mt-3 font-medium text-gray-800">
                  TillTalk does not store raw email addresses, raw phone numbers, or raw names of clients&apos; customers. Only deterministic hashes are persisted. The original raw values are read from the POS system, hashed in memory, and discarded.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">3.4 From third parties</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li><strong>Stripe:</strong> billing and subscription status</li>
                  <li><strong>Twilio:</strong> WhatsApp delivery confirmations</li>
                  <li><strong>POS providers (Clover, Square, etc.):</strong> transaction data on the client&apos;s instruction</li>
                  <li><strong>Ad platforms (Meta, Google, TikTok):</strong> aggregated ad performance metrics and audience match rates relating to campaigns we run on the client&apos;s behalf</li>
                </ul>
              </div>

            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. How we use personal data and why</h2>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Purpose</th>
                    <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Personal data</th>
                    <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Legal basis</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Operate the website', 'Technical data, cookies', 'Legitimate interest (running our service)'],
                    ['Authenticate clients', 'Account data, authentication data', 'Performance of contract'],
                    ['Provide the TillTalk service to clients', 'Account data, communications, POS credentials, transaction data', 'Performance of contract'],
                    ['Run ad campaigns and verify their effectiveness', 'Hashed customer identifiers, transaction metadata', 'Performance of contract (with the client; we are a processor)'],
                    ['Bill clients', 'Account data, billing data', 'Performance of contract'],
                    ['Send service emails (account, security, billing)', 'Account data, email', 'Performance of contract'],
                    ['Send marketing emails to prospective clients', 'Email, name', 'Legitimate interest (B2B), with consent where required by ePrivacy law; opt-out available in every email'],
                    ['Detect fraud and abuse', 'Technical data, communications', 'Legitimate interest'],
                    ['Comply with legal obligations', 'All applicable data', 'Legal obligation'],
                    ['Improve the service', 'Aggregated, de-identified usage data', 'Legitimate interest'],
                  ].map(([purpose, data, basis]) => (
                    <tr key={purpose}>
                      <td className="px-4 py-2 border border-gray-200 font-medium align-top">{purpose}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-600 align-top">{data}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-600 align-top">{basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="font-medium text-gray-800">
              We never use the personal data of our clients&apos; customers for any purpose other than verifying ad performance for the client whose customers they are. We do not build cross-client profiles. We do not sell personal data. We do not use one client&apos;s customer data to benefit another client.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Sharing personal data</h2>
            <p className="mb-4">We share personal data with the following categories of recipients, only as necessary:</p>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">5.1 Service providers (sub-processors)</h3>
                <p className="mb-3">We use service providers in the following categories to operate the TillTalk service:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
                  <li><strong>Database, authentication, and file storage</strong> — for storing client account data, encrypted credentials, and operational data</li>
                  <li><strong>Application hosting and compute</strong> — for running the TillTalk backend and AI agent infrastructure</li>
                  <li><strong>Website hosting</strong> — for serving tilltalk.ie and our client dashboard</li>
                  <li><strong>Payment processing</strong> — for billing clients and processing subscription payments</li>
                  <li><strong>Messaging delivery</strong> — for sending WhatsApp and SMS messages between TillTalk and clients</li>
                  <li><strong>WhatsApp Business platform</strong> — the underlying platform on which messaging delivery operates</li>
                  <li><strong>AI processing</strong> — for the AI capabilities that power the TillTalk service</li>
                  <li><strong>Speech-to-text processing</strong> — for transcribing voice notes you send to TillTalk</li>
                  <li><strong>Email delivery</strong> — for transactional and marketing emails</li>
                  <li><strong>Edge networking and bot protection</strong> — for serving traffic and protecting signup flows</li>
                  <li><strong>Error monitoring</strong> — for detecting and diagnosing application errors</li>
                  <li><strong>Asset storage and image processing</strong> — for storing creative materials used in advertising</li>
                  <li><strong>Source-code and knowledge-base hosting</strong> — for storing TillTalk&apos;s source code and operational knowledge</li>
                </ul>
                <p className="mt-3 text-gray-500 text-xs">
                  A current named list of sub-processors is available at{' '}
                  <a href="/sub-processors" className="text-green-600 hover:underline">tilltalk.ie/sub-processors</a>.
                  {' '}We work to ensure that an appropriate Data Processing Agreement (DPA) is signed with each of these providers before they process personal data on our behalf, and we will inform clients of any material additions to our sub-processor list at least 30 days in advance.
                </p>
                <p className="mt-2 text-gray-500 text-xs">
                  If you are a Clover merchant, see our{' '}
                  <a href="/clover-addendum" className="text-green-600 hover:underline">Clover Privacy Addendum</a>{' '}
                  for additional detail on how data received from Clover is handled.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">5.2 Ad platforms (on client instruction)</h3>
                <p className="mb-2">When you are a client, we push hashed conversion events to the ad platforms you have asked us to run campaigns on:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li><strong>Meta</strong> (Facebook / Instagram) via the Conversions API</li>
                  <li><strong>Google</strong> via Enhanced Conversions</li>
                  <li><strong>TikTok</strong> via the Events API</li>
                </ul>
                <p className="mt-3">
                  These events contain hashed identifiers and transaction values. The ad platforms use them for matching, attribution, and measurement. The hashing is deterministic, which means the platforms can match the hashes against hashes derived from their own user records. The hash itself does not allow recovery of the original raw value, but a successful match enables the platform to associate the conversion event with a known platform user. For that reason, hashed identifiers may still constitute personal data under GDPR.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">5.3 Legal disclosures</h3>
                <p>We may disclose personal data when required by law, court order, or to protect legal rights, safety, or property.</p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">5.4 Business transfers</h3>
                <p>If TillTalk is acquired or merged, personal data may transfer to the new owner under the same protections.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. International data transfers</h2>
            <p className="mb-3">Some of our service providers are based outside the European Economic Area, primarily in the United States. Where personal data is transferred outside the EEA, we rely on:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>EU Standard Contractual Clauses</strong> with the recipient</li>
              <li><strong>Adequacy decisions</strong> where the European Commission has determined the destination country provides an adequate level of protection (e.g. EU-US Data Privacy Framework)</li>
              <li><strong>Supplementary measures</strong> such as encryption in transit and at rest, and the hashing of customer identifiers before transfer</li>
            </ul>
            <p className="mt-3">
              You can request copies of the safeguards in place by contacting{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. How long we keep personal data</h2>
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Data</th>
                    <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Retention</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Website visit logs', '30 days'],
                    ['Client account data', 'Duration of the client relationship plus 7 years (Irish Companies Act / tax law)'],
                    ['Client billing records', '7 years (Irish tax law)'],
                    ['Communications between client and TillTalk', 'Duration of the client relationship plus 2 years'],
                    ['Voice note audio', 'Discarded immediately after transcription'],
                    ['Hashed customer identifiers', '24 months row-level; aggregated into daily summaries thereafter (see §10)'],
                    ['Hashed customer identifiers from cancelled clients', 'Deleted within 30 days of contract termination'],
                    ['Sentry error logs', '90 days'],
                  ].map(([data, retention]) => (
                    <tr key={data}>
                      <td className="px-4 py-2 border border-gray-200 font-medium align-top">{data}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-600 align-top">{retention}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>After these periods, data is deleted or fully anonymised.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your rights under GDPR</h2>
            <p className="mb-3">If you are in the EEA, UK, or another jurisdiction granting equivalent rights, you have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Access</strong> — request a copy of the personal data we hold about you</li>
              <li><strong>Rectification</strong> — correct inaccurate personal data</li>
              <li><strong>Erasure</strong> — request deletion of your personal data (&ldquo;right to be forgotten&rdquo;)</li>
              <li><strong>Restriction</strong> — restrict our processing of your personal data</li>
              <li><strong>Portability</strong> — receive your personal data in a portable format</li>
              <li><strong>Objection</strong> — object to processing based on legitimate interest</li>
              <li><strong>Withdraw consent</strong> — where processing is based on consent</li>
              <li><strong>Complaint</strong> — lodge a complaint with the Irish Data Protection Commission (<a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">dataprotection.ie</a>) or your local supervisory authority</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>. We will respond within one month.
            </p>
            <p className="mt-3 bg-gray-50 rounded-lg p-4">
              <strong>A note on the customers of our clients:</strong> if you are a customer of a TillTalk client and want to exercise rights over your personal data, please contact the client directly — they are the data controller and hold the relationship with you. TillTalk will assist the client in fulfilling your request.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Security</h2>
            <p className="mb-3">We implement technical and organisational measures appropriate to the nature of the personal data we process and the risks involved, including:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Encryption in transit:</strong> TLS 1.2 or higher for all communications between TillTalk components and external services</li>
              <li><strong>Encryption at rest:</strong> database encryption at rest for all stored data; sensitive credentials are additionally encrypted before storage</li>
              <li><strong>Hashing of customer identifiers:</strong> SHA-256 deterministic hashing applied before customer identifiers are persisted or transmitted to ad platforms</li>
              <li><strong>Access controls:</strong> access to production systems and personal data is restricted to authorised personnel; at present this is limited to the founder. As TillTalk grows, role-based access controls will be expanded accordingly</li>
              <li><strong>Error monitoring:</strong> Sentry monitoring for application errors and anomalies, with alerts to the founder</li>
              <li><strong>Read-only POS access:</strong> TillTalk does not write to client POS systems; all POS interactions are read-only by design and enforced in code</li>
              <li><strong>Periodic review:</strong> sub-processor agreements and security practices are reviewed at least annually</li>
            </ul>
            <p className="mt-3">We are continuing to develop our internal logging and audit capabilities. If you have specific questions about the controls in place at any time, contact <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>.</p>
            <p className="mt-3">No system is perfectly secure. If we become aware of a personal data breach affecting your data, we will notify you and the Data Protection Commission as required by GDPR (within 72 hours where feasible).</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Specific notes on customer data hashing and ad platform matching</h2>
            <p className="mb-3">This section explains how TillTalk handles your customers&apos; data (when you are a client) and your data (when you are a customer of a TillTalk client).</p>
            <p className="mb-3">
              When a customer pays at a TillTalk client&apos;s POS, the transaction may include identifying fields such as email, phone, or name (entered at the till, captured by a loyalty system, or provided through online ordering).
            </p>
            <p className="mb-2"><strong>TillTalk&apos;s processing pipeline:</strong></p>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-4">
              <li><strong>Read</strong> the transaction from the POS API</li>
              <li><strong>Normalise</strong> the identifying fields (lowercase email, strip phone formatting, etc.)</li>
              <li><strong>Hash</strong> each field using deterministic SHA-256</li>
              <li><strong>Store</strong> only the hashes — raw values are never written to disk by TillTalk</li>
              <li><strong>Push</strong> the hashes to the relevant ad platform&apos;s conversion API along with the transaction value, so the platform can verify that one of its users became a paying customer</li>
              <li><strong>Aggregate</strong> transaction data older than 24 months into daily summaries; row-level personal data is deleted at that point</li>
            </ol>
            <p className="mb-3">
              Hashing is deterministic, meaning the same input always produces the same hash. This allows ad platforms to match a hash they receive from TillTalk against a hash derived from their own user records, without TillTalk and the platform exchanging raw personal data. As noted in §5.2, hashed identifiers can still constitute personal data under GDPR because a successful match links the conversion to a known user on the receiving platform.
            </p>
            <p className="mb-3 font-medium text-gray-800">
              Cash transactions and transactions without identifying fields are never hashed or pushed to ad platforms. Anonymous transactions cannot be attributed and are excluded by design.
            </p>
            <p>
              If you are a customer of a TillTalk client and want a transaction record relating to you removed, please contact the client directly. The client can instruct TillTalk to remove its hashed record. Where ad platforms expose deletion endpoints (such as Meta&apos;s CAPI deletion event or Google&apos;s user-data deletion API), TillTalk will use those endpoints to propagate the deletion to the platforms on the client&apos;s instruction. Some platforms apply their own processing timelines to deletion requests, which are outside TillTalk&apos;s control.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Cookies</h2>
            <p className="mb-3">
              See our separate Cookie Policy at{' '}
              <a href="/cookies" className="text-green-600 hover:underline">tilltalk.ie/cookies</a>{' '}
              for details on cookies and similar technologies.
            </p>
            <p className="mb-2">In summary:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Strictly necessary cookies (authentication, security)</li>
              <li>Functional cookies (remembering your preferences)</li>
              <li>Analytics cookies (only if you consent)</li>
              <li>No advertising or tracking cookies on tilltalk.ie itself</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Children</h2>
            <p>
              TillTalk is a B2B service for businesses. We do not knowingly collect personal data from children under 16. If you become aware that a child has provided personal data to us, please contact{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>{' '}
              and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to this policy</h2>
            <p>
              We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top will reflect the most recent change. For material changes, we will notify clients by email and post a prominent notice on tilltalk.ie at least 30 days before the change takes effect.
            </p>
            <p className="mt-2">A version history of this policy is available on request.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Complaints</h2>
            <p className="mb-3">If you believe TillTalk has not handled your personal data in accordance with applicable law, you have the right to lodge a complaint with:</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1 mb-3">
              <p><strong>Irish Data Protection Commission</strong></p>
              <p>21 Fitzwilliam Square South</p>
              <p>Dublin 2, D02 RD28</p>
              <p>Ireland</p>
              <p>Phone: +353 (0)761 104 800</p>
              <p>Website: <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">dataprotection.ie</a></p>
            </div>
            <p>
              We would appreciate the opportunity to address your concern first by emailing{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>{' '}
              before you contact the Data Protection Commission.
            </p>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Contact</h2>
            <p className="mb-2">For any privacy-related question, request, or complaint:</p>
            <p>
              <strong>Email:</strong>{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a><br />
              <strong>Post:</strong> Prime Construct Ltd, Farran, Mourneabbey, Co. Cork, P51 KF88, Ireland
            </p>
            <p className="mt-3 text-gray-500 text-xs">
              We aim to respond within 5 working days for general queries and within one month for formal data subject rights requests.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
