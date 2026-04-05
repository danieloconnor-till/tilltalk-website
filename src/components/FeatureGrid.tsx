import {
  DollarSign,
  Mail,
  BarChart2,
  Users,
  Mic,
  Brain,
  Building2,
  UsersRound,
} from 'lucide-react'

const features = [
  {
    icon: DollarSign,
    title: 'Revenue queries in plain English',
    description: 'Ask anything about your sales in everyday language — no SQL, no dashboards.',
  },
  {
    icon: Mail,
    title: 'Daily & weekly email reports with charts',
    description: 'Receive beautifully formatted reports straight to your inbox every morning.',
  },
  {
    icon: BarChart2,
    title: 'Item and category sales analysis',
    description: 'Find out exactly what\'s selling, what\'s not, and when your busiest times are.',
  },
  {
    icon: Users,
    title: 'Staff performance tracking',
    description: 'Monitor sales by staff member to motivate your team and reward top performers.',
  },
  {
    icon: Mic,
    title: 'Voice note support',
    description: 'Send a voice note to TillTalk and get a reply — great for on-the-go queries.',
  },
  {
    icon: Brain,
    title: 'Conversation memory',
    description: 'TillTalk remembers context from earlier in your conversation for follow-up questions.',
  },
  {
    icon: Building2,
    title: 'Multi-location support',
    description: 'Manage multiple venues from a single WhatsApp thread — compare locations instantly.',
  },
  {
    icon: UsersRound,
    title: 'Multi-user access',
    description: 'Add your manager or accountant so they can query your data independently.',
  },
]

export default function FeatureGrid() {
  return (
    <section id="features" className="py-20 bg-white px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Everything you need to understand your sales
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Powerful analytics delivered through the app you already use every day.
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
