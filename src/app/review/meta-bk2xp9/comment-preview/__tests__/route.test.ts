import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
// Import the SAME selector the reply route uses, to assert the preview targets
// the identical comment the reply would.
import { pickTargetComment, type PostWithComments } from '../../comment-reply/route'

// Mock next/headers cookies() at the module level; per-test override of value.
let cookieStoreValue: { get: (n: string) => { value: string } | undefined }
vi.mock('next/headers', () => ({
  cookies: async () => cookieStoreValue,
}))

async function loadRoute() {
  const mod = await import('../route')
  return mod
}

const authedCookie = {
  get: (n: string) =>
    n === 'meta_review_token' ? { value: 'usertoken' } : undefined,
}

describe('GET /review/meta-bk2xp9/comment-preview', () => {
  beforeEach(() => {
    cookieStoreValue = { get: () => undefined }
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('returns 401 when meta_review_token cookie is missing', async () => {
    const { GET } = await loadRoute()
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ ok: false, error: 'unauthenticated' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 409 no_recent_comment when no eligible comment exists', async () => {
    cookieStoreValue = authedCookie
    // /me/accounts → Page; /posts → empty data.
    const fetchMock = vi
      .fn()
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

    const { GET } = await loadRoute()
    const res = await GET()
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('no_recent_comment')
    expect(body.message).toBe(
      "No recent comment from another user on the Page's posts. Comment on one of the Page's posts from a different account first, then retry.",
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns the inbound preview whose comment_id matches pickTargetComment', async () => {
    cookieStoreValue = authedCookie

    // The comments the Graph /comments read will return for POST_A.
    const postAComments = [
      {
        id: 'C_OLD',
        message: 'Loved it last week',
        from: { id: 'USER_X', name: 'Older user' },
        created_time: '2026-06-17T10:00:00+0000',
      },
      {
        id: 'C_NEW',
        message: 'Do you take bookings for 8?',
        from: { id: 'USER_Y', name: 'Recent reviewer' },
        created_time: '2026-06-18T14:30:00+0000',
      },
      {
        id: 'C_PAGE',
        message: 'Thanks all!',
        from: { id: 'PAGE_ID', name: 'Bella Napoli' },
        created_time: '2026-06-18T15:00:00+0000',
      },
    ]

    const fetchMock = vi
      .fn()
      // 1: /me/accounts
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
      // 2: /posts
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [{ id: 'POST_A', created_time: '2026-06-18T09:00:00+0000' }],
          }),
      })
      // 3: /{post-id}/comments
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: postAComments }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await loadRoute()
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)

    // The reply route would resolve the target via pickTargetComment over the
    // same data. Preview MUST select the identical comment.
    const posts: PostWithComments[] = [
      { postId: 'POST_A', comments: postAComments },
    ]
    const expected = pickTargetComment(posts, 'PAGE_ID')
    expect(expected?.commentId).toBe('C_NEW')
    expect(body.inbound.comment_id).toBe(expected?.commentId)
    expect(body.inbound.post_id).toBe(expected?.postId)
    expect(body.inbound.commenter_name).toBe(expected?.commenterName)

    expect(body.inbound.text).toBe('Do you take bookings for 8?')
    expect(body.inbound.created_time).toBe('2026-06-18T14:30:00+0000')

    // No access token must appear anywhere in the response.
    expect(JSON.stringify(body)).not.toContain('pagetok')
    expect(JSON.stringify(body)).not.toContain('usertoken')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
