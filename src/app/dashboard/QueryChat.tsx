'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, RefreshCw, BarChart2, Clock, Sparkles } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  role: 'user' | 'assistant'
  text: string
  chart_data?: string | null
}

interface ChartSnapshot {
  id: number
  title: string
  data: string
}

// ---------------------------------------------------------------------------
// Suggested prompts
// ---------------------------------------------------------------------------

const PROMPTS = [
  'Sales this week',
  'Top products this month',
  'Compare this month vs last month',
  'Revenue by day of week',
  'Hourly sales pattern',
  'Best weeks this year',
  'Refund rate trend',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QueryChat() {
  const [messages,      setMessages]      = useState<Message[]>([])
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [currentChart,  setCurrentChart]  = useState<string | null>(null)
  const [currentTitle,  setCurrentTitle]  = useState('')
  const [chartHistory,  setChartHistory]  = useState<ChartSnapshot[]>([])

  const endRef   = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async (text: string) => {
    const msg = text.trim()
    if (!msg || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    setLoading(true)

    try {
      const res  = await fetch('/api/dashboard/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json().catch(() => ({}))

      const assistantMsg: Message = {
        role:       'assistant',
        text:       data.text || data.error || 'No response received.',
        chart_data: data.chart_data || null,
      }
      setMessages(prev => [...prev, assistantMsg])

      if (data.chart_data) {
        setCurrentChart(data.chart_data)
        setCurrentTitle(msg)
        setChartHistory(prev => [
          { id: Date.now(), title: msg, data: data.chart_data },
          ...prev.slice(0, 9),
        ])
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'Something went wrong — please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }, [loading])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  // Auto-resize textarea
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`
  }

  return (
    <div className="space-y-4">

      {/* ── Chart display area ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {currentChart ? (
          <>
            <div className="px-5 pt-4 pb-2 flex items-center gap-2">
              <BarChart2 size={15} className="text-green-600 shrink-0" />
              <p className="text-sm font-semibold text-gray-700 truncate">{currentTitle}</p>
            </div>
            <img
              src={`data:image/png;base64,${currentChart}`}
              alt={currentTitle}
              className="w-full block"
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-3">
              <BarChart2 className="text-green-400" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Chart will appear here</p>
            <p className="text-xs text-gray-400 max-w-xs">
              Ask for a revenue report or sales chart below — it&apos;ll render inline without an email.
            </p>
          </div>
        )}
      </div>

      {/* ── Recent charts row ──────────────────────────────────────────── */}
      {chartHistory.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock size={11} />
            Recent Charts
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {chartHistory.map(c => (
              <button
                key={c.id}
                onClick={() => { setCurrentChart(c.data); setCurrentTitle(c.title) }}
                className={`shrink-0 w-32 rounded-xl overflow-hidden border-2 transition-colors text-left ${
                  currentChart === c.data
                    ? 'border-green-500 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <img
                  src={`data:image/png;base64,${c.data}`}
                  alt={c.title}
                  className="w-full h-16 object-cover object-top"
                />
                <p className="text-xs text-gray-600 px-2 py-1.5 truncate leading-tight">
                  {c.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Chat panel ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 flex flex-col">

        {/* Messages */}
        <div
          className="overflow-y-auto p-4 space-y-3"
          style={{ minHeight: 200, maxHeight: 340 }}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-6 text-center">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-3">
                <Sparkles className="text-green-400" size={18} />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Ask about your business</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Try &ldquo;Sales this week&rdquo; or &ldquo;Top products this month&rdquo; — charts render right above.
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-green-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))
          )}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <RefreshCw size={14} className="animate-spin text-gray-400" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Suggested prompts */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto border-t border-gray-50 pt-2.5">
          {PROMPTS.map(p => (
            <button
              key={p}
              onClick={() => send(p)}
              disabled={loading}
              className="shrink-0 text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input row */}
        <div className="border-t border-gray-100 p-3 flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder="Ask about your sales data…"
            rows={1}
            className="flex-1 resize-none text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent leading-snug overflow-hidden"
            style={{ minHeight: 40 }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white transition-colors shrink-0"
          >
            {loading
              ? <RefreshCw size={15} className="animate-spin" />
              : <Send size={15} />}
          </button>
        </div>
      </div>
    </div>
  )
}
