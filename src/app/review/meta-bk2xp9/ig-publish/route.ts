/**
 * Server-side Instagram publish action for the Meta App Review demo dashboard.
 *
 * Companion to /review/meta-bk2xp9/send. The Messenger send route demonstrates
 * pages_messaging; this route demonstrates instagram_content_publish via its
 * native surface: actually publishing a single-image post to the connected
 * Instagram Business account (not merely reading the publishing limit).
 *
 * The reviewer pastes a public image URL + caption; this route:
 *   1. Reads the OAuth User token from the meta_review_token cookie.
 *   2. Swaps for the Page Access Token via /me/accounts.
 *   3. Resolves the IG Business account id from the connected Page via the
 *      instagram_business_account edge.
 *   4. Creates a media container: POST /{ig-user-id}/media.
 *   5. Publishes the container: POST /{ig-user-id}/media_publish.
 *   6. Returns a JSON payload describing the request and Graph response.
 *
 * Publishing uses the Page Access Token (Facebook-Login-for-Business config),
 * not the User token; the IG account is resolved through the connected Page.
 * The two-call flow (container then publish) is required — a single call does
 * not publish. Tokens never reach the browser; redactSensitive defends every
 * returned response body.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { redactSensitive } from '../lib/redact'

const GRAPH_VERSION = 'v25.0'
const MAX_CAPTION_LEN = 2200

export type PageIgResponse = {
  instagram_business_account?: { id?: string }
}

/**
 * Extract the connected Instagram Business account id from a Page response
 * (GET /{page-id}?fields=instagram_business_account). Returns the id, or null
 * if the Page has no linked IG Business account.
 *
 * Mirrors the resolution the dashboard server component does inline; factored
 * here as a pure, exported function for unit testing.
 */
export function extractIgUserId(body: PageIgResponse): string | null {
  return body.instagram_business_account?.id ?? null
}

/**
 * Validate the image URL: must be a non-empty string, a well-formed https://
 * URL whose path ends in a common image extension (.jpg/.jpeg/.png).
 *
 * Exported pure for unit testing.
 */
export function isValidImageUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  return /\.(jpe?g|png)$/i.test(url.pathname)
}

function jsonError(status: number, payload: Record<string, unknown>): NextResponse {
  return NextResponse.json(payload, { status })
}

export async function POST(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies()
  const userToken = cookieStore.get('meta_review_token')?.value
  if (!userToken) {
    return jsonError(401, { ok: false, error: 'unauthenticated' })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return jsonError(400, { ok: false, error: 'invalid_json' })
  }
  const imageUrlRaw =
    typeof raw === 'object' && raw !== null && 'image_url' in raw
      ? (raw as { image_url?: unknown }).image_url
      : undefined
  const captionRaw =
    typeof raw === 'object' && raw !== null && 'caption' in raw
      ? (raw as { caption?: unknown }).caption
      : undefined

  if (!isValidImageUrl(imageUrlRaw)) {
    return jsonError(400, { ok: false, error: 'invalid_image_url' })
  }
  const imageUrl = imageUrlRaw
  const caption = typeof captionRaw === 'string' ? captionRaw.trim() : ''
  if (caption.length > MAX_CAPTION_LEN) {
    return jsonError(400, {
      ok: false,
      error: 'caption_too_long',
      max_length: MAX_CAPTION_LEN,
    })
  }

  // Step 1 — User → Page Access Token swap.
  const accountsUrl = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`,
  )
  accountsUrl.searchParams.set('fields', 'id,name,access_token')
  accountsUrl.searchParams.set('access_token', userToken)

  let pageId: string
  let pageToken: string
  let pageName: string | undefined
  try {
    const res = await fetch(accountsUrl.toString(), { cache: 'no-store' })
    const text = await res.text()
    if (!res.ok) {
      return jsonError(502, {
        ok: false,
        error: 'me_accounts_failed',
        status: res.status,
        body: text.slice(0, 500),
      })
    }
    const parsed = JSON.parse(text) as {
      data?: Array<{ id?: string; name?: string; access_token?: string }>
    }
    const first = parsed.data?.[0]
    if (!first?.id || !first?.access_token) {
      return jsonError(502, {
        ok: false,
        error: 'no_page_with_token',
        body: text.slice(0, 500),
      })
    }
    pageId = first.id
    pageToken = first.access_token
    pageName = first.name
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'me_accounts_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  // Step 2 — resolve the IG Business account id from the connected Page.
  const pageUrl = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}`,
  )
  pageUrl.searchParams.set('fields', 'instagram_business_account')
  pageUrl.searchParams.set('access_token', pageToken)

  let igUserId: string
  try {
    const res = await fetch(pageUrl.toString(), { cache: 'no-store' })
    const text = await res.text()
    if (!res.ok) {
      return jsonError(502, {
        ok: false,
        error: 'ig_account_failed',
        status: res.status,
        body: text.slice(0, 500),
      })
    }
    const parsed = JSON.parse(text) as PageIgResponse
    const resolved = extractIgUserId(parsed)
    if (!resolved) {
      return jsonError(409, {
        ok: false,
        error: 'no_ig_account',
        message:
          'The connected Page has no linked Instagram Business account.',
      })
    }
    igUserId = resolved
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'ig_account_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  // Step 3 — create the media container: POST /{ig-user-id}/media.
  const containerUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media`
  const containerBody = new URLSearchParams()
  containerBody.set('image_url', imageUrl)
  containerBody.set('caption', caption)
  containerBody.set('access_token', pageToken)

  let creationId: string
  try {
    const res = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: containerBody.toString(),
      cache: 'no-store',
    })
    const text = await res.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = { raw: text.slice(0, 500) }
    }
    if (!res.ok) {
      return jsonError(502, {
        ok: false,
        error: 'container_failed',
        status: res.status,
        response: redactSensitive(parsed),
        request: {
          endpoint: `POST /${GRAPH_VERSION}/${igUserId}/media`,
          ig_user_id: igUserId,
          page_id: pageId,
          image_url: imageUrl,
          caption,
        },
      })
    }
    const id = (parsed as { id?: string })?.id
    if (!id) {
      return jsonError(502, {
        ok: false,
        error: 'container_failed',
        status: res.status,
        response: redactSensitive(parsed),
        request: {
          endpoint: `POST /${GRAPH_VERSION}/${igUserId}/media`,
          ig_user_id: igUserId,
          page_id: pageId,
          image_url: imageUrl,
          caption,
        },
      })
    }
    creationId = id
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'container_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  // Step 4 — publish the container: POST /{ig-user-id}/media_publish. Only
  // reached after a successful container step, with its creation_id.
  const publishUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media_publish`
  const publishBody = new URLSearchParams()
  publishBody.set('creation_id', creationId)
  publishBody.set('access_token', pageToken)

  let publishStatus: number
  let publishParsed: unknown
  try {
    const res = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: publishBody.toString(),
      cache: 'no-store',
    })
    publishStatus = res.status
    const text = await res.text()
    try {
      publishParsed = JSON.parse(text)
    } catch {
      publishParsed = { raw: text.slice(0, 500) }
    }
    if (!res.ok) {
      return jsonError(502, {
        ok: false,
        error: 'publish_failed',
        status: res.status,
        response: redactSensitive(publishParsed),
        request: {
          endpoint: `POST /${GRAPH_VERSION}/${igUserId}/media_publish`,
          ig_user_id: igUserId,
          page_id: pageId,
          creation_id: creationId,
        },
      })
    }
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'publish_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  return NextResponse.json({
    ok: true,
    status: publishStatus,
    request: {
      container_endpoint: `POST /${GRAPH_VERSION}/${igUserId}/media`,
      publish_endpoint: `POST /${GRAPH_VERSION}/${igUserId}/media_publish`,
      ig_user_id: igUserId,
      page_id: pageId,
      page_name: pageName ?? null,
      creation_id: creationId,
      image_url: imageUrl,
      caption,
    },
    // Defence in depth: redact even though a successful media_publish body is
    // just the published media id.
    response: redactSensitive(publishParsed),
  })
}
