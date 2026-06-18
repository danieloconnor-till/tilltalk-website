/**
 * Server-side Messenger conversation preview for the Meta App Review demo
 * dashboard.
 *
 * Companion read for /review/meta-bk2xp9/send. The send route fires a reply to
 * whoever last messaged the Page; this GET shows the reviewer the inbound
 * customer message that reply will answer — sender, text, timestamp — so the
 * App Review screencast can show the full loop (inbound appears → reviewer
 * replies → success) inside the UI before anything is sent.
 *
 * Resolution mirrors the send route exactly: User → Page token swap, then the
 * Page's most recently updated conversation. The recipient PSID is resolved by
 * the SAME pickRecipientPsid imported from the send route, so preview and reply
 * target the identical recipient.
 *
 * Tokens never reach the browser. All Graph calls run server-side and
 * redactSensitive defends every Graph-derived value in the response.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { redactSensitive } from '../lib/redact'
import { pickRecipientPsid, type ConversationsResponse } from '../send/route'

const GRAPH_VERSION = 'v25.0'
const MAX_CONVERSATIONS_SCANNED = 5

type ConversationWithId = NonNullable<ConversationsResponse['data']>[number]

type MessagesResponse = {
  data?: Array<{
    id?: string
    message?: string
    from?: { id?: string; name?: string }
    created_time?: string
  }>
}

function jsonError(status: number, payload: Record<string, unknown>): NextResponse {
  return NextResponse.json(payload, { status })
}

/**
 * Find the conversation that contains the chosen recipient PSID, walking
 * conversations in the same most-recent-first order pickRecipientPsid uses, so
 * the conversation id we read messages from belongs to the recipient the reply
 * will actually target.
 */
function findConversationForPsid(
  body: ConversationsResponse,
  psid: string,
): ConversationWithId | null {
  const convos = (body.data ?? []).slice()
  convos.sort((a, b) => {
    const ta = a.updated_time ? Date.parse(a.updated_time) : 0
    const tb = b.updated_time ? Date.parse(b.updated_time) : 0
    return tb - ta
  })
  for (const c of convos) {
    const parts = c.participants?.data ?? []
    if (parts.some((p) => p.id === psid)) return c
  }
  return null
}

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies()
  const userToken = cookieStore.get('meta_review_token')?.value
  if (!userToken) {
    return jsonError(401, { ok: false, error: 'unauthenticated' })
  }

  // Step 1 — User → Page Access Token swap (same pattern as send/route.ts).
  const accountsUrl = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`,
  )
  accountsUrl.searchParams.set('fields', 'id,name,access_token')
  accountsUrl.searchParams.set('access_token', userToken)

  let pageId: string
  let pageToken: string
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
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'me_accounts_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  // Step 2 — Resolve PSID and its conversation from the Page's most recent
  // conversations. The id field is requested so we can read that conversation's
  // messages below.
  const convosUrl = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/conversations`,
  )
  convosUrl.searchParams.set('fields', 'id,participants,updated_time')
  convosUrl.searchParams.set('limit', String(MAX_CONVERSATIONS_SCANNED))
  convosUrl.searchParams.set('access_token', pageToken)

  let recipientPsid: string
  let conversationId: string | null
  let senderName: string | null = null
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
    const convo = findConversationForPsid(parsed, psid)
    conversationId = convo?.id ?? null
    // The conversation participant carries the customer's display name.
    const part = (convo?.participants?.data ?? []).find((p) => p.id === psid)
    senderName = part?.name ?? null
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'conversations_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  // Step 3 — Read the latest inbound message of that conversation. If the
  // conversation id wasn't available we can still return the resolved recipient
  // (text/created_time null) so the reviewer at least sees who the reply targets.
  let inboundText: string | null = null
  let inboundCreatedTime: string | null = null
  if (conversationId) {
    const messagesUrl = new URL(
      `https://graph.facebook.com/${GRAPH_VERSION}/${conversationId}/messages`,
    )
    messagesUrl.searchParams.set('fields', 'message,from,created_time')
    messagesUrl.searchParams.set('limit', '1')
    messagesUrl.searchParams.set('access_token', pageToken)

    try {
      const res = await fetch(messagesUrl.toString(), { cache: 'no-store' })
      const text = await res.text()
      if (!res.ok) {
        return jsonError(502, {
          ok: false,
          error: 'messages_failed',
          status: res.status,
          body: text.slice(0, 500),
        })
      }
      const parsed = JSON.parse(text) as MessagesResponse
      // Take the most recent message authored by the customer (not the Page).
      const inbound = (parsed.data ?? []).find(
        (m) => m.from?.id && m.from.id !== pageId,
      )
      if (inbound) {
        inboundText = inbound.message ?? null
        inboundCreatedTime = inbound.created_time ?? null
        // Prefer the message's from.name if the conversation didn't carry one.
        if (!senderName) senderName = inbound.from?.name ?? null
      }
    } catch (err) {
      return jsonError(502, {
        ok: false,
        error: 'messages_network',
        detail: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  // redactSensitive defends every Graph-derived value; the access token is
  // never part of this payload.
  return NextResponse.json({
    ok: true,
    inbound: redactSensitive({
      sender_name: senderName,
      sender_psid: recipientPsid,
      text: inboundText,
      created_time: inboundCreatedTime,
    }),
  })
}
