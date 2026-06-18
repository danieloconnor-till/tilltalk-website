import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { pickRecipientPsid, type ConversationsResponse } from '../route'

// --- pickRecipientPsid (pure) ----------------------------------------------

describe('pickRecipientPsid', () => {
  it('returns null when there are no conversations', () => {
    expect(pickRecipientPsid({}, 'PAGE_ID')).toBeNull()
    expect(pickRecipientPsid({ data: [] }, 'PAGE_ID')).toBeNull()
  })

  it('picks the non-Page participant of the most recently updated conversation', () => {
    const body: ConversationsResponse = {
      data: [
        {
          id: 'C_OLDER',
          updated_time: '2026-06-17T10:00:00+0000',
          participants: {
            data: [
              { id: 'PAGE_ID', name: 'My Page' },
              { id: 'PSID_OLDER', name: 'Older user' },
            ],
          },
        },
        {
          id: 'C_NEWER',
          updated_time: '2026-06-18T14:30:00+0000',
          participants: {
            data: [
              { id: 'PAGE_ID', name: 'My Page' },
              { id: 'PSID_NEWER', name: 'Recent reviewer' },
            ],
          },
        },
      ],
    }
    expect(pickRecipientPsid(body, 'PAGE_ID')).toBe('PSID_NEWER')
  })

  it('skips conversations whose only participant is the Page itself', () => {
    const body: ConversationsResponse = {
      data: [
        {
          id: 'C_SELF',
          updated_time: '2026-06-18T14:30:00+0000',
          participants: { data: [{ id: 'PAGE_ID' }] },
        },
        {
          id: 'C_REAL',
          updated_time: '2026-06-18T13:00:00+0000',
          participants: {
            data: [{ id: 'PAGE_ID' }, { id: 'PSID_REAL' }],
          },
        },
      ],
    }
    expect(pickRecipientPsid(body, 'PAGE_ID')).toBe('PSID_REAL')
  })

  it('handles missing updated_time by treating it as oldest', () => {
    const body: ConversationsResponse = {
      data: [
        {
          id: 'C_NOTIME',
          participants: {
            data: [{ id: 'PAGE_ID' }, { id: 'PSID_NOTIME' }],
          },
        },
        {
          id: 'C_TIMED',
          updated_time: '2026-06-18T12:00:00+0000',
          participants: {
            data: [{ id: 'PAGE_ID' }, { id: 'PSID_TIMED' }],
          },
        },
      ],
    }
    expect(pickRecipientPsid(body, 'PAGE_ID')).toBe('PSID_TIMED')
  })

  it('returns null when every participant is the Page', () => {
    const body: ConversationsResponse = {
      data: [
        {
          id: 'C_ONLYPAGE',
          updated_time: '2026-06-18T14:30:00+0000',
          participants: { data: [{ id: 'PAGE_ID' }] },
        },
      ],
    }
    expect(pickRecipientPsid(body, 'PAGE_ID')).toBeNull()
  })
})

// --- POST handler: validation + auth paths --------------------------------

// Mock the next/headers cookies() at the module level. Individual tests set
// the value via a per-test override.
let cookieStoreValue: { get: (n: string) => { value: string } | undefined }
vi.mock('next/headers', () => ({
  cookies: async () => cookieStoreValue,
}))

async function loadRoute() {
  const mod = await import('../route')
  return mod
}

function makePostRequest(body: unknown): Request {
  return new Request('https://tilltalk.ie/review/meta-bk2xp9/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /review/meta-bk2xp9/send — validation', () => {
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
    // The Graph API must not be hit when the user is unauthenticated.
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
    const res = await POST(makePostRequest({ message: '   \n  ' }))
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
      'https://tilltalk.ie/review/meta-bk2xp9/send',
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
