import { Globe, ShieldCheck, MessageCircle, Layers } from 'lucide-react'

const features = [
  {
    icon: Globe,
    title: 'Ad campaigns fully managed',
    description:
      'TillTalk plans, launches, and optimises your Meta, Google, and TikTok campaigns — every spend decision sent to you for approval first.',
  },
  {
    icon: ShieldCheck,
    title: 'POS-verified revenue attribution',
    description:
      'We read your till data directly to confirm what actually drove sales — not platform-reported clicks, real verified revenue.',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp inbox',
    description:
      'Approve campaigns, receive daily briefings, and ask questions — all through the WhatsApp thread you already use.',
  },
  {
    icon: Layers,
    title: 'Multi-channel by default',
    description:
      'Meta, Google, and TikTok are all pre-wired. Your agent allocates budget across channels based on what your till data shows is working.',
  },
]

export default function FeatureGrid() {
  return (
    <section id="features" className="py-20 bg-white px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            An AI agent that runs your marketing
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Built for hospitality and retail — every decision grounded in your actual sales data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-gray-50 rounded-xl p-6 hover:bg-green-50 transition-colors">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 rounded-lg mb-4">
                <Icon className="text-green-600" size={20} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">{title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
