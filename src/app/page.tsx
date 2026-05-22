import Link from 'next/link'
import { Megaphone, Database, BadgeCheck, MessageCircle } from 'lucide-react'

const WHATSAPP_URL = 'https://wa.me/353894633835'

const features = [
  {
    icon: Megaphone,
    title: 'Run your ads',
    description:
      'Meta, Google, and TikTok campaigns set up and optimised end-to-end. You approve major decisions over WhatsApp.',
  },
  {
    icon: Database,
    title: 'Read your till',
    description:
      'We connect to Clover or Square (read-only) to see which campaigns actually drove orders, not just clicks.',
  },
  {
    icon: BadgeCheck,
    title: 'Verify what worked',
    description:
      'Capacity-aware pacing and anomaly detection mean you only pay on revenue we genuinely caused.',
  },
  {
    icon: MessageCircle,
    title: 'One WhatsApp away',
    description:
      'Weekly reports, approvals, and questions — all in WhatsApp. No new app to learn.',
  },
]

export default function Home() {
  return (
    <>
      {/* 1. Hero */}
      <section className="bg-white py-20 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            AI-managed marketing for hospitality &amp; retail
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight">
            AI that runs your social media{' '}
            <span className="text-green-600">using data you already have</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
            TillTalk runs your Meta, Google, and TikTok campaigns, reads your till to verify what actually drove revenue, and only charges a percentage of the new revenue we bring in.
          </p>

          <div className="mt-10 flex justify-center">
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors shadow-md"
            >
              Get Early Access
            </a>
          </div>
        </div>
      </section>

      {/* 2. What we do */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              What we do
            </h2>
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

      {/* 3. How we charge */}
      <section className="py-20 bg-gray-50 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            How we charge
          </h2>
          <p className="mt-6 text-lg text-gray-700 leading-relaxed">
            Performance-based pricing: a percentage of the new revenue we bring in. Three months free while we prove it. No lock-in.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Full pricing details shared during onboarding.
          </p>
        </div>
      </section>

      {/* 4. Trust */}
      <section className="py-16 bg-white px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-base text-gray-700">
            Hosted in Ireland. GDPR-compliant. Read-only access to your POS.{' '}
            <Link href="/privacy" className="text-green-600 hover:underline font-medium">
              Read our privacy policy
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  )
}
