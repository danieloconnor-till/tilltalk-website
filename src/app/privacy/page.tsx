export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: April 2026 · Prime Construct Ltd (trading as TillTalk)</p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who We Are</h2>
            <p>
              TillTalk is operated by <strong>Prime Construct Ltd</strong> (CRO No. 751535, VAT No. IE4224722DH),
              registered at Farran, Mourneabbey, Co. Cork, P51 KF88, Republic of Ireland. We act as the
              data controller for personal data described in this policy.
            </p>
            <p className="mt-2">
              <strong>Data controller contact:</strong>{' '}
              <a href="mailto:privacy@tilltalk.ie" className="text-green-600 hover:underline">privacy@tilltalk.ie</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. What Data We Collect and Why</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Account data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Full name and email address — to identify your account and contact you</li>
                  <li>Business name — to personalise your experience</li>
                  <li>WhatsApp number — to deliver the TillTalk service via WhatsApp</li>
                  <li>POS API credentials (AES-128-CBC encrypted) — to connect to your point-of-sale system</li>
                  <li>Business address — for nearby event and weather alert features (optional)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Usage data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Message logs (inbound/outbound count) — to power usage analytics in your dashboard</li>
                  <li>Notes and reminders you create via WhatsApp — stored until you delete them</li>
                  <li>Payroll figures you submit — stored for labour cost reports</li>
                  <li>Aggregated POS sales summaries — processed in memory only, not stored individually</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Payment data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Stripe customer ID and subscription ID — to manage your billing. Card details are held exclusively by Stripe and never touch our servers.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Cookie data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Essential session cookies — required for authentication</li>
                  <li>Cookie consent flag — stored in localStorage to remember your preference</li>
                  <li>We do not use advertising, analytics, or third-party tracking cookies</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Legal Basis for Processing</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Contract performance (Article 6(1)(b) GDPR)</strong> — account data and POS credentials are necessary to provide the Service.</li>
              <li><strong>Legitimate interest (Article 6(1)(f) GDPR)</strong> — usage analytics to improve service quality and prevent abuse.</li>
              <li><strong>Legal obligation (Article 6(1)(c) GDPR)</strong> — retention of billing records as required by Irish Revenue legislation.</li>
              <li><strong>Consent (Article 6(1)(a) GDPR)</strong> — for any optional marketing communications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. How Long We Keep Your Data</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Account data</strong> — retained for the duration of your subscription plus 30 days after cancellation, then permanently deleted.</li>
              <li><strong>Billing records</strong> — retained for 7 years as required by Irish Revenue legislation.</li>
              <li><strong>Message logs and usage data</strong> — retained while your account is active, deleted 30 days after cancellation.</li>
              <li><strong>Conversation history</strong> — never stored persistently. Held in memory only for up to 10 minutes per session (privacy by design).</li>
              <li><strong>POS credentials</strong> — deleted within 30 days of account closure or immediately on request.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Who We Share Your Data With</h2>
            <p className="mb-3">
              We only share data with the sub-processors needed to deliver the Service. Each is GDPR-compliant
              with appropriate data processing agreements in place. Full DPA details are in{' '}
              <a href="/terms#clause-15" className="text-green-600 hover:underline">Clause 15 of our Terms &amp; Conditions</a>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Processor</th>
                    <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Purpose</th>
                    <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Supabase', 'Database and authentication', 'EU (Ireland)'],
                    ['Railway', 'Bot application infrastructure', 'USA — SCCs'],
                    ['Vercel', 'Website infrastructure', 'USA — SCCs'],
                    ['Twilio / WhatsApp', 'WhatsApp message delivery', 'USA — SCCs'],
                    ['Anthropic', 'AI query processing', 'USA — SCCs'],
                    ['SendGrid', 'Transactional email', 'USA — SCCs'],
                    ['Stripe', 'Payment processing', 'USA / EU — SCCs'],
                  ].map(([name, purpose, location]) => (
                    <tr key={name}>
                      <td className="px-4 py-2 border border-gray-200 font-medium">{name}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-600">{purpose}</td>
                      <td className="px-4 py-2 border border-gray-200 text-gray-600">{location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-gray-500 text-xs">SCCs = Standard Contractual Clauses (Decision 2021/914/EU). We do not sell your data to anyone.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights Under GDPR</h2>
            <p className="mb-3">You have the following rights regarding your personal data:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Access</strong> — request a copy of all personal data we hold about you</li>
              <li><strong>Rectification</strong> — correct inaccurate data via your dashboard or by emailing us</li>
              <li><strong>Erasure</strong> — request deletion of your data; we comply within 30 days (subject to legal retention obligations)</li>
              <li><strong>Portability</strong> — receive your data in JSON/CSV format; see also data switching rights in <a href="/terms" className="text-green-600 hover:underline">Clause 4 of our Terms</a></li>
              <li><strong>Object</strong> — object to processing based on legitimate interest</li>
              <li><strong>Restrict</strong> — request that we limit processing in certain circumstances</li>
            </ul>
            <p className="mt-3">
              To exercise any right, email{' '}
              <a href="mailto:privacy@tilltalk.ie" className="text-green-600 hover:underline">privacy@tilltalk.ie</a>.
              We respond within 30 days. You may also lodge a complaint with the{' '}
              <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                Data Protection Commission
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. AI Transparency</h2>
            <p>
              TillTalk uses Anthropic Claude to process your queries. All responses are AI-generated and have not
              been reviewed by a human before delivery. The Service is classified as limited/low-risk AI under
              the EU AI Act (Regulation (EU) 2024/1689). AI outputs are for informational purposes only and
              should be verified before being relied upon for business decisions. They do not constitute
              financial, legal, or professional advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Data Security</h2>
            <p>We protect your data with:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-gray-600">
              <li>AES-128-CBC + HMAC-SHA256 encryption of POS API credentials at rest</li>
              <li>TLS encryption for all data in transit (HTTPS)</li>
              <li>Row-level security on all database tables</li>
              <li>No persistent storage of WhatsApp conversation content</li>
              <li>72-hour breach notification to the DPC and affected users as required by GDPR</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children&apos;s Privacy</h2>
            <p>TillTalk is a B2B service and is not directed at anyone under 18. We do not knowingly collect personal data from minors.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>We will notify you of material changes by email and by posting a notice on our website with at least 30 days&apos; notice. The date at the top of this page always reflects the current version.</p>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>
              <strong>Privacy enquiries:</strong>{' '}
              <a href="mailto:privacy@tilltalk.ie" className="text-green-600 hover:underline">privacy@tilltalk.ie</a><br />
              <strong>General enquiries:</strong>{' '}
              <a href="mailto:hello@tilltalk.ie" className="text-green-600 hover:underline">hello@tilltalk.ie</a><br />
              <strong>Full Terms &amp; Conditions (including DPA):</strong>{' '}
              <a href="/terms" className="text-green-600 hover:underline">tilltalk.ie/terms</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
