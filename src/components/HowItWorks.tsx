import { Plug, MessageCircle, BarChart2 } from 'lucide-react'

const steps = [
  {
    icon: Plug,
    title: 'Connect your POS in minutes',
    description:
      'Link your Clover, Square, or Epos Now account using your API credentials. Setup takes less than 5 minutes.',
    step: '01',
  },
  {
    icon: MessageCircle,
    title: 'Message TillTalk on WhatsApp',
    description:
      "Ask questions in plain English like \"What sold best this week?\" or \"Show me last month's revenue.\"",
    step: '02',
  },
  {
    icon: BarChart2,
    title: 'Get instant answers and email reports',
    description:
      "Receive detailed breakdowns instantly on WhatsApp, plus daily and weekly email reports with charts.",
    step: '03',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-gray-50 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            How it works
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Up and running in minutes — no developer needed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ icon: Icon, title, description, step }) => (
            <div key={step} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-50 rounded-xl mb-5">
                <Icon className="text-green-600" size={28} />
              </div>
              <div className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">
                Step {step}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
