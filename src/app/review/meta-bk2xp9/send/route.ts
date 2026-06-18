/**
 * Server-side Messenger send action for the Meta App Review demo dashboard.
 *
 * The reviewer pastes a message into the dashboard UI and clicks "Send via
 * Messenger". This route:
 *   1. Reads the OAuth User token from the meta_review_token cookie (same
 *      cookie the dashboard reads).
 *   2. Swaps for the Page Access Token via /me/accounts.
 *   3. Resolves a recipient PSID by reading the most recently updated
 *      Messenger conversation on the Page (the reviewer must have messaged
 *      the Page within the 24-hour standard messaging window).
 *   4. POSTs /me/messages with messaging_type=RESPONSE.
 *   5. Returns a JSON payload describing the request and Graph response.
 *      The access token is never returned to the client (redactSensitive
 *      defends against accidental inclusion).
 *
 * Tokens never reach the browser. All Graph calls run server-side.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { redactSensitive } from '../lib/redact'

const GRAPH_VERSION = 'v25.0'
const MAX_MESSAGE_LEN = 280
const MAX_CONVERSATIONS_SCANNED = 5

export type ConversationsResponse = {
  data?: Array<{
    id?: string
    updated_time?: string
    participants?: {
      data?: Array<{ id?: string; name?: string }>
    }
  }>
}

/**
 * Pick the recipient PSID from a Conversations response. Strategy:
 *   - Walk conversations in descending updated_time order.
 *   - Within each, return the first participant whose id !== pageId.
 *   - Returns null if no such participant exists in any conversation.
 *
 * Exported for unit testing — the rest of the route is HTTP plumbing.
 */
export function pickRecipientPsid(
  body: ConversationsResponse,
  pageId: string,
): string | null {
  const convos = (body.data ?? []).slice()
  convos.sort((a, b) => {
    const ta = a.updated_time ? Date.parse(a.updated_time) : 0
    const tb = b.updated_time ? Date.parse(b.updated_time) : 0
    return tb - ta
  })
  for (const c of convos) {
    const parts = c.participants?.data ?? []
    for (const p of parts) {
      if (p.id && p.id !== pageId) return p.id
    }
  }
  return null
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
  const messageRaw =
    typeof raw === 'object' && raw !== null && 'message' in raw
      ? (raw as { message?: unknown }).message
      : undefined
  const message = typeof messageRaw === 'string' ? messageRaw.trim() : ''
  if (!message) {
    return jsonError(400, { ok: false, error: 'message_required' })
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return jsonError(400, {
      ok: false,
      error: 'message_too_long',
      max_length: MAX_MESSAGE_LEN,
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

  // Step 2 — Resolve PSID from the Page's most recent conversation.
  const convosUrl = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/conversations`,
  )
  convosUrl.searchParams.set('fields', 'participants,updated_time')
  convosUrl.searchParams.set('limit', String(MAX_CONVERSATIONS_SCANNED))
  convosUrl.searchParams.set('access_token', pageToken)

  let recipientPsid: string
  try {
    const res = await fetch(convosUrl.toString(), { cache: 'no-store' })
    const text = await res.text()
    if (!res.ok) {
      return jsonError(502, {
        ok: false,
        error: 'conversations_failed',
        status: res.status,
        body: text.slice(0, 500),
      })
    }
    const parsed = JSON.parse(text) as ConversationsResponse
    const psid = pickRecipientPsid(parsed, pageId)
    if (!psid) {
      return jsonError(409, {
        ok: false,
        error: 'no_recent_conversation',
        message:
          'No recent Messenger conversation. Message the Page from Messenger first, then retry.',
      })
    }
    recipientPsid = psid
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'conversations_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  // Step 3 — POST /me/messages as the Page (Page token + RESPONSE type, inside
  // the 24h standard messaging window).
  const sendUrl = `https://graph.facebook.com/${GRAPH_VERSION}/me/messages`
  const sendBody = new URLSearchParams()
  sendBody.set('recipient', JSON.stringify({ id: recipientPsid }))
  sendBody.set('messaging_type', 'RESPONSE')
  sendBody.set('message', JSON.stringify({ text: message }))
  sendBody.set('access_token', pageToken)

  let sendStatus: number
  let sendBodyParsed: unknown
  try {
    const res = await fetch(sendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: sendBody.toString(),
      cache: 'no-store',
    })
    sendStatus = res.status
    const text = await res.text()
    try {
      sendBodyParsed = JSON.parse(text)
    } catch {
      sendBodyParsed = { raw: text.slice(0, 500) }
    }
    if (!res.ok) {
      return jsonError(502, {
        ok: false,
        error: 'send_failed',
        status: res.status,
        // Run the error body through the redactor as well — defence in depth.
        response: redactSensitive(sendBodyParsed),
        request: {
          endpoint: `POST /${GRAPH_VERSION}/me/messages`,
          recipient_psid: recipientPsid,
          page_id: pageId,
          messaging_type: 'RESPONSE',
        },
      })
    }
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'send_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  return NextResponse.json({
    ok: true,
    status: sendStatus,
    request: {
      endpoint: `POST /${GRAPH_VERSION}/me/messages`,
      page_id: pageId,
      page_name: pageName ?? null,
      recipient_psid: recipientPsid,
      messaging_type: 'RESPONSE',
      message,
    },
    // Defence in depth: even though the Graph response for a successful
    // /me/messages call doesn't include the access token, run it through the
    // redactor in case Meta changes the shape in a future API version.
    response: redactSensitive(sendBodyParsed),
  })
}
