'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SESSION_KEY = 'tilltalk_support_chat'
const CHAT_SESSION_ID_KEY = 'tilltalk_chat_session_id'

function loadSession(): Message[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveSession(msgs: Message[]) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs.slice(-40)))
  } catch { /* ignore */ }
}

function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(CHAT_SESSION_ID_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(CHAT_SESSION_ID_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

export default function SupportChatWidget() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [sessionId, setSessionId]   = useState('')

  const endRef   = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Load session history, session ID, and detect auth state on mount
  useEffect(() => {
    setMessages(loadSession())
    setSessionId(getOrCreateSessionId())
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session)
    })
  }, [])

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open, loading])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

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

    // Build the message array for the API (last 20 to keep context window sane)
    const apiMessages = next.slice(-20).map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, isLoggedIn, sessionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong.')
      } else {
        const assistantMsg: Message = { role: 'assistant', content: data.response }
        const withReply = [...next, assistantMsg]
        setMessages(withReply)
        saveSession(withReply)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, isLoggedIn, sessionId])

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function onInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const greeting = isLoggedIn
    ? 'Hi! How can I help with your TillTalk account?'
    : "Hi! I'm the TillTalk assistant. Ask me anything about our service."

  const chips = isLoggedIn
    ? ['WhatsApp not responding', 'Where do I find my API key?', 'How do I add a number?']
    : ['How does TillTalk work?', 'What does it cost?', 'Which POS systems do you support?']

  return (
    <>
      {/* ── Trigger button ──────────────────────────────────────── */}
      <button
        onClick={() => setOpen(p => !p)}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
        className={`
          fixed bottom-5 right-5 z-50
          w-14 h-14 rounded-full shadow-xl flex items-center justify-center
          transition-all duration-200
          ${open ? 'bg-gray-700 hover:bg-gray-800' : 'bg-green-600 hover:bg-green-700'}
        `}
      >
        {open
          ? <ChevronDown size={24} className="text-white" />
          : <MessageCircle size={24} className="text-white" />}
      </button>

      {/* ── Panel ───────────────────────────────────────────────── */}
      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-40"
            onClick={() => setOpen(false)}
          />

          <div className={`
            fixed z-50 bg-white flex flex-col shadow-2xl
            inset-0
            md:inset-auto md:bottom-24 md:right-5 md:w-[400px] md:h-[560px]
            md:rounded-2xl md:border md:border-gray-200
          `}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-green-600 md:rounded-t-2xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <MessageCircle size={17} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">TillTalk</p>
                  <p className="text-xs text-green-100">
                    {isLoggedIn ? 'Support' : 'Sales assistant'} · Usually instant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/80 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && !loading && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle size={24} className="text-green-600" />
                  </div>
                  <p className="text-sm text-gray-700 mb-4">{greeting}</p>
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
                    className={`
                      max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
                      ${m.role === 'user'
                        ? 'bg-green-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-900 rounded-bl-sm'}
                    `}
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
                      <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }} />
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
            <div className="border-t border-gray-200 px-3 py-3 bg-white md:rounded-b-2xl shrink-0">
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
              <p className="text-[11px] text-gray-400 text-center mt-1">
                {isLoggedIn ? 'Need more help? Email daniel@tilltalk.ie' : 'Or email hello@tilltalk.ie'}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
