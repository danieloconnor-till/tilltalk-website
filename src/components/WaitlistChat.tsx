'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SESSION_KEY = 'tilltalk_support_chat'

function loadSession(): Message[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveSession(msgs: Message[]) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs.slice(-40))) } catch { /* ignore */ }
}

export default function WaitlistChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const inputRef           = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { setMessages(loadSession()) }, [])

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, loading])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    saveSession(next)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.slice(-20).map(m => ({ role: m.role, content: m.content })),
          isLoggedIn: false,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
      } else {
        const reply: Message = { role: 'assistant', content: data.response }
        const withReply = [...next, reply]
        setMessages(withReply)
        saveSession(withReply)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const chips = [
    'What can TillTalk do?',
    'How much does it cost?',
    'Which POS systems work?',
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg flex flex-col overflow-hidden" style={{ height: '480px' }}>
      {/* Header */}
      <div className="bg-green-600 px-4 py-3.5 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <MessageCircle size={17} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">TillTalk</p>
          <p className="text-xs text-green-100">Sales assistant · Usually instant</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-700 mb-4">
              Hi! Ask me anything about TillTalk — pricing, how it works, or join the waitlist.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {chips.map(q => (
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
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-green-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-900 rounded-bl-sm'
              }`}
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {m.content}
            </div>
          </div>
        ))}

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

      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-3 py-3 bg-white shrink-0">
        <div className="flex items-end gap-2 bg-gray-100 rounded-2xl px-3 py-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={onInput}
            onKeyDown={onKeyDown}
            placeholder="Ask a question…"
            disabled={loading}
            className="flex-1 bg-transparent resize-none text-sm text-gray-900 placeholder-gray-400 focus:outline-none py-1 max-h-[120px] disabled:opacity-60"
            style={{ height: 'auto', minHeight: '24px' }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="shrink-0 w-8 h-8 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center transition-colors mb-0.5"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
        <p className="text-[11px] text-gray-400 text-center mt-1">Enter to send · Or text us at wa.me/353894633835</p>
      </div>
    </div>
  )
}
