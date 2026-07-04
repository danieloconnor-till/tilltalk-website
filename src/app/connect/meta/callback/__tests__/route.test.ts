import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock next/headers cookies() — supports get + set; set calls are captured so
// we can assert the token never lands in a cookie.
let cookieState: string | undefined
let setCalls: { name: string; value: string }[]
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (n: string) =>
      n === 'meta_connect_state' && cookieState !== undefined
        ? { value: cookieState }
        : undefined,
    set: (name: string, value: string) => {
      setCalls.push({ name, value })
    },
  }),
}))

async function loadRoute() {
  return await import('../route')
}

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}
function failJson(status: number, body: unknown = {}) {
  return { ok: false, status, json: async () => body }
}

function setEnv() {
  vi.stubEnv('META_REVIEW_APP_ID', 'appid')
  vi.stubEnv('META_REVIEW_APP_SECRET', 'appsecret')
  vi.stubEnv('META_CONNECT_REDIRECT_URI', 'https://tilltalk.ie/connect/meta/callback')
  vi.stubEnv('TILLTALK1_BASE_URL', 'https://tilltalk1.example')
  vi.stubEnv('TILLTALK1_ONBOARDING_KEY', 'onboard-secret')
}

function makeCallback(query: Record<string, string>): Request {
  const u = new URL('https://tilltalk.ie/connect/meta/callback')
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v)
  return new Request(u.toString())
}

// Happy fetch: routes by URL through the full exchange → identity → deposit chain.
function happyFetch() {
  return vi.fn(async (input: string) => {
    const url = String(input)
    if (url.includes('fb_exchange_token')) return okJson({ access_token: 'LONGTOKEN', expires_in: 5183944 })
    if (url.includes('/oauth/access_token')) return okJson({ access_token: 'SHORTTOKEN' })
    if (url.includes('/me/permissions'))
      return okJson({
        data: [
          { permission: 'ads_management', status: 'granted' },
          { permission: 'business_management', status: 'granted' },
          { permission: 'pages_messaging', status: 'declined' },
        ],
      })
    if (url.includes('/me')) return okJson({ id: 'fb123', name: 'Antonio' })
    if (url.includes('/internal/meta-oauth-token')) return okJson({ stored: true })
    throw new Error('unexpected fetch: ' + url)
  })
}

describe('GET /connect/meta/callback', () => {
  beforeEach(() => {
    cookieState = 'STATE123'
    setCalls = []
    setEnv()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('redirects to error with invalid_state on a state mismatch', async () => {
    vi.stubGlobal('fetch', happyFetch())
    const { GET } = await loadRoute()
    const res = await GET(makeCallback({ code: 'c', state: 'WRONG' }))
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('/connect/meta/error')
    expect(loc).toContain('reason=invalid_state')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('redirects to missing_config when a required env var is unset', async () => {
    vi.stubEnv('TILLTALK1_ONBOARDING_KEY', '') // unset one
    vi.stubGlobal('fetch', happyFetch())
    const { GET } = await loadRoute()
    const res = await GET(makeCallback({ code: 'c', state: 'STATE123' }))
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('reason=missing_config')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('redirects to long_lived_exchange_failed when the long-lived exchange fails', async () => {
    const f = vi.fn(async (input: string) => {
      const url = String(input)
      if (url.includes('fb_exchange_token')) return failJson(400, { error: { message: 'bad token' } })
      if (url.includes('/oauth/access_token')) return okJson({ access_token: 'SHORTTOKEN' })
      throw new Error('unexpected fetch: ' + url)
    })
    vi.stubGlobal('fetch', f)
    const { GET } = await loadRoute()
    const res = await GET(makeCallback({ code: 'c', state: 'STATE123' }))
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('reason=long_lived_exchange_failed')
    // tilltalk1 must not be hit when the long-lived exchange failed.
    expect(f.mock.calls.every(([u]) => !String(u).includes('/internal/meta-oauth-token'))).toBe(true)
  })

  it('on success POSTs to tilltalk1 with the header and never sets a token cookie', async () => {
    const f = happyFetch()
    vi.stubGlobal('fetch', f)
    const { GET } = await loadRoute()
    const res = await GET(makeCallback({ code: 'c', state: 'STATE123' }))

    // Success redirect back to the connect page.
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('/connect/meta')
    expect(loc).toContain('connected=1')
    expect(loc).toContain('name=Antonio')
    expect(loc).toContain('scopes=ads_management%2Cbusiness_management')

    // The server-side deposit call carries the auth header and the right body.
    const deposit = f.mock.calls.find(([u]) => String(u).includes('/internal/meta-oauth-token'))
    expect(deposit).toBeTruthy()
    const [, init] = deposit as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['X-Onboarding-Key']).toBe('onboard-secret')
    const body = JSON.parse(init.body as string)
    expect(body.client_id).toBe(11)
    expect(body.access_token).toBe('LONGTOKEN')
    expect(body.fb_user_id).toBe('fb123')
    expect(body.scopes).toBe('ads_management,business_management')
    expect(body.expires_in).toBe(5183944)

    // The token never touches a cookie — only the single-use state clear.
    expect(setCalls.every((c) => c.name === 'meta_connect_state')).toBe(true)
    expect(setCalls.some((c) => c.value === 'LONGTOKEN' || c.value === 'SHORTTOKEN')).toBe(false)
  })
})
