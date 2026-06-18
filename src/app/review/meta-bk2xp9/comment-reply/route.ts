/**
 * Server-side Page-comment-reply action for the Meta App Review demo dashboard.
 *
 * Companion to /review/meta-bk2xp9/send. The Messenger send route demonstrates
 * pages_messaging (DM reply). This route demonstrates pages_manage_engagement
 * via its native surface: a reply to a comment on a Page's own post.
 *
 * The reviewer types a reply; this route:
 *   1. Reads the OAuth User token from the meta_review_token cookie.
 *   2. Swaps for the Page Access Token via /me/accounts.
 *   3. Scans the Page's recent posts and their comments for the most recent
 *      comment whose author !== the Page itself, choosing it as the reply
 *      target. The reviewer must have commented on one of the Page's posts
 *      from a different account first.
 *   4. POSTs /{comment-id}/comments with the reviewer's message.
 *   5. Returns a JSON payload describing the request and Graph response.
 *
 * Tokens never reach the browser; redactSensitive defends the response body.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { redactSensitive } from '../lib/redact'

const GRAPH_VERSION = 'v25.0'
const MAX_MESSAGE_LEN = 280
const MAX_POSTS_SCANNED = 10
const MAX_COMMENTS_PER_POST = 10

export type Comment = {
  id?: string
  message?: string
  from?: { id?: string; name?: string }
  created_time?: string
}

export type PostWithComments = {
  postId: string
  postCreatedTime?: string
  comments: Comment[]
}

export type CommentSelection = {
  commentId: string
  postId: string
  commenterName: string | null
}

/**
 * Pick the most recent comment from a non-Page author across the Page's
 * recent posts. Walk posts in input order (already most-recent-first from
 * /posts) and within each post pick the most recent non-Page comment by
 * created_time desc. Return the first such hit; null if none.
 *
 * Exported for unit testing — the rest of the route is HTTP plumbing.
 */
export function pickTargetComment(
  posts: PostWithComments[],
  pageId: string,
): CommentSelection | null {
  for (const post of posts) {
    const eligible = post.comments
      .filter((c) => c.id && c.from?.id && c.from.id !== pageId)
      .slice()
      .sort((a, b) => {
        const ta = a.created_time ? Date.parse(a.created_time) : 0
        const tb = b.created_time ? Date.parse(b.created_time) : 0
        return tb - ta
      })
    const top = eligible[0]
    if (top?.id) {
      return {
        commentId: top.id,
        postId: post.postId,
        commenterName: top.from?.name ?? null,
      }
    }
  }
  return null
}

function jsonError(status: number, payload: Record<string, unknown>): NextResponse {
  return NextResponse.json(payload, { status })
}

type PostsResponse = {
  data?: Array<{ id?: string; message?: string; created_time?: string }>
}

type CommentsResponse = {
  data?: Comment[]
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

  // Step 2 — fetch recent posts, then their comments, and pick the most
  // recent comment from a non-Page author.
  const postsUrl = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/posts`,
  )
  postsUrl.searchParams.set('fields', 'id,message,created_time')
  postsUrl.searchParams.set('limit', String(MAX_POSTS_SCANNED))
  postsUrl.searchParams.set('access_token', pageToken)

  let postIds: Array<{ id: string; created_time?: string }>
  try {
    const res = await fetch(postsUrl.toString(), { cache: 'no-store' })
    const text = await res.text()
    if (!res.ok) {
      return jsonError(502, {
        ok: false,
        error: 'posts_failed',
        status: res.status,
        body: text.slice(0, 500),
      })
    }
    const parsed = JSON.parse(text) as PostsResponse
    postIds = (parsed.data ?? [])
      .filter((p): p is { id: string; created_time?: string } => !!p.id)
      .map((p) => ({ id: p.id, created_time: p.created_time }))
    if (postIds.length === 0) {
      return jsonError(409, {
        ok: false,
        error: 'no_recent_comment',
        message:
          "No recent comment from another user on the Page's posts. Comment on one of the Page's posts from a different account first, then retry.",
      })
    }
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'posts_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  // Fetch comments for each post in order, then run the pure selector. Stop
  // at the first post that yields an eligible comment.
  let selection: CommentSelection | null = null
  try {
    const buffered: PostWithComments[] = []
    for (const post of postIds) {
      const commentsUrl = new URL(
        `https://graph.facebook.com/${GRAPH_VERSION}/${post.id}/comments`,
      )
      commentsUrl.searchParams.set('fields', 'id,message,from,created_time')
      commentsUrl.searchParams.set('limit', String(MAX_COMMENTS_PER_POST))
      commentsUrl.searchParams.set('order', 'reverse_chronological')
      commentsUrl.searchParams.set('access_token', pageToken)

      const res = await fetch(commentsUrl.toString(), { cache: 'no-store' })
      const text = await res.text()
      if (!res.ok) {
        // Skip posts the Page token can't read comments for (rare; e.g. a
        // post-type that disables comments).
        continue
      }
      const parsed = JSON.parse(text) as CommentsResponse
      buffered.push({
        postId: post.id,
        postCreatedTime: post.created_time,
        comments: parsed.data ?? [],
      })
      const candidate = pickTargetComment(buffered.slice(-1), pageId)
      if (candidate) {
        selection = candidate
        break
      }
    }
    if (!selection) {
      return jsonError(409, {
        ok: false,
        error: 'no_recent_comment',
        message:
          "No recent comment from another user on the Page's posts. Comment on one of the Page's posts from a different account first, then retry.",
      })
    }
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'comments_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  // Step 3 — POST /{comment-id}/comments with the reply text, as the Page.
  const replyUrl = `https://graph.facebook.com/${GRAPH_VERSION}/${selection.commentId}/comments`
  const replyBody = new URLSearchParams()
  replyBody.set('message', message)
  replyBody.set('access_token', pageToken)

  let replyStatus: number
  let replyBodyParsed: unknown
  try {
    const res = await fetch(replyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: replyBody.toString(),
      cache: 'no-store',
    })
    replyStatus = res.status
    const text = await res.text()
    try {
      replyBodyParsed = JSON.parse(text)
    } catch {
      replyBodyParsed = { raw: text.slice(0, 500) }
    }
    if (!res.ok) {
      return jsonError(502, {
        ok: false,
        error: 'reply_failed',
        status: res.status,
        response: redactSensitive(replyBodyParsed),
        request: {
          endpoint: `POST /${GRAPH_VERSION}/${selection.commentId}/comments`,
          page_id: pageId,
          target_comment_id: selection.commentId,
          post_id: selection.postId,
          commenter_name: selection.commenterName,
        },
      })
    }
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'reply_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  return NextResponse.json({
    ok: true,
    status: replyStatus,
    request: {
      endpoint: `POST /${GRAPH_VERSION}/${selection.commentId}/comments`,
      page_id: pageId,
      page_name: pageName ?? null,
      target_comment_id: selection.commentId,
      post_id: selection.postId,
      commenter_name: selection.commenterName,
      message,
    },
    response: redactSensitive(replyBodyParsed),
  })
}
