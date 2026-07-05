import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({ user: null as null | { id: string } }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
  }),
}))

async function loadRoute() {
  return await import('../route')
}

function req(): Request {
  return new Request('https://tilltalk.ie/api/photos/p1/queue', { method: 'POST' })
}

describe('POST /api/photos/[id]/queue', () => {
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
    const { POST } = await loadRoute()
    const res = await POST(req(), { params: Promise.resolve({ id: 'p1' }) })
    expect(res.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('forwards an authenticated queue to Railway with the session user id', async () => {
    h.user = { id: 'user-123' }
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await loadRoute()
    const res = await POST(req(), { params: Promise.resolve({ id: 'p1' }) })
    expect(res.status).toBe(200)

    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://railway.test/api/photos/p1/queue')
    const init = opts as RequestInit
    expect((init.headers as Record<string, string>)['X-Onboarding-Key']).toBe('test-key')
    expect(JSON.parse(init.body as string)).toEqual({ supabase_user_id: 'user-123' })
  })

  it('passes the tilltalk1 status through (e.g. 404 for another client\'s photo)', async () => {
    h.user = { id: 'user-123' }
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ error: 'Photo not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    ))
    vi.stubGlobal('fetch', fetchMock)

    const { POST } = await loadRoute()
    const res = await POST(req(), { params: Promise.resolve({ id: 'not-mine' }) })
    expect(res.status).toBe(404)
  })
})
