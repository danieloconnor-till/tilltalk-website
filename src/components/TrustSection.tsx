import { Lock, Ban, Globe, KeyRound, CheckCircle2, XCircle } from 'lucide-react'

export default function TrustSection() {
  return (
    <section className="py-20 bg-gray-50 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Your data is safe with us
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Built with GDPR compliance and data minimisation from day one.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* What we protect */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">What we protect</h3>
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <Lock className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Read-only POS access</p>
                  <p className="text-xs text-gray-600 mt-1">
                    TillTalk cannot make changes to your POS or affect your payments.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <Ban className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">No transaction data stored</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Only anonymous aggregated totals are processed — never individual transactions.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <Globe className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">GDPR compliant</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Hosted in Ireland, EU data residency. Fully GDPR compliant.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                  <KeyRound className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Encrypted credentials</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Your POS API keys are AES-256 encrypted at rest — never stored in plain text.
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Data transparency */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Data transparency</h3>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Data you share with us:</p>
              <ul className="space-y-2">
                {[
                  'Business name',
                  'Email address',
                  'Phone number',
                  'POS API credentials (AES-256 encrypted)',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-500 shrink-0" size={16} />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Data we never see:</p>
              <ul className="space-y-2">
                {[
                  'Customer names or contact details',
                  'Card numbers or payment data',
                  'Payment processor information',
                  'Individual transaction details',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <XCircle className="text-red-400 shrink-0" size={16} />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-800 font-medium">
                Cancel anytime — no lock-in contracts. Your data is deleted on request.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
