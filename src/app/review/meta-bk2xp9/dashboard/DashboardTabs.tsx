'use client'

import { useState, type ReactNode } from 'react'
import clsx from 'clsx'

type Tab = {
  label: string
  count: number
  note: string
  content: ReactNode
}

export default function DashboardTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(0)
  const currentTab = tabs[active]
  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-4">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px border-b-2',
              i === active
                ? 'border-green-600 text-gray-900 bg-white'
                : 'border-transparent text-gray-600 hover:text-gray-900',
            )}
          >
            {tab.label}{' '}
            <span className="text-xs text-gray-500">({tab.count})</span>
          </button>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-800">{currentTab.note}</p>
      </div>
      {currentTab.content}
    </div>
  )
}
