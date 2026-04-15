'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Wifi, WifiOff, ChevronDown, ChevronUp, Loader2, RotateCcw, CheckCircle, XCircle } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type PosType = 'square' | 'clover' | 'eposnow'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

interface ToolCall {
  tool: string
  input: Record<string, unknown>
  result: unknown
}

interface SandboxConfig {
  api_token: string
  merchant_id: string
  api_base: string
}

// ── POS tab config ────────────────────────────────────────────────────────────

const POS_TABS: { id: PosType; label: string; merchantLabel: string; merchantPlaceholder: string; tokenLabel: string; tokenPlaceholder: string; supportsBaseUrl: boolean }[] = [
  {
    id: 'square',
    label: 'Square',
    merchantLabel: 'Location ID',
    merchantPlaceholder: 'L0XXXXXXXXXX (optional — uses default location)',
    tokenLabel: 'Access Token',
    tokenPlaceholder: 'EAAAl...',
    supportsBaseUrl: true,
  },
  {
    id: 'clover',
    label: 'Clover',
    merchantLabel: 'Merchant ID',
    merchantPlaceholder: 'XXXXXXXXXXXXXXX',
    tokenLabel: 'API Key',
    tokenPlaceholder: 'Your Clover API key',
    supportsBaseUrl: true,
  },
  {
    id: 'eposnow',
    label: 'Epos Now',
    merchantLabel: 'Business ID',
    merchantPlaceholder: 'Not yet integrated',
    tokenLabel: 'API Token',
    tokenPlaceholder: 'Not yet integrated',
    supportsBaseUrl: false,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function SandboxSection() {
  const [selectedPos, setSelectedPos] = useState<PosType>('square')
  const [configs, setConfigs] = useState<Record<PosType, SandboxConfig>>({
    square: { api_token: '', merchant_id: '', api_base: '' },
    clover: { api_token: '', merchant_id: '', api_base: '' },
    eposnow: { api_token: '', merchant_id: '', api_base: '' },
  })
  const [connectionStatus, setConnectionStatus] = useState<Record<PosType, 'unknown' | 'ok' | 'error'>>({
    square: 'unknown', clover: 'unknown', eposnow: 'unknown',
  })
  const [connectionMsg, setConnectionMsg] = useState<Record<PosType, string>>({
    square: '', clover: '', eposnow: '',
  })
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [rawData, setRawData] = useState<ToolCall[] | null>(null)
  const [rawExpanded, setRawExpanded] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const pos = POS_TABS.find(p => p.id === selectedPos)!
  const cfg = configs[selectedPos]

  // Load saved config from Supabase when switching POS tab
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`/api/sandbox/config?pos_type=${selectedPos}`)
        const data = await res.json()
        if (data.config) {
          setConfigs(prev => ({
            ...prev,
            [selectedPos]: {
              api_token: data.config.api_token || '',
              merchant_id: data.config.merchant_id || '',
              api_base: data.config.api_base || '',
            },
          }))
        }
      } catch {
        // Non-fatal — just use empty defaults
      }
    }
    loadConfig()
  }, [selectedPos])

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  function updateConfig(field: keyof SandboxConfig, value: string) {
    setConfigs(prev => ({ ...prev, [selectedPos]: { ...prev[selectedPos], [field]: value } }))
    // Reset connection status when credentials change
    setConnectionStatus(prev => ({ ...prev, [selectedPos]: 'unknown' }))
  }

  async function saveConfig() {
    setIsSaving(true)
    try {
      await fetch('/api/sandbox/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_type: selectedPos, ...cfg }),
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function testConnection() {
    if (selectedPos === 'eposnow') return
    setIsTesting(true)
    setConnectionStatus(prev => ({ ...prev, [selectedPos]: 'unknown' }))
    setConnectionMsg(prev => ({ ...prev, [selectedPos]: '' }))
    try {
      const res = await fetch('/api/sandbox/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pos_type: selectedPos, api_token: cfg.api_token, merchant_id: cfg.merchant_id || undefined, api_base: cfg.api_base || undefined }),
      })
      const data = await res.json()
      setConnectionStatus(prev => ({ ...prev, [selectedPos]: data.ok ? 'ok' : 'error' }))
      setConnectionMsg(prev => ({ ...prev, [selectedPos]: data.message || '' }))
    } catch {
      setConnectionStatus(prev => ({ ...prev, [selectedPos]: 'error' }))
      setConnectionMsg(prev => ({ ...prev, [selectedPos]: 'Network error' }))
    } finally {
      setIsTesting(false)
    }
  }

  async function sendMessage() {
    if (!input.trim() || isSending) return
    if (selectedPos === 'eposnow') return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setIsSending(true)
    setRawData(null)

    // Build history for context (last 6 messages = 3 exchanges)
    const history = messages.slice(-6).map(m => ({ role: m.role, text: m.text }))

    try {
      const res = await fetch('/api/sandbox/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pos_type: selectedPos,
          api_token: cfg.api_token,
          merchant_id: cfg.merchant_id || undefined,
          api_base: cfg.api_base || undefined,
          message: userMsg,
          history,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${data.error}` }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.response }])
        if (data.raw_data?.length) {
          setRawData(data.raw_data)
          setRawExpanded(true)
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Network error — could not reach Railway.' }])
    } finally {
      setIsSending(false)
    }
  }

  function clearChat() {
    setMessages([])
    setRawData(null)
  }

  const statusIcon = connectionStatus[selectedPos]
  const statusMsg = connectionMsg[selectedPos]

  return (
    <section id="sandbox" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Sandbox</h2>
        <p className="text-sm text-gray-500 mt-1">Test TillTalk against any POS system without affecting real client accounts.</p>
      </div>

      {/* POS tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {POS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedPos(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              selectedPos === tab.id
                ? 'bg-white border border-gray-200 border-b-white text-green-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config panel */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Configuration — {pos.label}</h3>

          {selectedPos === 'eposnow' ? (
            <p className="text-sm text-gray-400 italic">Epos Now integration is not yet available.</p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{pos.tokenLabel}</label>
                <input
                  type="password"
                  value={cfg.api_token}
                  onChange={e => updateConfig('api_token', e.target.value)}
                  placeholder={pos.tokenPlaceholder}
                  autoComplete="off"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{pos.merchantLabel}</label>
                <input
                  type="text"
                  value={cfg.merchant_id}
                  onChange={e => updateConfig('merchant_id', e.target.value)}
                  placeholder={pos.merchantPlaceholder}
                  autoComplete="off"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                />
              </div>

              {pos.supportsBaseUrl && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">API Base URL <span className="text-gray-400 font-normal">(optional — for sandbox/EU endpoints)</span></label>
                  <input
                    type="text"
                    value={cfg.api_base}
                    onChange={e => updateConfig('api_base', e.target.value)}
                    placeholder={selectedPos === 'clover' ? 'https://apisandbox.dev.clover.com' : 'https://connect.squareupsandbox.com/v2'}
                    autoComplete="off"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                  />
                </div>
              )}

              {/* Connection status */}
              {statusIcon !== 'unknown' && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${statusIcon === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {statusIcon === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  <span>{statusMsg || (statusIcon === 'ok' ? 'Connected' : 'Connection failed')}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={testConnection}
                  disabled={isTesting || !cfg.api_token}
                  className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  {isTesting ? <Loader2 size={14} className="animate-spin" /> : (statusIcon === 'ok' ? <Wifi size={14} /> : <WifiOff size={14} />)}
                  {isTesting ? 'Testing…' : 'Test Connection'}
                </button>
                <button
                  onClick={saveConfig}
                  disabled={isSaving}
                  className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                  {isSaving ? 'Saving…' : 'Save Config'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Chat simulator */}
        <div className="bg-white rounded-2xl border border-gray-200 flex flex-col" style={{ minHeight: '420px' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-700 text-xs font-bold">T</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">TillTalk</p>
                <p className="text-xs text-gray-400">Sandbox · {pos.label}</p>
              </div>
            </div>
            <button onClick={clearChat} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <RotateCcw size={12} /> Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400 text-center pt-8">Configure credentials above, then ask a question.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] text-sm px-3 py-2 rounded-2xl whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-green-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={selectedPos === 'eposnow' ? 'Epos Now not yet available' : 'What sold best this week?'}
              disabled={isSending || selectedPos === 'eposnow' || !cfg.api_token}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isSending || selectedPos === 'eposnow' || !cfg.api_token}
              className="w-9 h-9 bg-green-600 hover:bg-green-700 disabled:bg-gray-200 text-white rounded-xl flex items-center justify-center transition-colors"
            >
              {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* Raw data panel */}
      {rawData && rawData.length > 0 && (
        <div className="bg-gray-900 rounded-2xl overflow-hidden">
          <button
            onClick={() => setRawExpanded(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-mono text-gray-300">Raw POS data — {rawData.length} tool call{rawData.length !== 1 ? 's' : ''}</span>
            {rawExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
          </button>
          {rawExpanded && (
            <div className="px-4 pb-4 space-y-4 max-h-96 overflow-y-auto">
              {rawData.map((call, i) => (
                <div key={i}>
                  <p className="text-xs font-mono text-green-400 mb-1">{call.tool}</p>
                  {Object.keys(call.input).length > 0 && (
                    <pre className="text-xs font-mono text-gray-400 mb-1 overflow-x-auto">{JSON.stringify(call.input, null, 2)}</pre>
                  )}
                  <pre className="text-xs font-mono text-gray-200 overflow-x-auto">{JSON.stringify(call.result, null, 2)}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
