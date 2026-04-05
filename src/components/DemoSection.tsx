import { Play } from 'lucide-react'

const videos = [
  { title: 'How to find your Clover credentials', pos: 'Clover' },
  { title: 'How to find your Square credentials', pos: 'Square' },
  { title: 'How to find your Epos Now credentials', pos: 'Epos Now' },
]

export default function DemoSection() {
  return (
    <section className="py-20 bg-white px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            See TillTalk in action
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Get set up in minutes with our step-by-step guides.
          </p>
        </div>

        {/* Video cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {videos.map(({ title, pos }) => (
            <div
              key={pos}
              className="group bg-gray-100 rounded-2xl overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors"
            >
              <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 relative">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="text-white ml-1" size={28} fill="white" />
                </div>
                <div className="absolute top-3 right-3 bg-white text-green-700 text-xs font-bold px-2 py-1 rounded-full">
                  {pos}
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-1">Watch tutorial →</p>
              </div>
            </div>
          ))}
        </div>

        {/* WhatsApp mockup */}
        <div className="flex justify-center">
          <div className="w-full max-w-sm">
            <p className="text-center text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">
              Sample conversation
            </p>
            {/* Phone frame */}
            <div className="bg-gray-900 rounded-3xl p-3 shadow-2xl">
              {/* Screen */}
              <div className="bg-white rounded-2xl overflow-hidden">
                {/* WhatsApp header */}
                <div className="bg-green-700 px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">TT</span>
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">TillTalk</p>
                    <p className="text-green-200 text-xs">Online</p>
                  </div>
                </div>

                {/* Chat area */}
                <div className="bg-[#e5ddd5] p-3 space-y-3 min-h-64">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[80%] shadow-sm">
                      <p className="text-xs text-gray-800">What were my top selling items this week?</p>
                      <p className="text-[10px] text-gray-400 text-right mt-1">14:32 ✓✓</p>
                    </div>
                  </div>

                  {/* TillTalk reply */}
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
                      <p className="text-xs font-semibold text-green-700 mb-1">TillTalk</p>
                      <p className="text-xs text-gray-800 leading-relaxed">
                        Your top 5 items this week:<br />
                        1. Espresso €342 (98 sold)<br />
                        2. Chicken Caesar €287 (41 sold)<br />
                        3. House Burger €264 (33 sold)<br />
                        4. Prosecco €198 (66 sold)<br />
                        5. Cheesecake €156 (31 sold)<br />
                        <br />
                        Full breakdown attached.
                      </p>
                      <p className="text-[10px] text-gray-400 text-right mt-1">14:32</p>
                    </div>
                  </div>

                  {/* User message 2 */}
                  <div className="flex justify-end">
                    <div className="bg-[#dcf8c6] rounded-lg rounded-tr-none px-3 py-2 max-w-[80%] shadow-sm">
                      <p className="text-xs text-gray-800">Send me the monthly revenue report</p>
                      <p className="text-[10px] text-gray-400 text-right mt-1">14:35 ✓✓</p>
                    </div>
                  </div>

                  {/* TillTalk reply 2 */}
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 max-w-[85%] shadow-sm">
                      <p className="text-xs font-semibold text-green-700 mb-1">TillTalk</p>
                      <p className="text-xs text-gray-800 leading-relaxed">
                        March 2025 revenue report sent to your email.<br />
                        <br />
                        Net sales €23,847 across 1,241 transactions. Busiest day: Saturday 15 March €1,340.
                      </p>
                      <p className="text-[10px] text-gray-400 text-right mt-1">14:35</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
