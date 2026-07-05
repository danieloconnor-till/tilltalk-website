import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mutable session user, mirrored by the mocked Supabase server client.
const h = vi.hoisted(() => ({ user: null as null | { id: string } }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
  }),
}))

async function loadRoute() {
  return await import('../route')
}

describe('GET /api/photos', () => {
  beforeEach(() => {
    h.user = null
    vi.stubEnv('RAILWAY_ONBOARDING_URL', 'https://railway.test')
    vi.stubEnv('ONBOARDING_API_KEY', 'test-key')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('rejects an unauthenticated request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { GET } = await loadRoute()
    const res = await GET()
    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards an authenticated request with the key header and returns the JSON', async () => {
    h.user = { id: 'user-123' }
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ photos: [{ id: 'p1' }], count: 1 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    const { GET } = await loadRoute()
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(1)

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://railway.test/api/photos?supabase_user_id=user-123')
    expect((opts as RequestInit).headers).toMatchObject({ 'X-Onboarding-Key': 'test-key' })
  })
})

describe('POST /api/photos', () => {
  beforeEach(() => {
    h.user = null
    vi.stubEnv('RAILWAY_ONBOARDING_URL', 'https://railway.test')
    vi.stubEnv('ONBOARDING_API_KEY', 'test-key')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  function multipart(file: File): Request {
    const form = new FormData()
    form.append('photo', file, file.name)
    return new Request('https://tilltalk.ie/api/photos', { method: 'POST', body: form })
  }

  it('rejects an unauthenticated upload', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { POST } = await loadRoute()
    const res = await POST(multipart(new File([new Uint8Array(10)], 'x.jpg', { type: 'image/jpeg' })))
    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an oversize upload with a clean error and never calls Railway', async () => {
    h.user = { id: 'user-123' }
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' })
    const { POST } = await loadRoute()
    const res = await POST(multipart(big))
    expect(res.status).toBe(413)
    const body = await res.json()
    expect(body.error).toContain('4MB')
    expect(body.error).toContain('WhatsApp')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards an in-size upload to Railway with the session user id', async () => {
    h.user = { id: 'user-123' }
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ id: 'new1', url: 'https://signed/new1.jpg' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    const ok = new File([new Uint8Array(1024)], 'ok.jpg', { type: 'image/jpeg' })
    const { POST } = await loadRoute()
    const res = await POST(multipart(ok))
    expect(res.status).toBe(201)

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://railway.test/api/photos')
    const init = opts as RequestInit
    expect((init.headers as Record<string, string>)['X-Onboarding-Key']).toBe('test-key')
    // Body is multipart carrying the session-derived client id.
    const sent = init.body as FormData
    expect(sent.get('supabase_user_id')).toBe('user-123')
    expect(sent.get('photo')).toBeInstanceOf(File)
  })
})
