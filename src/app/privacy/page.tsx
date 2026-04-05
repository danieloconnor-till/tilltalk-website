export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: April 2025</p>

        <div className="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. About Us</h2>
            <p>
              TillTalk (trading as TillTalk) is a data analytics service for the hospitality industry,
              operated from Ireland. We act as the data controller for the personal data described in this policy.
            </p>
            <p className="mt-2">
              <strong>Data Controller:</strong> TillTalk<br />
              <strong>Contact:</strong>{' '}
              <a href="mailto:privacy@tilltalk.ie" className="text-green-600 hover:underline">
                privacy@tilltalk.ie
              </a>
              <br />
              <strong>Country:</strong> Republic of Ireland
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. What Data We Collect and Why</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Account Data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Full name and email address — to identify your account and contact you</li>
                  <li>Business name — to personalise your experience</li>
                  <li>Phone/WhatsApp number — to deliver the TillTalk service via WhatsApp</li>
                  <li>POS API credentials (AES-256 encrypted) — to connect to your point-of-sale system</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Usage Data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Query counts and report requests — to enforce plan limits and improve the service</li>
                  <li>Aggregated sales totals retrieved from your POS — processed in memory only, not stored individually</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Payment Data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Stripe customer ID and subscription ID — to manage your subscription. Card details are held exclusively by Stripe.</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Cookie Data</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  <li>Essential session cookies — required for authentication and keeping you logged in</li>
                  <li>Cookie consent flag — stored in localStorage to remember your cookie preference</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Legal Basis for Processing</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Contract performance (Article 6(1)(b) GDPR)</strong> — processing your account data and POS credentials is necessary to provide the TillTalk service you have signed up for.</li>
              <li><strong>Legitimate interest (Article 6(1)(f) GDPR)</strong> — usage analytics to improve service quality and prevent abuse.</li>
              <li><strong>Legal obligation (Article 6(1)(c) GDPR)</strong> — retention of billing records as required by Irish tax law.</li>
              <li><strong>Consent (Article 6(1)(a) GDPR)</strong> — for any optional marketing communications, where applicable.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Account data</strong> — retained for the duration of your subscription plus 90 days after cancellation, unless you request earlier deletion.</li>
              <li><strong>Billing records</strong> — retained for 7 years as required by Irish Revenue legislation.</li>
              <li><strong>Usage logs</strong> — retained for 90 days then permanently deleted.</li>
              <li><strong>POS credentials</strong> — deleted immediately upon account closure or on request.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Third-Party Processors</h2>
            <p className="mb-3">We use the following sub-processors to deliver our service. Each is GDPR-compliant and subject to appropriate data processing agreements:</p>
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
                    ['Supabase', 'Database and authentication hosting', 'EU (Ireland)'],
                    ['Stripe', 'Payment processing', 'EU / USA (Standard Contractual Clauses)'],
                    ['Twilio / WhatsApp', 'WhatsApp message delivery', 'USA (Standard Contractual Clauses)'],
                    ['Anthropic', 'AI-powered query processing', 'USA (Standard Contractual Clauses)'],
                    ['SendGrid', 'Transactional email delivery', 'USA (Standard Contractual Clauses)'],
                    ['Railway', 'Application infrastructure', 'EU'],
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
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights Under GDPR</h2>
            <p className="mb-3">As a data subject under the GDPR, you have the following rights:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Right of access</strong> — you may request a copy of all personal data we hold about you.</li>
              <li><strong>Right to rectification</strong> — you may correct inaccurate data through your dashboard or by emailing us.</li>
              <li><strong>Right to erasure</strong> — you may request deletion of your data. We will comply within 30 days, subject to legal retention obligations.</li>
              <li><strong>Right to data portability</strong> — you may request your data in a machine-readable format (JSON/CSV).</li>
              <li><strong>Right to object</strong> — you may object to processing based on legitimate interest.</li>
              <li><strong>Right to restrict processing</strong> — you may request that we limit how we use your data in certain circumstances.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email{' '}
              <a href="mailto:privacy@tilltalk.ie" className="text-green-600 hover:underline">
                privacy@tilltalk.ie
              </a>
              . We will respond within 30 days. You also have the right to lodge a complaint with the{' '}
              <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                Data Protection Commission (Ireland)
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Cookie Policy</h2>
            <p>
              TillTalk uses <strong>essential cookies only</strong>. These are strictly necessary for the website
              to function and cannot be disabled without breaking core functionality. We do not use tracking,
              advertising, analytics, or any third-party cookies.
            </p>
            <p className="mt-2">
              Essential cookies include: authentication session tokens and CSRF protection tokens.
              These are deleted when you sign out or when they expire naturally.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Data Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your personal data, including:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-gray-600">
              <li>AES-256 encryption of POS API credentials at rest</li>
              <li>TLS encryption for all data in transit</li>
              <li>Row-level security on all database tables</li>
              <li>Principle of least privilege for all internal access</li>
              <li>Regular security reviews</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children&apos;s Privacy</h2>
            <p>
              TillTalk is a business service and is not directed at anyone under 18 years of age. We do not
              knowingly collect personal data from minors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. We will notify you of material changes by email
              and by posting a notice on our website. The date of the latest update appears at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>
              For any questions, data requests, or complaints regarding this privacy policy:
            </p>
            <p className="mt-2">
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@tilltalk.ie" className="text-green-600 hover:underline">
                privacy@tilltalk.ie
              </a>
              <br />
              <strong>General enquiries:</strong>{' '}
              <a href="mailto:hello@tilltalk.ie" className="text-green-600 hover:underline">
                hello@tilltalk.ie
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
