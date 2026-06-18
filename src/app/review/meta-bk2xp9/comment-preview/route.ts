/**
 * Server-side Page-comment preview for the Meta App Review demo dashboard.
 *
 * Companion read for /review/meta-bk2xp9/comment-reply. The reply route posts a
 * reply to the most recent comment from another user on the Page's own posts;
 * this GET shows the reviewer that target comment — commenter, text, timestamp —
 * before they reply, so the App Review screencast can show the full loop inside
 * the UI.
 *
 * The selection rule is single-sourced: pickTargetComment (and its
 * PostWithComments / CommentSelection / Comment types) is imported from the
 * comment-reply route, so this preview and the reply resolve the identical
 * target comment for the same data. The posts→comments fetch loop is replicated
 * here (with the same scan order and limits) rather than refactoring the reply
 * route, keeping the send/reply action untouched.
 *
 * Tokens never reach the browser; redactSensitive defends every Graph-derived
 * value in the response.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { redactSensitive } from '../lib/redact'
import {
  pickTargetComment,
  type Comment,
  type CommentSelection,
  type PostWithComments,
} from '../comment-reply/route'

const GRAPH_VERSION = 'v25.0'
const MAX_POSTS_SCANNED = 10
const MAX_COMMENTS_PER_POST = 10

function jsonError(status: number, payload: Record<string, unknown>): NextResponse {
  return NextResponse.json(payload, { status })
}

type PostsResponse = {
  data?: Array<{ id?: string; message?: string; created_time?: string }>
}

type CommentsResponse = {
  data?: Comment[]
}

const NO_RECENT_COMMENT_MESSAGE =
  "No recent comment from another user on the Page's posts. Comment on one of the Page's posts from a different account first, then retry."

export async function GET(): Promise<NextResponse> {
  const cookieStore = await cookies()
  const userToken = cookieStore.get('meta_review_token')?.value
  if (!userToken) {
    return jsonError(401, { ok: false, error: 'unauthenticated' })
  }

  // Step 1 — User → Page Access Token swap (same pattern as comment-reply).
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

  // Step 2 — fetch recent posts (mirrors the reply route's scan order/limits).
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
        message: NO_RECENT_COMMENT_MESSAGE,
      })
    }
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'posts_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  // Fetch comments for each post in order and run the SAME pure selector the
  // reply route uses. Stop at the first post that yields an eligible comment,
  // so preview and reply pick the identical target.
  let selection: CommentSelection | null = null
  let selectedComment: Comment | null = null
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
        // Skip posts the Page token can't read comments for (matches reply).
        continue
      }
      const parsed = JSON.parse(text) as CommentsResponse
      const current: PostWithComments = {
        postId: post.id,
        postCreatedTime: post.created_time,
        comments: parsed.data ?? [],
      }
      buffered.push(current)
      const candidate = pickTargetComment(buffered.slice(-1), pageId)
      if (candidate) {
        selection = candidate
        selectedComment =
          current.comments.find((c) => c.id === candidate.commentId) ?? null
        break
      }
    }
    if (!selection) {
      return jsonError(409, {
        ok: false,
        error: 'no_recent_comment',
        message: NO_RECENT_COMMENT_MESSAGE,
      })
    }
  } catch (err) {
    return jsonError(502, {
      ok: false,
      error: 'comments_network',
      detail: err instanceof Error ? err.message : 'unknown',
    })
  }

  // redactSensitive defends every Graph-derived value; the access token is
  // never part of this payload.
  return NextResponse.json({
    ok: true,
    inbound: redactSensitive({
      commenter_name: selection.commenterName,
      comment_id: selection.commentId,
      post_id: selection.postId,
      text: selectedComment?.message ?? null,
      created_time: selectedComment?.created_time ?? null,
    }),
  })
}
