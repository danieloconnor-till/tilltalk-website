import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  pickTargetComment,
  type PostWithComments,
} from '../route'

// --- pickTargetComment (pure) ---------------------------------------------

describe('pickTargetComment', () => {
  it('returns null when there are no posts', () => {
    expect(pickTargetComment([], 'PAGE_ID')).toBeNull()
  })

  it('returns null when every comment is from the Page itself', () => {
    const posts: PostWithComments[] = [
      {
        postId: 'POST_A',
        comments: [
          {
            id: 'C1',
            from: { id: 'PAGE_ID', name: 'My Page' },
            created_time: '2026-06-18T12:00:00+0000',
          },
          {
            id: 'C2',
            from: { id: 'PAGE_ID', name: 'My Page' },
            created_time: '2026-06-18T13:00:00+0000',
          },
        ],
      },
    ]
    expect(pickTargetComment(posts, 'PAGE_ID')).toBeNull()
  })

  it('picks the most recent non-Page comment on the first post that has one', () => {
    const posts: PostWithComments[] = [
      {
        postId: 'POST_NEWEST',
        comments: [
          {
            id: 'C_OLD',
            from: { id: 'USER_X', name: 'Older user' },
            created_time: '2026-06-17T10:00:00+0000',
          },
          {
            id: 'C_NEW',
            from: { id: 'USER_Y', name: 'Recent reviewer' },
            created_time: '2026-06-18T14:30:00+0000',
          },
          {
            id: 'C_PAGE',
            from: { id: 'PAGE_ID', name: 'My Page' },
            created_time: '2026-06-18T15:00:00+0000',
          },
        ],
      },
    ]
    const sel = pickTargetComment(posts, 'PAGE_ID')
    expect(sel).toEqual({
      commentId: 'C_NEW',
      postId: 'POST_NEWEST',
      commenterName: 'Recent reviewer',
    })
  })

  it('moves on to the next post when the current post has no eligible comments', () => {
    const posts: PostWithComments[] = [
      {
        postId: 'POST_FIRST_NOCOMMENTS',
        comments: [],
      },
      {
        postId: 'POST_SECOND_ONLY_PAGE',
        comments: [
          {
            id: 'C_PAGE_ONLY',
            from: { id: 'PAGE_ID' },
            created_time: '2026-06-18T13:00:00+0000',
          },
        ],
      },
      {
        postId: 'POST_THIRD_HAS_USER',
        comments: [
          {
            id: 'C_USER',
            from: { id: 'USER_Z', name: 'Third-post commenter' },
            created_time: '2026-06-18T12:00:00+0000',
          },
        ],
      },
    ]
    const sel = pickTargetComment(posts, 'PAGE_ID')
    expect(sel).toEqual({
      commentId: 'C_USER',
      postId: 'POST_THIRD_HAS_USER',
      commenterName: 'Third-post commenter',
    })
  })

  it('treats missing created_time as oldest when sorting', () => {
    const posts: PostWithComments[] = [
      {
        postId: 'POST_A',
        comments: [
          {
            id: 'C_NOTIME',
            from: { id: 'USER_NOTIME', name: 'No time' },
          },
          {
            id: 'C_TIMED',
            from: { id: 'USER_TIMED', name: 'Timed' },
            created_time: '2026-06-18T12:00:00+0000',
          },
        ],
      },
    ]
    const sel = pickTargetComment(posts, 'PAGE_ID')
    expect(sel?.commentId).toBe('C_TIMED')
  })

  it('skips comments missing a comment id but accepts comments missing from', () => {
    // Graph v25.0 omits `from` for third-party commenters, so a comment with no
    // `from` is a valid target. A comment with no comment id is still skipped
    // (the reply POST needs the id), even when it is the most recent.
    const posts: PostWithComments[] = [
      {
        postId: 'POST_A',
        comments: [
          { id: 'C_NOFROM', created_time: '2026-06-18T14:00:00+0000' },
          {
            from: { id: 'USER_NOID', name: 'No comment id' },
            created_time: '2026-06-18T15:00:00+0000',
          },
          {
            id: 'C_OK',
            from: { id: 'USER_OK', name: 'Valid' },
            created_time: '2026-06-18T13:00:00+0000',
          },
        ],
      },
    ]
    const sel = pickTargetComment(posts, 'PAGE_ID')
    // C_NOFROM is the most recent eligible comment; the id-less one is skipped.
    expect(sel?.commentId).toBe('C_NOFROM')
    expect(sel?.commenterName).toBeNull()
  })

  it('selects a third-party comment that has NO from field, with null commenterName', () => {
    const posts: PostWithComments[] = [
      {
        postId: 'POST_A',
        comments: [
          {
            id: 'C_NOFROM',
            message: 'Menu looks great',
            created_time: '2026-06-19T13:13:26+0000',
          },
        ],
      },
    ]
    const sel = pickTargetComment(posts, 'PAGE_ID')
    expect(sel).toEqual({
      commentId: 'C_NOFROM',
      postId: 'POST_A',
      commenterName: null,
    })
  })

  it('skips the Page’s own comment and selects the no-from comment alongside it', () => {
    const posts: PostWithComments[] = [
      {
        postId: 'POST_A',
        comments: [
          {
            id: 'C_PAGE',
            message: 'Thanks everyone!',
            from: { id: 'PAGE_ID', name: 'Bella Napoli' },
            created_time: '2026-06-19T15:00:00+0000',
          },
          {
            id: 'C_NOFROM',
            message: 'Do you take bookings?',
            created_time: '2026-06-19T14:00:00+0000',
          },
        ],
      },
    ]
    const sel = pickTargetComment(posts, 'PAGE_ID')
    // The Page's own comment is more recent but must be skipped; the no-from
    // third-party comment is the selected target.
    expect(sel?.commentId).toBe('C_NOFROM')
    expect(sel?.commenterName).toBeNull()
  })
})

// --- POST handler: validation + auth paths --------------------------------

let cookieStoreValue: { get: (n: string) => { value: string } | undefined }
vi.mock('next/headers', () => ({
  cookies: async () => cookieStoreValue,
}))

async function loadRoute() {
  const mod = await import('../route')
  return mod
}

function makePostRequest(body: unknown): Request {
  return new Request(
    'https://tilltalk.ie/review/meta-bk2xp9/comment-reply',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  )
}

describe('POST /review/meta-bk2xp9/comment-reply — validation', () => {
  beforeEach(() => {
    cookieStoreValue = { get: () => undefined }
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('returns 401 when meta_review_token cookie is missing', async () => {
    const { POST } = await loadRoute()
    const res = await POST(makePostRequest({ message: 'hi' }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ ok: false, error: 'unauthenticated' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 when message field is missing', async () => {
    cookieStoreValue = {
      get: (n) => (n === 'meta_review_token' ? { value: 'usertoken' } : undefined),
    }
    const { POST } = await loadRoute()
    const res = await POST(makePostRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('message_required')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 when message is whitespace-only', async () => {
    cookieStoreValue = {
      get: (n) => (n === 'meta_review_token' ? { value: 'usertoken' } : undefined),
    }
    const { POST } = await loadRoute()
    const res = await POST(makePostRequest({ message: '  \n  ' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('message_required')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 when message exceeds 280 chars', async () => {
    cookieStoreValue = {
      get: (n) => (n === 'meta_review_token' ? { value: 'usertoken' } : undefined),
    }
    const { POST } = await loadRoute()
    const longMessage = 'a'.repeat(281)
    const res = await POST(makePostRequest({ message: longMessage }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('message_too_long')
    expect(body.max_length).toBe(280)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 when request body is not JSON', async () => {
    cookieStoreValue = {
      get: (n) => (n === 'meta_review_token' ? { value: 'usertoken' } : undefined),
    }
    const { POST } = await loadRoute()
    const badReq = new Request(
      'https://tilltalk.ie/review/meta-bk2xp9/comment-reply',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      },
    )
    const res = await POST(badReq)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_json')
    expect(fetch).not.toHaveBeenCalled()
  })
})

// --- POST handler: no-eligible-comment 409 path ---------------------------

describe('POST /review/meta-bk2xp9/comment-reply — 409 no_recent_comment', () => {
  beforeEach(() => {
    cookieStoreValue = {
      get: (n) => (n === 'meta_review_token' ? { value: 'usertoken' } : undefined),
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('returns 409 with the documented message when no posts exist', async () => {
    // 1st fetch: /me/accounts → one Page
    // 2nd fetch: /{page-id}/posts → empty data
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [
              { id: 'PAGE_ID', name: 'Bella Napoli', access_token: 'pagetok' },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [] }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await loadRoute()
    const res = await POST(makePostRequest({ message: 'Thanks for visiting!' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('no_recent_comment')
    expect(body.message).toBe(
      "No recent comment from another user on the Page's posts. Comment on one of the Page's posts from a different account first, then retry.",
    )
    // We must have made the /me/accounts and /posts calls, but no reply POST.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns 409 when posts exist but every comment is from the Page itself', async () => {
    // /me/accounts → Page
    // /posts → one post
    // /{post-id}/comments → only Page-authored comments
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [
              { id: 'PAGE_ID', name: 'Bella Napoli', access_token: 'pagetok' },
            ],
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ data: [{ id: 'POST_A', created_time: '2026-06-18T10:00:00+0000' }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [
              {
                id: 'C_PAGE_ONLY',
                from: { id: 'PAGE_ID', name: 'Bella Napoli' },
                created_time: '2026-06-18T11:00:00+0000',
              },
            ],
          }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await loadRoute()
    const res = await POST(makePostRequest({ message: 'Thanks!' }))
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('no_recent_comment')
    // /me/accounts + /posts + /{post-id}/comments = 3 calls, no reply POST.
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
