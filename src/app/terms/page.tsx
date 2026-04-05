export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms &amp; Conditions</h1>
        <p className="text-gray-500 text-sm mb-8">Last updated: April 2025</p>

        <div className="space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. About TillTalk</h2>
            <p>
              These Terms &amp; Conditions govern your use of the TillTalk service, operated by TillTalk (trading as),
              a business registered in the Republic of Ireland. By creating an account or using the service,
              you agree to be bound by these terms. If you do not agree, do not use the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Free Trial Terms</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>New users receive a <strong>14-day free trial</strong> upon account creation.</li>
              <li>No credit card is required to start your free trial.</li>
              <li>One free trial per POS merchant ID. Multiple accounts using the same POS system will be rejected.</li>
              <li>The trial period begins at the moment of account creation and cannot be paused.</li>
              <li>At the end of the trial, access is suspended until a valid subscription is in place.</li>
              <li>TillTalk reserves the right to extend trial periods at its discretion, for example in cases of technical issues during setup.</li>
              <li>Free trial accounts are subject to all other terms in this agreement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Subscription and Billing</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>Subscriptions are billed monthly or annually, in advance, depending on the plan selected.</li>
              <li>All prices are in Euro (€) and exclude VAT where applicable.</li>
              <li>Payments are processed securely by Stripe. TillTalk does not store card details.</li>
              <li>Your subscription renews automatically unless cancelled before the renewal date.</li>
              <li>Price changes will be communicated with at least 30 days&apos; notice before taking effect.</li>
              <li>Annual subscriptions are billed for 10 months at the equivalent monthly rate (2 months free).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cancellation Policy</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>You may cancel your subscription at any time through your account dashboard or by emailing hello@tilltalk.ie.</li>
              <li>Cancellation takes effect at the end of the current billing period. You retain access until that date.</li>
              <li>No refunds are provided for partial months or unused portions of annual subscriptions, except where required by Irish consumer law.</li>
              <li>Upon cancellation, your data will be retained for 90 days to allow for account reinstatement, then permanently deleted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Read-Only POS Access</h2>
            <p>
              TillTalk connects to your POS system using read-only API credentials. This means:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2 text-gray-600">
              <li>TillTalk can only retrieve sales data — it cannot modify prices, menus, inventory, or any operational settings.</li>
              <li>TillTalk cannot process, initiate, or cancel payments or transactions.</li>
              <li>TillTalk is not responsible for any changes to your POS system made by other parties.</li>
              <li>You are responsible for providing valid API credentials and for maintaining appropriate security on your POS account.</li>
              <li>You should revoke TillTalk&apos;s API access through your POS provider&apos;s settings if you cancel your subscription.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Handling</h2>
            <ul className="list-disc list-inside space-y-2 text-gray-600">
              <li>By using TillTalk, you grant us permission to access and process your POS sales data solely to provide the service.</li>
              <li>We process only aggregated, anonymised sales totals. Individual transaction data is not stored.</li>
              <li>Customer data from your POS (names, card details, contact information) is never accessed or stored by TillTalk.</li>
              <li>Your POS API credentials are encrypted using AES-256 at rest.</li>
              <li>Please refer to our <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a> for full details of how we handle personal data.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2 text-gray-600">
              <li>Use TillTalk for any unlawful purpose or in violation of any applicable laws.</li>
              <li>Attempt to gain unauthorised access to TillTalk&apos;s systems or other users&apos; accounts.</li>
              <li>Share your account credentials with unauthorised third parties.</li>
              <li>Use the service to harass, spam, or harm others.</li>
              <li>Reverse engineer, decompile, or attempt to extract TillTalk&apos;s source code.</li>
              <li>Exceed the usage limits of your plan in an abusive manner.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Service Availability</h2>
            <p>
              TillTalk aims for high availability but does not guarantee uninterrupted service.
              We may temporarily suspend the service for maintenance, security updates, or technical issues.
              We will endeavour to provide advance notice of planned maintenance where possible.
            </p>
            <p className="mt-2">
              The accuracy of responses depends on the data provided by your POS system. TillTalk is not
              responsible for inaccuracies arising from errors in your POS data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Intellectual Property</h2>
            <p>
              All intellectual property in the TillTalk platform, including software, design, trademarks,
              and content, belongs to TillTalk. You are granted a limited, non-exclusive, non-transferable
              licence to use the service for your internal business purposes during your subscription period.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by Irish law:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-2 text-gray-600">
              <li>TillTalk&apos;s total liability to you for any claim shall not exceed the total fees paid by you in the 3 months preceding the claim.</li>
              <li>TillTalk is not liable for any indirect, incidental, consequential, or special damages, including loss of profits or business opportunities.</li>
              <li>TillTalk is not liable for decisions made by you based on information provided by the service.</li>
              <li>Nothing in these terms excludes liability for death or personal injury caused by negligence, fraud, or fraudulent misrepresentation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Termination</h2>
            <p>
              TillTalk may suspend or terminate your account immediately if you breach these terms, fail to pay
              subscription fees, or engage in any activity that we believe poses a risk to our service or other users.
              We will endeavour to notify you by email before taking such action, except in cases of serious breach.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Changes to These Terms</h2>
            <p>
              We may update these terms from time to time. Material changes will be communicated by email
              and by posting a notice on our website with at least 30 days&apos; notice. Continued use of the
              service after that date constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Governing Law</h2>
            <p>
              These Terms &amp; Conditions are governed by and construed in accordance with the laws of the
              Republic of Ireland. Any disputes arising out of or in connection with these terms shall be
              subject to the exclusive jurisdiction of the Irish courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact</h2>
            <p>
              For questions about these terms, contact us at:{' '}
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
