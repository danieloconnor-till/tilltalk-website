import { describe, it, expect, vi, afterEach } from 'vitest'

// Mock next/server before importing the route
vi.mock('next/server', () => {
  function makeCookieJar() {
    const store = new Map<string, Record<string, unknown>>()
    return {
      store,
      api: {
        set: (
          input: string | Record<string, unknown>,
          value?: string,
          opts?: Record<string, unknown>,
        ) => {
          if (typeof input === 'string') {
            store.set(input, { name: input, value, ...(opts ?? {}) })
          } else {
            store.set(input.name as string, input)
          }
        },
        delete: (input: string | { name: string; path?: string }) => {
          const name = typeof input === 'string' ? input : input.name
          store.set(name, {
            name,
            value: '',
            maxAge: 0,
            path: typeof input === 'object' ? input.path : undefined,
            _deleted: true,
          })
        },
      },
    }
  }
  return {
    NextResponse: {
      redirect: (url: string) => {
        const jar = makeCookieJar()
        return {
          type: 'redirect',
          url,
          status: 302,
          cookies: jar.api,
          _cookies: jar.store,
        }
      },
      json: (body: unknown, init?: { status?: number }) => {
        const jar = makeCookieJar()
        return {
          type: 'json',
          body,
          status: init?.status ?? 200,
          cookies: jar.api,
          _cookies: jar.store,
        }
      },
    },
  }
})

// Set required env vars before importing the route
process.env.CLOVER_SANDBOX_APP_ID       = 'sandbox-app-id'
process.env.CLOVER_APP_ID               = 'prod-app-id'
process.env.CLOVER_OAUTH_STATE_SECRET   = 'test-state-secret'

const { GET } = await import('../route')

type RedirectResult = {
  type: 'redirect'
  url: string
  status: number
  _cookies: Map<string, Record<string, unknown>>
}
type JsonResult = {
  type: 'json'
  body: { error: string }
  status: number
}

describe('GET /oauth/clover/start', () => {
  afterEach(() => {
    // Keep secret available for other tests; the missing-secret test sets+unsets it itself.
    process.env.CLOVER_OAUTH_STATE_SECRET = 'test-state-secret'
  })

  function makeRequest(params: Record<string, string>) {
    const url = new URL('https://tilltalk.ie/oauth/clover/start')
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return new Request(url.toString())
  }

  it('returns 400 missing_params when client_id is absent', async () => {
    const result = (await GET(makeRequest({ merchant_id: 'M1' }))) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'missing_params' })
  })

  it('returns 400 missing_params when merchant_id is absent', async () => {
    const result = (await GET(
      makeRequest({ client_id: 'sandbox-app-id' }),
    )) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'missing_params' })
  })

  it('returns 400 unknown_client_id when client_id matches no configured app', async () => {
    const result = (await GET(
      makeRequest({ client_id: 'bogus', merchant_id: 'M1' }),
    )) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'unknown_client_id' })
  })

  it('returns 500 server_misconfigured when CLOVER_OAUTH_STATE_SECRET is unset', async () => {
    delete process.env.CLOVER_OAUTH_STATE_SECRET
    try {
      const result = (await GET(
        makeRequest({ client_id: 'sandbox-app-id', merchant_id: 'M1' }),
      )) as unknown as JsonResult
      expect(result.status).toBe(500)
      expect(result.body).toEqual({ error: 'server_misconfigured' })
    } finally {
      process.env.CLOVER_OAUTH_STATE_SECRET = 'test-state-secret'
    }
  })

  it('redirects to sandbox authorize URL with signed state and matching cookie', async () => {
    const result = (await GET(
      makeRequest({ client_id: 'sandbox-app-id', merchant_id: 'M1' }),
    )) as unknown as RedirectResult
    expect(result.status).toBe(302)
    expect(result.url).toContain('https://sandbox.dev.clover.com/oauth/v2/authorize')
    expect(result.url).toContain('client_id=sandbox-app-id')
    expect(result.url).toContain('merchant_id=M1')
    expect(result.url).toContain(
      'redirect_uri=https%3A%2F%2Ftilltalk.ie%2Foauth%2Fclover%2Fcallback',
    )
    // state query param present and matches <uuid>.<base64url>
    const stateMatch = result.url.match(/[?&]state=([^&]+)/)
    expect(stateMatch).not.toBeNull()
    const state = decodeURIComponent(stateMatch![1])
    expect(state).toMatch(/^[0-9a-f-]{36}\.[A-Za-z0-9_-]+$/)
    // cookie set with same value
    const cookie = result._cookies.get('clover_oauth_state')
    expect(cookie).toBeDefined()
    expect(cookie!.value).toBe(state)
    expect(cookie!.httpOnly).toBe(true)
    expect(cookie!.secure).toBe(true)
    expect(cookie!.sameSite).toBe('lax')
    expect(cookie!.path).toBe('/oauth/clover')
    expect(cookie!.maxAge).toBe(600)
  })

  it('redirects to production authorize URL with signed state when client_id is the prod app', async () => {
    const result = (await GET(
      makeRequest({ client_id: 'prod-app-id', merchant_id: 'M2' }),
    )) as unknown as RedirectResult
    expect(result.status).toBe(302)
    expect(result.url).toContain('https://www.clover.com/oauth/v2/authorize')
    expect(result.url).toContain('client_id=prod-app-id')
    expect(result.url).toContain('merchant_id=M2')
    const stateMatch = result.url.match(/[?&]state=([^&]+)/)
    expect(stateMatch).not.toBeNull()
    expect(decodeURIComponent(stateMatch![1])).toMatch(
      /^[0-9a-f-]{36}\.[A-Za-z0-9_-]+$/,
    )
  })

  it('forwards employee_id when present', async () => {
    const result = (await GET(
      makeRequest({
        client_id: 'sandbox-app-id',
        merchant_id: 'M1',
        employee_id: 'E1',
      }),
    )) as unknown as RedirectResult
    expect(result.url).toContain('employee_id=E1')
  })

  it('omits employee_id when absent', async () => {
    const result = (await GET(
      makeRequest({ client_id: 'sandbox-app-id', merchant_id: 'M1' }),
    )) as unknown as RedirectResult
    expect(result.url).not.toContain('employee_id=')
  })

  it('generates a fresh state on every call', async () => {
    const r1 = (await GET(
      makeRequest({ client_id: 'sandbox-app-id', merchant_id: 'M1' }),
    )) as unknown as RedirectResult
    const r2 = (await GET(
      makeRequest({ client_id: 'sandbox-app-id', merchant_id: 'M1' }),
    )) as unknown as RedirectResult
    const s1 = decodeURIComponent(r1.url.match(/[?&]state=([^&]+)/)![1])
    const s2 = decodeURIComponent(r2.url.match(/[?&]state=([^&]+)/)![1])
    expect(s1).not.toBe(s2)
  })
})
