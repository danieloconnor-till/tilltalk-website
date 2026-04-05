import { CheckCircle2, Clock } from 'lucide-react'

const systems = [
  { name: 'Clover', status: 'live' },
  { name: 'Square', status: 'live' },
  { name: 'Epos Now', status: 'live' },
  { name: 'Lightspeed', status: 'coming-soon' },
  { name: 'Toast', status: 'coming-soon' },
]

export default function SupportedPOS() {
  return (
    <section className="py-16 bg-white px-4 border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Works with your POS system
          </h2>
          <p className="mt-3 text-gray-600">
            Connect the system you already use — no switching required.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          {systems.map(({ name, status }) => (
            <div
              key={name}
              className={`flex items-center gap-3 px-6 py-4 rounded-xl border text-sm font-medium ${
                status === 'live'
                  ? 'bg-green-50 border-green-200 text-green-900'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              {status === 'live' ? (
                <CheckCircle2 className="text-green-500" size={18} />
              ) : (
                <Clock className="text-gray-400" size={18} />
              )}
              <span>{name}</span>
              {status === 'coming-soon' && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                  Coming soon
                </span>
              )}
              {status === 'live' && (
                <span className="text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full">
                  Live
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
