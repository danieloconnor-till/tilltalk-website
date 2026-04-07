export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">

        <h1 className="text-3xl font-bold text-gray-900 mb-1">Terms &amp; Conditions</h1>
        <p className="text-gray-500 text-sm mb-1">Version 4.1 — Last updated: April 2026</p>
        <p className="text-gray-500 text-sm mb-8">
          Prime Construct Ltd | CRO No. 751535 | VAT No. IE4224722DH<br />
          Registered office: Farran, Mourneabbey, Co. Cork, P51 KF88
        </p>

        {/* Key Terms at a Glance */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-10">
          <h2 className="text-base font-semibold text-green-900 mb-3">Key Terms at a Glance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                {[
                  ['What is TillTalk?', 'An AI-powered WhatsApp analytics tool for hospitality and retail businesses'],
                  ['Who provides it?', 'Prime Construct Ltd (trading as TillTalk), registered in Ireland'],
                  ['Free trial', '14 days, no credit card required, no auto-renewal'],
                  ['Pricing (inc. VAT)', 'Starter €29/mo · Pro €49/mo · Business €99/mo'],
                  ['Cancel anytime', 'Yes — no penalties, data exported within 30 days'],
                  ['AI-generated content', 'All responses are AI-generated and should be independently verified'],
                  ['Your data', 'Encrypted, never sold, deleted within 30 days of cancellation'],
                  ['Governing law', 'Republic of Ireland'],
                  ['Complaints', 'hello@tilltalk.ie · CCPC (consumers) · DPC (data issues)'],
                ].map(([label, value]) => (
                  <tr key={label} className="border-b border-green-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-green-900 whitespace-nowrap align-top w-44">{label}</td>
                    <td className="py-2 text-green-800">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Limitation of Liability</h2>
            <div className="space-y-3">
              <p><strong>1.1 Business Customers (B2B):</strong> To the fullest extent permitted under Irish and EU law, TillTalk (operated by Prime Construct Ltd, CRO No. 751535, VAT No. IE4224722DH, registered in Ireland) shall not be liable to business customers for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, loss of revenue, loss of data, or loss of business opportunity, arising out of or in connection with your use of the Service. TillTalk&apos;s total aggregate liability to business customers shall not exceed the greater of: (a) the total fees paid in the three months preceding the claim, or (b) €100.</p>
              <p><strong>1.2 Consumer Customers:</strong> Statutory remedies under the Consumer Rights Act 2022 are not affected. Nothing limits TillTalk&apos;s obligations under the EU Data Act (Regulation (EU) 2023/2854) or Product Liability Directive (2024/2853/EU).</p>
              <p><strong>1.3 Exclusions:</strong> Liability is not limited for death or personal injury from negligence, fraud, wilful default or gross negligence, Data Act switching/portability obligations, or Product Liability Directive obligations from December 2026.</p>
              <p><strong>1.4 Read-only access:</strong> TillTalk provides strictly read-only access to your POS system. We do not modify, delete, or write to your POS data.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Conformity of the Service</h2>
            <p>TillTalk supplies the Service with reasonable skill and care. For subscriptions, conformity is maintained throughout including security and compatibility updates. Remedies for non-conformity include repair, replacement, price reduction, or termination. Burden of proof rests with TillTalk for the first 12 months (consumers). A 14-day cooling-off period applies for consumers before the Service begins. For material changes, 30 days&apos; notice is given with the right to terminate without penalty.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. AI-Generated Content</h2>
            <div className="space-y-3">
              <p><strong>3.1</strong> You are interacting with an AI-powered system using Anthropic Claude, disclosed under the EU AI Act (Regulation (EU) 2024/1689).</p>
              <p><strong>3.2</strong> The Service is classified as limited/low-risk AI for business analytics. No autonomous decisions with legal or financial effects on individuals are made.</p>
              <p><strong>3.3</strong> AI outputs may contain inaccuracies. Outputs are not reviewed by humans before delivery. You should verify outputs before relying on them for business decisions. Nothing in the Service constitutes financial, legal, or business advice.</p>
              <p><strong>3.4</strong> Outputs are synthetic AI-generated text. TillTalk facilitates AI disclosure via metadata and footer notes where feasible. Users are responsible for disclosing AI-generated content to third parties as required by Article 50 of the EU AI Act.</p>
              <p><strong>3.5</strong> You must not use outputs to train, develop, benchmark, or create competing AI systems or services.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Data Portability and Switching (EU Data Act)</h2>
            <div className="space-y-3">
              <p><strong>4.1</strong> You may switch providers at any time with 30 days&apos; notice (statutory maximum 2 months under the EU Data Act). No penalties apply.</p>
              <p><strong>4.2</strong> Data export is provided within 30 days on request in JSON/CSV format, covering: account details, authorised users, payroll entries, notes and reminders, and usage metadata. POS transaction data is held by your POS provider — request it directly from them. Derived analytics can be re-generated on request during the switching period where feasible.</p>
              <p><strong>4.3</strong> A 30-day switching assistance period is provided with no technical barriers.</p>
              <p><strong>4.4</strong> No switching fees are charged. Switching fees are fully prohibited from January 2027 under the EU Data Act.</p>
              <p><strong>4.5</strong> Data formats and switching procedures are available on request at <a href="mailto:hello@tilltalk.ie" className="text-green-600 hover:underline">hello@tilltalk.ie</a> and in your dashboard.</p>
              <p><strong>4.6</strong> No technical barriers to data retrieval or export are imposed.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Service Availability</h2>
            <p>No guaranteed uptime is provided. The Service depends on Railway, Vercel, Twilio, and Supabase infrastructure. No SLA is included on the Starter or Pro plan. A Business plan SLA is available on request. Force majeure applies. Data Act obligations are maintained during force majeure where practicable.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Third-Party Services</h2>
            <p>The Service integrates with Clover, Square, Epos Now, Twilio (WhatsApp), and Stripe. TillTalk is not responsible for third-party availability or changes. WhatsApp usage is subject to Meta Business API Terms. You must maintain valid POS credentials and revoke TillTalk&apos;s access through your POS provider if you cancel.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p>All intellectual property is owned by Prime Construct Ltd. You are granted a limited, non-exclusive, non-transferable licence to use the Service for internal business purposes during your subscription. You retain ownership of your data. You must not copy, reverse engineer, scrape outputs, train competing AI systems, or create competing products using the Service or its outputs.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Customer Indemnity</h2>
            <p>You agree to indemnify Prime Construct Ltd against claims arising from: breach of these Terms, violation of applicable law, third-party data claims arising from your use, breach of Meta or third-party platform terms, and sharing AI-generated outputs without appropriate disclosure.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Acceptable Use</h2>
            <p className="mb-2">You agree to use the Service for lawful business analytics purposes only. You must not:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Share credentials outside your business</li>
              <li>Access or attempt to access another business&apos;s data</li>
              <li>Reverse engineer or decompile the Service</li>
              <li>Resell or sublicense access to the Service</li>
              <li>Create competing products using the Service or its outputs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Aggregated Data</h2>
            <p>TillTalk holds a non-exclusive licence to use anonymised, aggregated data for research and product improvement purposes. Individual users are never identified. Individual data is never sold. This use is consistent with GDPR, the Data Protection Act 2018, and the EU Data Act.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Trial and Billing</h2>
            <div className="space-y-3">
              <p>New accounts receive a <strong>14-day free trial</strong> with no credit card required and no automatic renewal from trial to paid.</p>
              <p>Subscriptions are billed monthly or annually in advance. All prices include VAT at 23%:</p>
              <div className="overflow-x-auto">
                <table className="text-sm border-collapse w-full mt-1">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Plan</th>
                      <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Monthly</th>
                      <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Annual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Starter', '€29/mo', '€290/yr'],
                      ['Pro', '€49/mo', '€490/yr'],
                      ['Business', '€99/mo', '€990/yr'],
                    ].map(([plan, mo, yr]) => (
                      <tr key={plan}>
                        <td className="px-4 py-2 border border-gray-200 font-medium">{plan}</td>
                        <td className="px-4 py-2 border border-gray-200 text-gray-600">{mo}</td>
                        <td className="px-4 py-2 border border-gray-200 text-gray-600">{yr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>Current pricing is always published at <a href="https://tilltalk.ie" className="text-green-600 hover:underline">tilltalk.ie</a>. Price changes are notified 30 days in advance. Subscriptions auto-renew with reminder. Consumer 14-day withdrawal applies before the Service begins — once the Service has begun this right may no longer apply. No refunds for partial periods. No penalties for cancellation.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Changes to These Terms</h2>
            <p>Material changes to these Terms will be communicated with 30 days&apos; written notice. Continued use of the Service after that date constitutes acceptance. You have the right to cancel without penalty if you do not accept the changes.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Complaints and Dispute Resolution</h2>
            <p>Contact us first at <a href="mailto:hello@tilltalk.ie" className="text-green-600 hover:underline">hello@tilltalk.ie</a> — we respond within 14 business days. Irish consumers may contact the <a href="https://www.ccpc.ie" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">CCPC (ccpc.ie)</a>. EU consumers may use the <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">EU ODR platform</a>. Data complaints should be directed to the <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">Data Protection Commission (dataprotection.ie)</a>. Business disputes are subject to Irish court jurisdiction.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Data Retention and Deletion</h2>
            <p>Your data is retained for 30 days after cancellation then permanently deleted. POS credentials are encrypted at rest using AES-128-CBC with HMAC-SHA256. Conversation history is never stored persistently — it exists in memory only for a maximum of 10 minutes (privacy by design). To request deletion, email <a href="mailto:hello@tilltalk.ie" className="text-green-600 hover:underline">hello@tilltalk.ie</a>. Requests are actioned within 30 days per Article 17 GDPR.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Data Processing Agreement (DPA)</h2>
            <div className="space-y-3">
              <p>Pursuant to Article 28 GDPR: the Customer acts as Controller and TillTalk acts as Processor.</p>
              <p><strong>Data processed:</strong> WhatsApp numbers, business name and email, POS transaction data (processed in memory, not stored individually).</p>
              <p><strong>Sub-processors (current as of April 2026):</strong></p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Sub-processor</th>
                      <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Purpose</th>
                      <th className="text-left px-4 py-2 border border-gray-200 font-semibold">Location / Transfer mechanism</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Railway', 'Application infrastructure (bot)', 'USA — Standard Contractual Clauses'],
                      ['Vercel', 'Application infrastructure (website)', 'USA — Standard Contractual Clauses'],
                      ['Supabase', 'Database and authentication', 'EU (Ireland) — no transfer'],
                      ['Twilio', 'WhatsApp message delivery', 'USA — Standard Contractual Clauses'],
                      ['Anthropic', 'AI query processing', 'USA — Standard Contractual Clauses'],
                      ['SendGrid / Twilio', 'Transactional email', 'USA — Standard Contractual Clauses'],
                      ['Stripe', 'Payment processing', 'USA / EU — Standard Contractual Clauses'],
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
              <p>14 days&apos; notice is given of sub-processor changes. Security measures: AES-128-CBC encryption at rest, HTTPS in transit, row-level access controls, no persistent conversation storage. 72-hour breach notification. International transfers via Standard Contractual Clauses (Decision 2021/914/EU). A Record of Processing Activities (RoPA) is maintained internally. Governed by Irish law.</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">16. General</h2>
            <p>These Terms constitute the entire agreement between the parties regarding the Service. If any clause is found unenforceable, the remaining clauses remain in full force. No waiver of any breach constitutes a waiver of any subsequent breach. Assignment of these Terms by you requires TillTalk&apos;s prior written consent; TillTalk may assign on a merger or acquisition.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">17. Governing Law</h2>
            <p>These Terms are governed by and construed in accordance with the laws of the Republic of Ireland. The Irish courts have exclusive jurisdiction over any disputes. Consumer rights under the law of the consumer&apos;s EU member state are preserved.</p>
          </section>

          <section className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400">
              Questions about these Terms? Contact{' '}
              <a href="mailto:hello@tilltalk.ie" className="text-green-600 hover:underline">hello@tilltalk.ie</a>.
              See also our <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
