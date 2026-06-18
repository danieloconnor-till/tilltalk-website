'use client'

/**
 * Send-message panel for the Meta App Review demo dashboard.
 *
 * Lets the reviewer type a reply and POST it to /review/meta-bk2xp9/send,
 * which performs a server-side Graph API call: User → Page token swap,
 * PSID lookup from /{page-id}/conversations, then POST /me/messages with
 * messaging_type=RESPONSE.
 *
 * Tokens never reach this component; the response payload is constructed
 * server-side and access tokens are redacted before return.
 */

import { useState } from 'react'

const SEND_ENDPOINT = '/review/meta-bk2xp9/send'
const PREVIEW_ENDPOINT = '/review/meta-bk2xp9/conversation-preview'
const MAX_MESSAGE_LEN = 280

type PreviewResponse =
  | {
      ok: true
      inbound: {
        sender_name: string | null
        sender_psid: string
        text: string | null
        created_time: string | null
      }
    }
  | {
      ok: false
      error: string
      message?: string
      status?: number
      body?: string
      detail?: string
    }

type SendResponse =
  | {
      ok: true
      status: number
      request: {
        endpoint: string
        page_id: string
        page_name: string | null
        recipient_psid: string
        messaging_type: string
        message: string
      }
      response: unknown
    }
  | {
      ok: false
      error: string
      message?: string
      status?: number
      max_length?: number
      body?: string
      detail?: string
      response?: unknown
      request?: unknown
    }

export default function SendMessagePanel() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendResponse | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const trimmedLen = message.trim().length
  const tooLong = trimmedLen > MAX_MESSAGE_LEN
  const canSend = !sending && trimmedLen > 0 && !tooLong

  async function handleLoadPreview() {
    if (loadingPreview) return
    setLoadingPreview(true)
    setPreview(null)
    try {
      const res = await fetch(PREVIEW_ENDPOINT)
      const data: PreviewResponse = await res.json().catch(() => ({
        ok: false,
        error: 'invalid_response',
      }))
      setPreview(data)
    } catch (err) {
      setPreview({
        ok: false,
        error: 'network_error',
        detail: err instanceof Error ? err.message : 'unknown',
      })
    } finally {
      setLoadingPreview(false)
    }
  }

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(SEND_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data: SendResponse = await res.json().catch(() => ({
        ok: false,
        error: 'invalid_response',
      }))
      setResult(data)
    } catch (err) {
      setResult({
        ok: false,
        error: 'network_error',
        detail: err instanceof Error ? err.message : 'unknown',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-gray-900">
          Send a reply via Messenger (pages_messaging / pages_manage_engagement)
        </h3>
        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
          This performs a server-side{' '}
          <span className="font-mono">POST /v25.0/me/messages</span> to the
          connected Page using the Page Access Token. Replies are sent with{' '}
          <span className="font-mono">messaging_type=RESPONSE</span>, valid
          inside the 24-hour standard messaging window — i.e. to whoever last
          messaged the Page. Message the Page from Messenger first, then type
          a reply here and click Send.
        </p>
        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
          Click &ldquo;Load latest message&rdquo; to see the customer message
          this reply will answer.
        </p>
      </div>

      <div className="mb-3">
        <button
          type="button"
          onClick={handleLoadPreview}
          disabled={loadingPreview}
          className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 disabled:opacity-60 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg border border-gray-300 transition-colors"
        >
          {loadingPreview ? 'Loading…' : 'Load latest message'}
        </button>
      </div>

      {preview ? (
        preview.ok ? (
          <div className="mb-3 rounded-lg border border-blue-300 bg-blue-50 p-4">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h4 className="text-sm font-semibold text-blue-900">
                📨 {preview.inbound.sender_name ?? 'Customer'} wrote:
              </h4>
              {preview.inbound.created_time ? (
                <span className="shrink-0 text-[10px] text-blue-700 font-mono">
                  {preview.inbound.created_time}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-blue-900 whitespace-pre-wrap break-words mb-2">
              {preview.inbound.text ?? '(no text in latest message)'}
            </p>
            <p className="text-[11px] text-blue-700 font-mono break-all">
              PSID this reply targets: {preview.inbound.sender_psid}
            </p>
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <p className="text-xs text-amber-900 font-mono mb-1 break-all">
              {preview.error}
              {preview.message ? ` — ${preview.message}` : ''}
            </p>
            {preview.error === 'no_recent_conversation' || preview.status === 409 ? (
              <p className="text-xs text-amber-900">
                Message the Page from Messenger first, then click &ldquo;Load
                latest message&rdquo; again.
              </p>
            ) : null}
          </div>
        )
      ) : null}

      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        Reply text
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={MAX_MESSAGE_LEN + 50}
        placeholder="e.g. Hi! Thanks for getting in touch — we open at 5pm."
        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent font-mono"
      />

      <div className="flex items-center justify-between gap-3 mt-2 mb-3">
        <span
          className={
            tooLong
              ? 'text-xs text-red-600 font-medium'
              : 'text-xs text-gray-500'
          }
        >
          {trimmedLen}/{MAX_MESSAGE_LEN}
        </span>
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {sending ? 'Sending…' : 'Send via Messenger'}
        </button>
      </div>

      {result ? (
        <div
          className={
            result.ok
              ? 'rounded-lg border border-green-300 bg-green-50 p-4'
              : 'rounded-lg border border-red-300 bg-red-50 p-4'
          }
        >
          {result.ok ? (
            <>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-sm font-semibold text-green-900">
                  Delivered — check Messenger
                </h4>
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-200 text-green-900 uppercase tracking-wide">
                  {result.status}
                </span>
              </div>
              <dl className="text-xs text-green-900 space-y-1 mb-3">
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">Endpoint:</dt>
                  <dd className="font-mono break-all">
                    {result.request.endpoint}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">Page:</dt>
                  <dd className="font-mono break-all">
                    {result.request.page_name ?? '—'} (
                    {result.request.page_id})
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">Recipient PSID:</dt>
                  <dd className="font-mono break-all">
                    {result.request.recipient_psid}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">Messaging type:</dt>
                  <dd className="font-mono">{result.request.messaging_type}</dd>
                </div>
              </dl>
              <p className="text-xs font-medium text-green-900 mb-1">
                Graph response
              </p>
              <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-y-auto max-h-48 font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-sm font-semibold text-red-900">
                  Send failed
                </h4>
                {result.status ? (
                  <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-200 text-red-900 uppercase tracking-wide">
                    {result.status}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-red-900 font-mono mb-2 break-all">
                {result.error}
                {result.message ? ` — ${result.message}` : ''}
              </p>
              {result.response ? (
                <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-y-auto max-h-48 font-mono whitespace-pre-wrap break-all">
                  {JSON.stringify(result.response, null, 2)}
                </pre>
              ) : result.body ? (
                <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-y-auto max-h-48 font-mono whitespace-pre-wrap break-all">
                  {result.body}
                </pre>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
