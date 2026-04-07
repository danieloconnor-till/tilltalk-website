'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export default function ChatWidget() {
  const [open, setOpen]           = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)
  const [error, setError]         = useState<string | null>(null)

  const endRef      = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const panelRef    = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new message
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, loading])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
      } else {
        setSessionId(data.session_id)
        setMessages(prev => [...prev, { role: 'assistant', text: data.response }])
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Auto-resize textarea
  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────── */}
      <button
        onClick={() => setOpen(p => !p)}
        aria-label={open ? 'Close chat' : 'Open TillTalk AI chat'}
        className={`
          fixed bottom-[88px] right-4 md:bottom-8 md:right-8 z-50
          w-14 h-14 rounded-full shadow-lg flex items-center justify-center
          transition-all duration-200
          ${open
            ? 'bg-gray-700 hover:bg-gray-800'
            : 'bg-green-600 hover:bg-green-700'}
        `}
      >
        {open
          ? <ChevronDown size={24} className="text-white" />
          : <MessageCircle size={24} className="text-white" />
        }
      </button>

      {/* ── Chat panel ──────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
          />

          <div
            ref={panelRef}
            className={`
              fixed z-50 bg-white flex flex-col shadow-2xl
              /* mobile: full screen */
              inset-0
              /* desktop: right side panel */
              md:inset-auto md:right-0 md:top-0 md:h-screen md:w-[380px] md:border-l md:border-gray-200
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200 bg-green-600 md:rounded-none">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">TillTalk AI</p>
                  <p className="text-xs text-green-100">Ask about your sales, schedule, and more</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
                aria-label="Close chat"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && !loading && (
                <div className="text-center py-10">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle size={28} className="text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-800 mb-1">Hi! How can I help?</p>
                  <p className="text-xs text-gray-500 max-w-[220px] mx-auto">
                    Ask me about your sales, top items, or anything about your business.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    {[
                      "How did I do today?",
                      "What's selling best this week?",
                      "Show me this month's revenue",
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); inputRef.current?.focus() }}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                      ${m.role === 'user'
                        ? 'bg-green-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                      }
                    `}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {m.text}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="flex justify-start">
                  <div className="bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 text-sm text-red-700 max-w-[82%]">
                    {error}
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 px-3 py-3 bg-white">
              <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={onInput}
                  onKeyDown={onKeyDown}
                  placeholder="Message TillTalk…"
                  disabled={loading}
                  className="flex-1 bg-transparent resize-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none py-1 max-h-[120px] disabled:opacity-60"
                  style={{ height: 'auto', minHeight: '24px' }}
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  aria-label="Send message"
                  className="shrink-0 w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center transition-colors mb-0.5"
                >
                  <Send size={14} className="text-white" />
                </button>
              </div>
              <p className="text-[11px] text-gray-400 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
