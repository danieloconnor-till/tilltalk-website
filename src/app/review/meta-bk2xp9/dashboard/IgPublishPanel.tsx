'use client'

/**
 * Instagram publish panel for the Meta App Review demo dashboard.
 *
 * Companion to SendMessagePanel. Where the send panel demonstrates
 * pages_messaging, this demonstrates instagram_content_publish by actually
 * publishing a single-image post to the connected Instagram Business account
 * via /review/meta-bk2xp9/ig-publish, which performs the server-side two-step
 * Graph flow: POST /{ig-user-id}/media (create container) then
 * POST /{ig-user-id}/media_publish (publish) using the Page Access Token.
 *
 * Tokens never reach this component; the response payload is constructed
 * server-side and access tokens are redacted before return.
 */

import { useState } from 'react'

const PUBLISH_ENDPOINT = '/review/meta-bk2xp9/ig-publish'
const MAX_CAPTION_LEN = 2200

type PublishResponse =
  | {
      ok: true
      status: number
      request: {
        container_endpoint: string
        publish_endpoint: string
        ig_user_id: string
        page_id: string
        page_name: string | null
        creation_id: string
        image_url: string
        caption: string
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

function isLikelyValidImageUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'https:') return false
    return /\.(jpe?g|png)$/i.test(url.pathname)
  } catch {
    return false
  }
}

export default function IgPublishPanel() {
  const [imageUrl, setImageUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<PublishResponse | null>(null)
  const captionLen = caption.trim().length
  const tooLong = captionLen > MAX_CAPTION_LEN
  const imageUrlValid = isLikelyValidImageUrl(imageUrl)
  const canSend = !sending && imageUrlValid && !tooLong

  async function handlePublish() {
    if (!canSend) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch(PUBLISH_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl, caption }),
      })
      const data: PublishResponse = await res.json().catch(() => ({
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
          Publish a post to Instagram (instagram_content_publish)
        </h3>
        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
          This performs a live two-step Graph publish —{' '}
          <span className="font-mono">POST /v25.0/&#123;ig-user-id&#125;/media</span>{' '}
          then{' '}
          <span className="font-mono">
            POST /v25.0/&#123;ig-user-id&#125;/media_publish
          </span>{' '}
          — to the connected Instagram Business account using the Page Access
          Token. Paste a public image URL and an optional caption, then click
          Publish. The post will appear live on the Instagram profile.
        </p>
      </div>

      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        Image URL
      </label>
      <input
        type="text"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="https://…/photo.jpg"
        className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent font-mono"
      />

      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        Caption
      </label>
      <textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        rows={3}
        maxLength={MAX_CAPTION_LEN + 50}
        placeholder="e.g. Fresh out of the oven at Bella Napoli 🍕"
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
          {captionLen}/{MAX_CAPTION_LEN}
        </span>
        <button
          type="button"
          onClick={handlePublish}
          disabled={!canSend}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {sending ? 'Publishing…' : 'Publish to Instagram'}
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
                  Published — check the Instagram profile
                </h4>
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-200 text-green-900 uppercase tracking-wide">
                  {result.status}
                </span>
              </div>
              <dl className="text-xs text-green-900 space-y-1 mb-3">
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">Container:</dt>
                  <dd className="font-mono break-all">
                    {result.request.container_endpoint}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">Publish:</dt>
                  <dd className="font-mono break-all">
                    {result.request.publish_endpoint}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">IG user id:</dt>
                  <dd className="font-mono break-all">
                    {result.request.ig_user_id}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">Creation id:</dt>
                  <dd className="font-mono break-all">
                    {result.request.creation_id}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium w-32 shrink-0">Published id:</dt>
                  <dd className="font-mono break-all">
                    {(result.response as { id?: string })?.id ?? '—'}
                  </dd>
                </div>
              </dl>
              <p className="text-xs font-medium text-green-900 mb-1">
                Graph response (published media id)
              </p>
              <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-y-auto max-h-48 font-mono whitespace-pre-wrap break-all">
                {JSON.stringify(result.response, null, 2)}
              </pre>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="text-sm font-semibold text-red-900">
                  Publish failed
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
