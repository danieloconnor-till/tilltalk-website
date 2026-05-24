export const metadata = {
  title: "Sub-Processors — TillTalk",
  description: "List of third-party sub-processors used by TillTalk to deliver the service.",
};

const SUB_PROCESSORS = [
  {
    service: "Clover (Fiserv)",
    category: "POS Integration",
    purpose: "Reads transaction data on the merchant's instruction to verify ad performance",
    dataProcessed: "Transaction amounts, timestamps, tender type; hashed customer identifiers (email, phone, name) derived from POS records",
    region: "USA",
    dpa: "Clover Developer Agreement",
  },
  {
    service: "Twilio",
    category: "Messaging Delivery",
    purpose: "Delivers WhatsApp and SMS messages between TillTalk and clients",
    dataProcessed: "Phone numbers, message content (AI responses, reports, alerts)",
    region: "USA",
    dpa: "Twilio Data Processing Addendum",
  },
  {
    service: "Anthropic",
    category: "AI Processing",
    purpose: "Powers the TillTalk AI marketing agent that answers client queries and drafts recommendations",
    dataProcessed: "Query content, business context, conversation history (no raw customer PII is sent to Anthropic)",
    region: "USA",
    dpa: "Anthropic Commercial Data Processing Agreement",
  },
  {
    service: "OpenAI",
    category: "AI Processing (fallback)",
    purpose: "Provides fallback AI inference for the TillTalk marketing agent when Anthropic is unavailable or for specific embedding workloads",
    dataProcessed: "Query content, business context, conversation history (no raw customer PII)",
    region: "USA",
    dpa: "OpenAI Data Processing Addendum",
  },
  {
    service: "Meta Platforms Ireland Ltd (Facebook / Instagram)",
    category: "Ad Platform — Campaign Operation & Conversion Matching",
    purpose: "Receives campaign operation data (campaign names, budgets, audience definitions, creative assets) via the Meta Marketing API and hashed conversion events via the Meta Conversions API (CAPI), to run and measure advertising campaigns on the client's behalf on Facebook and Instagram",
    dataProcessed: "Campaign metadata, budgets, audience definitions; hashed customer identifiers (email, phone, first name, last name), transaction value, transaction timestamp, event type",
    region: "EU (Ireland) / USA",
    dpa: "Meta Platform Terms & Data Processing Terms",
  },
  {
    service: "Google Ireland Ltd (Google Ads)",
    category: "Ad Platform — Campaign Operation & Conversion Matching",
    purpose: "Receives campaign operation data (campaign names, budgets, audience definitions, creative assets) via the Google Ads API and hashed conversion events via Google Enhanced Conversions, to run and measure advertising campaigns on the client's behalf across Google's advertising network",
    dataProcessed: "Campaign metadata, budgets, audience definitions; hashed customer identifiers (email, phone, first name, last name), transaction value, transaction timestamp",
    region: "EU (Ireland) / USA",
    dpa: "Google Ads Data Processing Terms",
  },
  {
    service: "TikTok Technology Limited (TikTok)",
    category: "Ad Platform — Campaign Operation & Conversion Matching",
    purpose: "Receives campaign operation data (campaign names, budgets, audience definitions, creative assets) via the TikTok Marketing API and hashed conversion events via the TikTok Events API, to run and measure advertising campaigns on the client's behalf on TikTok",
    dataProcessed: "Campaign metadata, budgets, audience definitions; hashed customer identifiers (email, phone, first name, last name), transaction value, transaction timestamp, event type",
    region: "Ireland / USA / Singapore",
    dpa: "TikTok For Business Commercial Terms & DPA",
  },
  {
    service: "Stripe",
    category: "Payment Processing",
    purpose: "Processes subscription billing and payment management for TillTalk clients",
    dataProcessed: "Card tokens (not card numbers), billing contact details, subscription status",
    region: "USA / EU",
    dpa: "Stripe Data Processing Addendum",
  },
  {
    service: "SendGrid (Twilio)",
    category: "Email Delivery",
    purpose: "Sends transactional emails (account, billing, security) and marketing emails on TillTalk's behalf",
    dataProcessed: "Email addresses, names, email content",
    region: "USA",
    dpa: "Twilio SendGrid Data Processing Addendum",
  },
  {
    service: "Supabase",
    category: "Database, Authentication & File Storage",
    purpose: "Stores client account data, encrypted POS credentials, and operational data; handles client authentication",
    dataProcessed: "Account data (name, email, business details), encrypted POS credentials, operational records",
    region: "EU (Ireland)",
    dpa: "Supabase Data Processing Agreement",
  },
  {
    service: "Railway",
    category: "Application Hosting & Compute",
    purpose: "Runs the TillTalk backend service and AI agent infrastructure",
    dataProcessed: "All application data passing through the TillTalk backend, including client data and hashed transaction data",
    region: "USA",
    dpa: "Railway Data Processing Agreement",
  },
  {
    service: "Vercel",
    category: "Website Hosting",
    purpose: "Serves tilltalk.ie, the client dashboard, and all public-facing web pages",
    dataProcessed: "Website traffic, session tokens, page requests",
    region: "Global CDN (data processed in USA)",
    dpa: "Vercel Data Processing Addendum",
  },
  {
    service: "Sentry",
    category: "Application Error Monitoring",
    purpose: "Captures application errors and performance traces from the TillTalk backend and website to detect and resolve faults",
    dataProcessed: "Error stack traces, request context, sanitised application logs (no raw PII; access tokens redacted at source)",
    region: "EU (Frankfurt) — Sentry EU instance",
    dpa: "Sentry Data Processing Addendum",
  },
];

export default function SubProcessorsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Sub-Processor List</h1>
        <p className="text-gray-500 text-sm mb-8">
          <strong>Last updated:</strong> 24 May 2026 &middot; Prime Construct Ltd (trading as TillTalk)
        </p>

        <div className="space-y-6 text-sm leading-relaxed text-gray-700">

          <p>
            TillTalk uses the following third-party service providers (&ldquo;sub-processors&rdquo;) to deliver its service. Each sub-processor processes personal data only as necessary to perform the services described below and under a Data Processing Agreement (DPA) or equivalent contractual arrangement with TillTalk.
          </p>

          <p>
            Ad platforms listed below receive hashed conversion events only when a client has authorised TillTalk to run campaigns on that platform on their behalf. See &sect;5.2 and &sect;10 of the{' '}
            <a href="/privacy" className="text-green-600 hover:underline">Privacy Policy</a>{' '}
            for details on the hashing methodology and the legal basis.
          </p>

          <p>
            TillTalk will notify clients of any material additions to this list at least 30 days before the new sub-processor begins processing personal data, giving clients the opportunity to object. To receive notifications, ensure your account email is current.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-3 border border-gray-200 font-semibold text-gray-900 min-w-[140px]">Service</th>
                  <th className="text-left px-4 py-3 border border-gray-200 font-semibold text-gray-900 min-w-[160px]">Category</th>
                  <th className="text-left px-4 py-3 border border-gray-200 font-semibold text-gray-900 min-w-[220px]">Purpose</th>
                  <th className="text-left px-4 py-3 border border-gray-200 font-semibold text-gray-900 min-w-[220px]">Data processed</th>
                  <th className="text-left px-4 py-3 border border-gray-200 font-semibold text-gray-900 min-w-[120px]">Region</th>
                </tr>
              </thead>
              <tbody>
                {SUB_PROCESSORS.map((sp) => (
                  <tr key={sp.service} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 border border-gray-200 font-medium text-gray-900 align-top">{sp.service}</td>
                    <td className="px-4 py-3 border border-gray-200 text-gray-600 align-top">{sp.category}</td>
                    <td className="px-4 py-3 border border-gray-200 text-gray-600 align-top">{sp.purpose}</td>
                    <td className="px-4 py-3 border border-gray-200 text-gray-600 align-top">{sp.dataProcessed}</td>
                    <td className="px-4 py-3 border border-gray-200 text-gray-600 align-top">{sp.region}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">International transfers</h2>
            <p>
              Several sub-processors are based in the United States. Where personal data is transferred outside the European Economic Area, TillTalk relies on EU Standard Contractual Clauses and, where applicable, adequacy decisions such as the EU&ndash;US Data Privacy Framework.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Clover-specific processing</h2>
            <p>
              Merchants using TillTalk&apos;s Clover integration may review our{' '}
              <a href="/clover-addendum" className="text-green-600 hover:underline">Clover Privacy Addendum</a>{' '}
              for additional detail on how data received from Clover is handled.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Questions</h2>
            <p>
              To request copies of the DPAs in place with any sub-processor, or to raise an objection to the addition of a new sub-processor, contact{' '}
              <a href="mailto:daniel@tilltalk.ie" className="text-green-600 hover:underline">daniel@tilltalk.ie</a>.
            </p>
          </section>

          <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
            This list is maintained by Prime Construct Ltd (registered in Ireland, company number 751535).{' '}
            <a href="/privacy" className="hover:underline">Privacy Policy</a>{' '}
            &middot;{' '}
            <a href="/terms" className="hover:underline">Terms of Service</a>
          </p>

        </div>
      </div>
    </div>
  )
}
