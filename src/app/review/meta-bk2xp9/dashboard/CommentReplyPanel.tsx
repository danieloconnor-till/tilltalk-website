'use client'

/**
 * Comment-reply panel for the Meta App Review demo dashboard.
 *
 * Companion to SendMessagePanel. The Messenger send demonstrates
 * pages_messaging (DM); this demonstrates pages_manage_engagement via its
 * native surface — a reply to a comment on a Page post. The reviewer types a
 * reply and the route resolves the target comment server-side by scanning
 * the Page's recent posts.
 *
 * Tokens never reach this component; access tokens are redacted in the
 * route's returned JSON via redactSensitive.
 */

import { useState } from 'react'

const REPLY_ENDPOINT = '/review/meta-bk2xp9/comment-reply'
const MAX_MESSAGE_LEN = 280

type ReplyResponse =
  | {
      ok: true
      status: number
      request: {
        endpoint: string
        page_id: string
        page_name: string | null
        target_comment_id: string
        post_id: string
        commenter_name: string | null
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

export default function CommentReplyPanel() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<ReplyResponse | null>(null)
  const trimmedLen = message.trim().length
  const tooLong = trimmedLen > MAX_MESSAGE_LEN
  const canSend = !sending && trimmedLen > 0 && !tooLong

  async function handleSend() {
    if (!canSend) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(REPLY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data: ReplyResponse = await res.json().catch(() => ({
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
          Reply to a comment on a Page post (pages_manage_engagement)
        </h3>
        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
          This performs a server-side{' '}
          <span className="font-mono">POST /v25.0/&#123;comment-id&#125;/comments</span>{' '}
          against the most recent comment from another user on the Page&apos;s
          own posts, using the Page Access Token. Comment on one of the
          Page&apos;s posts from a different Facebook account first, then type
          a reply here and click Reply.
        </p>
      </div>

      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        Reply text
      </label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        maxLength={MAX_MESSAGE_LEN + 50}
        placeholder="e.g. Thanks for the kind words! See you again soon."
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
          {sending ? 'Replying…' : 'Reply to comment'}
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
                  Posted — check the comment on Facebook
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
                  <dt className="font-medium w-32 shrink-0">Post:</dt>
                  <dd className="font-mono break-all">
                    {result.request.post_id}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">Target comment:</dt>
                  <dd className="font-mono break-all">
                    {result.request.target_comment_id}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">Commenter:</dt>
                  <dd className="font-mono break-all">
                    {result.request.commenter_name ?? '—'}
                  </dd>
                </div>
              </dl>
              <p className="text-xs font-medium text-green-900 mb-1">
                Graph response (new reply comment id)
              </p>
              <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-y-auto max-h-48 font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-sm font-semibold text-red-900">
                  Reply failed
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
