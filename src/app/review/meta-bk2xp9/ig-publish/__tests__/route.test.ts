import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  extractIgUserId,
  isValidImageUrl,
  type PageIgResponse,
} from '../route'

// --- extractIgUserId (pure) ------------------------------------------------

describe('extractIgUserId', () => {
  it('returns the IG Business account id when present', () => {
    const body: PageIgResponse = {
      instagram_business_account: { id: '17841446266971466' },
    }
    expect(extractIgUserId(body)).toBe('17841446266971466')
  })

  it('returns null when the Page has no linked IG Business account', () => {
    expect(extractIgUserId({})).toBeNull()
    expect(extractIgUserId({ instagram_business_account: {} })).toBeNull()
  })
})

// --- isValidImageUrl (pure) ------------------------------------------------

describe('isValidImageUrl', () => {
  it('accepts a well-formed https image URL', () => {
    expect(isValidImageUrl('https://example.com/photo.jpg')).toBe(true)
    expect(isValidImageUrl('https://example.com/dir/x.jpeg')).toBe(true)
    expect(isValidImageUrl('https://example.com/x.PNG')).toBe(true)
    expect(isValidImageUrl('https://example.com/x.jpg?cb=123')).toBe(true)
  })

  it('rejects empty, non-string, non-https and non-image-extension URLs', () => {
    expect(isValidImageUrl('')).toBe(false)
    expect(isValidImageUrl('   ')).toBe(false)
    expect(isValidImageUrl(undefined)).toBe(false)
    expect(isValidImageUrl(123)).toBe(false)
    expect(isValidImageUrl('http://example.com/photo.jpg')).toBe(false)
    expect(isValidImageUrl('https://example.com/photo.gif')).toBe(false)
    expect(isValidImageUrl('https://example.com/no-extension')).toBe(false)
    expect(isValidImageUrl('not a url')).toBe(false)
  })
})

// --- POST handler ----------------------------------------------------------

// Mock next/headers cookies() at module level; per-test override of the value.
let cookieStoreValue: { get: (n: string) => { value: string } | undefined }
vi.mock('next/headers', () => ({
  cookies: async () => cookieStoreValue,
}))

const AUTHED = {
  get: (n: string) =>
    n === 'meta_review_token' ? { value: 'usertoken' } : undefined,
}

async function loadRoute() {
  return import('../route')
}

function makePostRequest(body: unknown): Request {
  return new Request('https://tilltalk.ie/review/meta-bk2xp9/ig-publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /review/meta-bk2xp9/ig-publish — validation + auth', () => {
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
    const res = await POST(
      makePostRequest({ image_url: 'https://x.com/a.jpg', caption: 'hi' }),
    )
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body).toEqual({ ok: false, error: 'unauthenticated' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 invalid_image_url when image_url is empty', async () => {
    cookieStoreValue = AUTHED
    const { POST } = await loadRoute()
    const res = await POST(makePostRequest({ image_url: '', caption: 'hi' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_image_url')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 invalid_image_url for a non-https URL', async () => {
    cookieStoreValue = AUTHED
    const { POST } = await loadRoute()
    const res = await POST(
      makePostRequest({ image_url: 'http://x.com/a.jpg', caption: 'hi' }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_image_url')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 invalid_image_url for a non-image extension', async () => {
    cookieStoreValue = AUTHED
    const { POST } = await loadRoute()
    const res = await POST(
      makePostRequest({ image_url: 'https://x.com/a.gif', caption: 'hi' }),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('invalid_image_url')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns 400 caption_too_long when caption exceeds 2200 chars', async () => {
    cookieStoreValue = AUTHED
    const { POST } = await loadRoute()
    const res = await POST(
      makePostRequest({
        image_url: 'https://x.com/a.jpg',
        caption: 'a'.repeat(2201),
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('caption_too_long')
    expect(body.max_length).toBe(2200)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('POST /review/meta-bk2xp9/ig-publish — two-call publish flow', () => {
  beforeEach(() => {
    cookieStoreValue = AUTHED
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('returns 409 no_ig_account when the Page has no linked IG account', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/me/accounts')) {
        return jsonResponse(200, {
          data: [{ id: 'PAGE_ID', name: 'Bella Napoli', access_token: 'PAGETOK' }],
        })
      }
      // Page → instagram_business_account resolution: none linked.
      return jsonResponse(200, {})
    })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const { POST } = await loadRoute()
    const res = await POST(
      makePostRequest({ image_url: 'https://x.com/a.jpg', caption: 'hi' }),
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('no_ig_account')
    // me/accounts + page resolution only; never reached container/publish.
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const calledUrls = fetchMock.mock.calls.map((c) => c[0] as string)
    expect(calledUrls.some((u) => u.includes('/media'))).toBe(false)
  })

  it('does not call publish when the container step fails', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/me/accounts')) {
        return jsonResponse(200, {
          data: [{ id: 'PAGE_ID', name: 'Bella Napoli', access_token: 'PAGETOK' }],
        })
      }
      if (url.includes('/PAGE_ID') && !url.includes('/media')) {
        return jsonResponse(200, {
          instagram_business_account: { id: 'IGUSER' },
        })
      }
      if (url.endsWith('/IGUSER/media')) {
        return jsonResponse(400, {
          error: { message: 'bad image', code: 9004 },
        })
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const { POST } = await loadRoute()
    const res = await POST(
      makePostRequest({ image_url: 'https://x.com/a.jpg', caption: 'hi' }),
    )
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe('container_failed')
    // media_publish must never be called after a failed container.
    const calledUrls = fetchMock.mock.calls.map((c) => c[0] as string)
    expect(calledUrls.some((u) => u.includes('/media_publish'))).toBe(false)
  })

  it('publishes only after a successful container, passing the creation_id to step 4', async () => {
    const seenPublishBodies: string[] = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('/me/accounts')) {
        return jsonResponse(200, {
          data: [{ id: 'PAGE_ID', name: 'Bella Napoli', access_token: 'PAGETOK' }],
        })
      }
      if (url.includes('/PAGE_ID') && !url.includes('/media')) {
        return jsonResponse(200, {
          instagram_business_account: { id: 'IGUSER' },
        })
      }
      if (url.endsWith('/IGUSER/media')) {
        return jsonResponse(200, { id: 'CONTAINER_123' })
      }
      if (url.endsWith('/IGUSER/media_publish')) {
        seenPublishBodies.push(String(init?.body ?? ''))
        return jsonResponse(200, { id: 'MEDIA_999' })
      }
      throw new Error(`unexpected fetch: ${url}`)
    })
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    const { POST } = await loadRoute()
    const res = await POST(
      makePostRequest({
        image_url: 'https://x.com/a.jpg',
        caption: 'Fresh pizza',
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.request.creation_id).toBe('CONTAINER_123')
    expect(body.response).toEqual({ id: 'MEDIA_999' })

    // Ordering: container resolved before publish, and the creation_id from
    // step 3 is the one passed to step 4.
    const calledUrls = fetchMock.mock.calls.map((c) => c[0] as string)
    const containerIdx = calledUrls.findIndex((u) => u.endsWith('/IGUSER/media'))
    const publishIdx = calledUrls.findIndex((u) =>
      u.endsWith('/IGUSER/media_publish'),
    )
    expect(containerIdx).toBeGreaterThanOrEqual(0)
    expect(publishIdx).toBeGreaterThan(containerIdx)
    expect(seenPublishBodies).toHaveLength(1)
    expect(seenPublishBodies[0]).toContain('creation_id=CONTAINER_123')

    // No access token must appear anywhere in the returned JSON.
    expect(JSON.stringify(body)).not.toContain('PAGETOK')
    expect(JSON.stringify(body)).not.toContain('usertoken')
  })
})
