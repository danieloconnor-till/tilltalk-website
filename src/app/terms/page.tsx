export const metadata = {
  title: "Terms of Service — TillTalk",
  description: "TillTalk's Terms of Service. AI-managed marketing service for hospitality and retail.",
};

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Terms of Service</h1>
        <p className="text-gray-500 text-sm mb-8">
          <strong>Last updated:</strong> 6 May 2026 &middot; <strong>Effective:</strong> 6 May 2026 &middot; Prime Construct Ltd (trading as TillTalk)
        </p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">

          <div className="space-y-3">
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the TillTalk service operated by Prime Construct Ltd (&ldquo;TillTalk&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;). By signing up as a client, you agree to these Terms. If you do not agree, do not use the service.
            </p>
            <p>
              These Terms should be read alongside our{' '}
              <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who we are</h2>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1">
              <p>Prime Construct Ltd, trading as TillTalk</p>
              <p>Registered in Ireland, company number 751535</p>
              <p>VAT number IE4224722DH</p>
              <p>Registered office: Farran, Mourneabbey, Co. Cork, P51 KF88, Ireland</p>
              <p>Contact:{' '}<a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. The service</h2>
            <p className="mb-3">
              TillTalk is an AI-managed marketing service for independent hospitality and retail businesses (&ldquo;the service&rdquo;). The service:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>Manages your Meta, Google, and TikTok advertising campaigns end to end</li>
              <li>Reads your point-of-sale (POS) transaction data on a strictly read-only basis</li>
              <li>Pushes hashed conversion events to ad platforms to verify ad-driven revenue</li>
              <li>Provides weekly reports and recommendations via WhatsApp and a web dashboard</li>
            </ul>
            <p>
              You authorise TillTalk to act on your behalf with the third-party platforms you connect (your POS, ad platforms, payment processor).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account, eligibility, and authority</h2>
            <p className="mb-3">To use TillTalk you must:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>Be at least 18 years old</li>
              <li>Operate a registered business</li>
              <li>Have authority to bind that business to these Terms</li>
              <li>Have authority to grant TillTalk access to the third-party platforms you connect</li>
            </ul>
            <p>
              TillTalk reserves the right to decline service to any prospect or terminate service to any client whose business does not meet our qualification criteria, who provides false information, or whose use of the service materially conflicts with these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Pricing and payment</h2>

            <h3 className="font-semibold text-gray-900 mb-2">4.1 Four-phase pricing</h3>
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="py-2 pr-6 font-medium">Phase</th>
                    <th className="py-2 pr-6 font-medium">Months</th>
                    <th className="py-2 font-medium">Fee</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-6">Onboarding</td>
                    <td className="py-2 pr-6">1&ndash;3</td>
                    <td className="py-2">&euro;0 (no fee)</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-6">Activation</td>
                    <td className="py-2 pr-6">4&ndash;6</td>
                    <td className="py-2">1.5% of incremental revenue</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-6">Proof</td>
                    <td className="py-2 pr-6">7&ndash;12</td>
                    <td className="py-2">3% of incremental revenue</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-6">Steady state</td>
                    <td className="py-2 pr-6">13+</td>
                    <td className="py-2">Degressive: 5% / 4% / 3% / 2.5% on tiered monthly incremental</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mb-3">
              Steady-state tiers (per month): first &euro;5,000 incremental at 5%, next &euro;10,000 at 4%, next &euro;15,000 at 3%, anything above &euro;30,000 at 2.5%.
            </p>
            <p className="mb-5">
              All fees are exclusive of VAT. Irish VAT at the prevailing rate (currently 23%) is added to invoices issued from Ireland; clients VAT-registered in the EU may reclaim through the reverse-charge mechanism where applicable.
            </p>

            <h3 className="font-semibold text-gray-900 mb-2">4.2 What &ldquo;incremental revenue&rdquo; means</h3>
            <p className="mb-3">
              &ldquo;Incremental revenue&rdquo; is your revenue measured against your annual baseline, after deductions for events that are not caused by TillTalk, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>Addition of new revenue streams (e.g. delivery partners) initiated independently of TillTalk</li>
              <li>Extensions to your trading hours or trading days</li>
              <li>Special offers or promotions run independently of TillTalk</li>
              <li>Price increases above the prevailing Irish CPI inflation rate</li>
              <li>General trading conditions affecting the local economy in your area, as agreed between us</li>
            </ul>
            <p className="mb-3">
              Cash sales and other transactions that cannot be attributed via the ad platforms&apos; conversion APIs are excluded from incremental revenue by contract and never counted toward fees.
            </p>
            <p className="mb-3">
              Your annual baseline resets on 1 January each calendar year.
            </p>
            <p className="mb-5">
              For the first 50 TillTalk clients, anomaly-detection edge cases are reviewed by us manually and you have the right to challenge any classification before invoicing.
            </p>

            <h3 className="font-semibold text-gray-900 mb-2">4.3 Platform spend</h3>
            <p className="mb-5">
              You pay your Meta, Google, TikTok, and other platform ad spend directly to those platforms. TillTalk does not invoice you for platform spend or hold platform funds on your behalf.
            </p>

            <h3 className="font-semibold text-gray-900 mb-2">4.4 Invoicing and payment terms</h3>
            <p className="mb-5">
              Invoices are issued monthly via Stripe. Payment is due 30 days from invoice date. Overdue accounts may be paused after 14 days of non-payment following written notice.
            </p>

            <h3 className="font-semibold text-gray-900 mb-2">4.5 Refunds</h3>
            <p>
              Because fees are calculated on verified outcomes and payable only after the result, refunds are typically not applicable. Where billing errors occur or anomaly classifications are corrected after invoicing, we issue credit notes against future invoices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Your responsibilities</h2>
            <p className="mb-3">You agree to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Provide accurate business and contact information</li>
              <li>Grant and maintain the third-party authorisations TillTalk needs to operate (POS read access; ad platform management access; payment processor access)</li>
              <li>Approve campaign briefs through the channels we provide (WhatsApp, dashboard) within reasonable time</li>
              <li>Notify us promptly of relevant operational changes (closures, hours changes, menu changes, ownership changes)</li>
              <li>Not interfere with TillTalk&apos;s automated operations on your accounts (for example, do not pause or alter campaigns we are actively running without first telling us)</li>
              <li>Comply with the terms of the third-party platforms you connect (Meta, Google, TikTok, your POS, Stripe)</li>
              <li>Not use TillTalk to advertise illegal goods or services, or to violate the policies of any platform we operate on your behalf</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Our responsibilities</h2>
            <p className="mb-3">We agree to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Operate the service with reasonable skill and care</li>
              <li>Keep your data confidential per our Privacy Policy and our Data Processing Agreement (DPA) with you</li>
              <li>Treat your POS connection as strictly read-only and never write to your POS</li>
              <li>Use your customers&apos; personal data only as a processor on your instruction, hashing identifiers before any transmission to third parties</li>
              <li>Notify you of material service changes at least 30 days in advance</li>
              <li>Maintain reasonable measures to keep the service secure (encryption in transit and at rest, access controls, error monitoring)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Geographic and category exclusivity</h2>
            <p>
              TillTalk operates a one-client-per-cuisine-per-area exclusivity policy in launch markets. Once we sign a client in a given category and area, no competing business in the same category and area may sign on while you remain an active client. This is a benefit of the service to you. Slot definitions and area boundaries are documented separately and may be updated over time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Term and termination</h2>

            <h3 className="font-semibold text-gray-900 mb-2">8.1 No lock-in</h3>
            <p className="mb-5">
              You may terminate at any time on 30 days written notice via{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>. We may terminate on 30 days written notice for any reason.
            </p>

            <h3 className="font-semibold text-gray-900 mb-2">8.2 Immediate termination by us</h3>
            <p className="mb-3">We may terminate immediately without notice if:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-5">
              <li>You materially breach these Terms and do not cure the breach within 14 days of written notice</li>
              <li>You become insolvent, enter liquidation, or assign your business for the benefit of creditors</li>
              <li>You misrepresent material facts on signup that affect TillTalk&apos;s ability to operate the service for you</li>
              <li>You instruct TillTalk to take actions that would breach a third-party platform&apos;s policies, applicable law, or these Terms</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mb-2">8.3 Effects of termination</h3>
            <p className="mb-3">On termination:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Outstanding fees up to the termination date are payable on the next invoice cycle</li>
              <li>Your slot is released; another business in your category and area may sign on</li>
              <li>TillTalk withdraws from active management of your ad accounts within 14 days</li>
              <li>Your data is handled per Section 9 below and our Privacy Policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Intellectual property and data ownership</h2>

            <h3 className="font-semibold text-gray-900 mb-2">9.1 What you own</h3>
            <p className="mb-3">You retain all rights to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-3">
              <li>Your business data (account information, business profile, hours, menu, brand assets you supply)</li>
              <li>Your raw transaction data (held in your POS &mdash; TillTalk reads it but does not own it)</li>
              <li>Your customer data, including identifying fields read from transactions</li>
              <li>Your conversation history with TillTalk (WhatsApp messages, dashboard chats, voice-note transcripts)</li>
              <li>Creative materials TillTalk produces specifically for your campaigns (ad copy, images, videos derived from your supplied assets), licensed to you for any use after termination</li>
            </ul>
            <p className="mb-5">
              Granting TillTalk the access it needs to operate the service does not transfer ownership of any of the above to TillTalk.
            </p>

            <h3 className="font-semibold text-gray-900 mb-2">9.2 What TillTalk owns</h3>
            <p className="mb-3">TillTalk retains all rights to:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>The TillTalk software, application code, agent prompts, and underlying systems</li>
              <li>The user interfaces (WhatsApp flow, web dashboard)</li>
              <li>The pricing engine, anomaly-detection subsystem, identity-resolution layer, and POS adaptation layer</li>
              <li>All other materials TillTalk develops as part of the service</li>
            </ul>
            <p className="mb-5">
              Your right to use the service does not transfer ownership of any of these to you.
            </p>

            <h3 className="font-semibold text-gray-900 mb-2">9.3 Derived models, calibrations, and operational learnings</h3>
            <p className="mb-3">For clarity, and as a material part of these Terms:</p>
            <p className="mb-3">
              While you retain ownership of your raw business and customer data per Section 9.1, TillTalk retains exclusive ownership of all <strong>derived artefacts</strong> produced by TillTalk&apos;s systems while operating the service for you, including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>Daypart and capacity models specific to your business</li>
              <li>Audience-response models and creative-performance learnings</li>
              <li>Anomaly-detection calibrations specific to your trading patterns</li>
              <li>Aggregated benchmarks against comparable businesses</li>
              <li>Trained parameters, embeddings, and weights inside TillTalk&apos;s models</li>
              <li>Internal operational metadata (campaign-decision logs, agent reasoning traces, quality scores)</li>
            </ul>
            <p className="mb-3">
              These derived artefacts are TillTalk&apos;s proprietary work product and confidential trade secrets. They are not part of &ldquo;your data&rdquo; for any purpose under these Terms or applicable data-protection law (because they are aggregated, derived, or anonymised). They are not transferable to you on termination, are not subject to data-portability requests, and remain the exclusive property of TillTalk during and after your engagement.
            </p>
            <p className="mb-5">
              This carve-out is necessary because TillTalk&apos;s ability to deliver the service depends on these artefacts, and treating them as transferable would compromise the integrity of the service for all clients.
            </p>

            <h3 className="font-semibold text-gray-900 mb-2">9.4 What you receive on termination</h3>
            <p className="mb-3">
              On termination, TillTalk will, at your written request and within 30 days, provide you with:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>An export of your account data</li>
              <li>An export of your conversation history with TillTalk</li>
              <li>A copy of the creative materials TillTalk produced for your campaigns (under the licence in Section 9.1)</li>
              <li>A list of the campaigns active or recently active under your accounts at the time of termination, with their basic configuration (objective, audience description, budget, schedule)</li>
            </ul>
            <p className="mb-3">You will not receive (because TillTalk owns them per Section 9.3):</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>Daypart, capacity, audience-response, or anomaly-detection models built from your data</li>
              <li>Trained parameters, embeddings, or weights inside TillTalk&apos;s models</li>
              <li>Aggregated benchmarks</li>
              <li>TillTalk&apos;s internal operational metadata or agent reasoning traces</li>
            </ul>
            <p>Your access to the live service ends at termination per Section 8.3.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Confidentiality</h2>
            <p className="mb-3">
              We will not disclose your business data, transaction data, or commercial terms to any third party except:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
              <li>As required to operate the service (sub-processors per the Privacy Policy)</li>
              <li>As required by law or court order</li>
              <li>With your written consent</li>
            </ul>
            <p>
              You agree to keep confidential the commercial terms of your engagement with TillTalk, including pricing, and the existence and nature of TillTalk&apos;s derived artefacts (Section 9.3).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Warranties and disclaimers</h2>

            <h3 className="font-semibold text-gray-900 mb-2">11.1 What we warrant</h3>
            <p className="mb-5">
              We warrant that the service will be provided with reasonable skill and care, in conformance with these Terms.
            </p>

            <h3 className="font-semibold text-gray-900 mb-2">11.2 What we do not warrant</h3>
            <p className="mb-3">To the maximum extent permitted by law, we do not warrant:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-3">
              <li>That the service will produce any specific level of revenue, customer count, or other business outcome</li>
              <li>That the service will be uninterrupted or error-free at all times</li>
              <li>That third-party platforms (Meta, Google, TikTok, your POS, Stripe, etc.) will operate without disruption, or that their policies will not change in ways outside our control</li>
              <li>That competitors will not adopt similar approaches over time</li>
            </ul>
            <p>
              The service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; except where these Terms explicitly state otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Limitation of liability</h2>
            <p className="mb-3">To the maximum extent permitted by Irish law:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 mb-3">
              <li>Neither party is liable to the other for indirect, consequential, incidental, or special damages, lost profits, lost data, or loss of business opportunity</li>
              <li>Our total aggregate liability under or in connection with these Terms in any 12-month period is limited to the total fees you paid us in that period (or, if no fees have been paid, &euro;1,000)</li>
            </ul>
            <p>
              Nothing in these Terms limits liability for fraud, gross negligence, wilful misconduct, death or personal injury caused by negligence, or any liability that cannot be limited under Irish law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Indemnity</h2>
            <p className="mb-3">
              You agree to indemnify TillTalk against claims, losses, and reasonable legal fees arising from:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li>Your breach of these Terms</li>
              <li>Your violation of any third-party platform&apos;s policies that you authorised TillTalk to act on</li>
              <li>Any data you provided to TillTalk (such as your customer data) that you did not have the right to share with us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Changes to these Terms</h2>
            <p className="mb-3">
              We may update these Terms from time to time. Material changes will be communicated to clients by email at least 30 days before they take effect. Continued use of the service after the effective date constitutes acceptance.
            </p>
            <p>A version history of these Terms is available on request.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Governing law and disputes</h2>
            <p className="mb-3">
              These Terms are governed by the laws of Ireland. The Irish courts have exclusive jurisdiction over any dispute arising from or in connection with these Terms, except where mandatory consumer protection laws of your jurisdiction provide otherwise.
            </p>
            <p>
              We will attempt to resolve disputes amicably first. Either party may then escalate to mediation before commencing court proceedings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">16. Miscellaneous</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li><strong>Entire agreement.</strong> These Terms, together with the Privacy Policy and the DPA, are the entire agreement between you and TillTalk regarding the service.</li>
              <li><strong>No waiver.</strong> Failure to enforce a right is not a waiver of that right.</li>
              <li><strong>Severability.</strong> If any provision is held unenforceable, the rest remains in effect.</li>
              <li><strong>Assignment.</strong> You may not assign these Terms without our written consent. We may assign these Terms to a successor entity in connection with a merger or sale of the business.</li>
              <li><strong>Notices.</strong> Notices to TillTalk are given to{' '}<a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>. Notices to you are given to the email address on your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">17. Contact</h2>
            <p className="mb-3">For any question about these Terms, billing, or service operations:</p>
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
