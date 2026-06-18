import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

describe('GET /review/meta-bk2xp9/conversation-preview', () => {
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

  it('returns 409 no_recent_conversation when pickRecipientPsid returns null', async () => {
    cookieStoreValue = authedCookie
    // /me/accounts → a Page; /conversations → only the Page itself participates.
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
        text: async () =>
          JSON.stringify({
            data: [
              {
                id: 'CONV_SELF',
                updated_time: '2026-06-18T14:00:00+0000',
                participants: { data: [{ id: 'PAGE_ID' }] },
              },
            ],
          }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await loadRoute()
    const res = await GET()
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('no_recent_conversation')
    expect(body.message).toBe(
      'No recent Messenger conversation. Message the Page from Messenger first, then retry.',
    )
    // /me/accounts + /conversations only — no /messages read.
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns the inbound preview (text + sender_psid) on success', async () => {
    cookieStoreValue = authedCookie
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
      // 2: /conversations
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [
              {
                id: 'CONV_1',
                updated_time: '2026-06-18T14:00:00+0000',
                participants: {
                  data: [
                    { id: 'PAGE_ID', name: 'Bella Napoli' },
                    { id: 'PSID_123', name: 'Reviewer Rita' },
                  ],
                },
              },
            ],
          }),
      })
      // 3: /{conversation-id}/messages
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: [
              {
                id: 'MSG_1',
                message: 'Hi, are you open on Sunday?',
                from: { id: 'PSID_123', name: 'Reviewer Rita' },
                created_time: '2026-06-18T13:59:00+0000',
              },
            ],
          }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await loadRoute()
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.inbound.sender_psid).toBe('PSID_123')
    expect(body.inbound.text).toBe('Hi, are you open on Sunday?')
    expect(body.inbound.sender_name).toBe('Reviewer Rita')
    expect(body.inbound.created_time).toBe('2026-06-18T13:59:00+0000')
    // No access token must appear anywhere in the response.
    expect(JSON.stringify(body)).not.toContain('pagetok')
    expect(JSON.stringify(body)).not.toContain('usertoken')
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
