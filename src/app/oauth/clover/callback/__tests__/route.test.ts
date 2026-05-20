import { describe, it, expect, vi, beforeEach } from 'vitest'

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
process.env.CLOVER_APP_ID                = 'test-app-id'
process.env.CLOVER_APP_SECRET            = 'test-app-secret'
process.env.CLOVER_API_BASE              = 'https://api.eu.clover.com'
process.env.RAILWAY_ONBOARDING_URL       = 'https://railway.test'
process.env.ONBOARDING_API_KEY           = 'test-onboarding-key'
process.env.CLOVER_OAUTH_STATE_SECRET    = 'test-state-secret'

const { GET } = await import('../route')
const { buildSignedState } = await import('../../_state')

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
  _cookies: Map<string, Record<string, unknown>>
}

function makeRequest(
  params: Record<string, string>,
  cookies?: Record<string, string>,
) {
  const url = new URL('https://tilltalk.ie/oauth/clover/callback')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const headers: Record<string, string> = {}
  if (cookies) {
    headers.cookie = Object.entries(cookies)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('; ')
  }
  return new Request(url.toString(), { headers })
}

function expectCookieCleared(result: { _cookies: Map<string, Record<string, unknown>> }) {
  const cookie = result._cookies.get('clover_oauth_state')
  expect(cookie).toBeDefined()
  expect(cookie!._deleted).toBe(true)
  expect(cookie!.path).toBe('/oauth/clover')
}

describe('GET /oauth/clover/callback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  it('returns 400 missing_state when neither state nor cookie is present', async () => {
    const result = (await GET(makeRequest({}))) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'missing_state' })
    expectCookieCleared(result)
  })

  it('returns 400 missing_state when state query is present but cookie is missing', async () => {
    const state = buildSignedState('test-state-secret')
    const result = (await GET(makeRequest({ state }))) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'missing_state' })
    expectCookieCleared(result)
  })

  it('returns 400 missing_state when cookie is present but state query is missing', async () => {
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({}, { clover_oauth_state: state }),
    )) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'missing_state' })
    expectCookieCleared(result)
  })

  it('returns 400 invalid_state when state and cookie do not match', async () => {
    const state = buildSignedState('test-state-secret')
    const otherState = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state }, { clover_oauth_state: otherState }),
    )) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'invalid_state' })
    expectCookieCleared(result)
  })

  it('returns 400 invalid_state when HMAC signature is tampered', async () => {
    const valid = buildSignedState('test-state-secret')
    // Flip a character in the signature half
    const idx = valid.indexOf('.')
    const sig = valid.slice(idx + 1)
    const tampered =
      valid.slice(0, idx + 1) + (sig.startsWith('A') ? 'B' : 'A') + sig.slice(1)
    const result = (await GET(
      makeRequest({ state: tampered }, { clover_oauth_state: tampered }),
    )) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'invalid_state' })
    expectCookieCleared(result)
  })

  it('returns 500 server_misconfigured when CLOVER_OAUTH_STATE_SECRET is unset', async () => {
    delete process.env.CLOVER_OAUTH_STATE_SECRET
    try {
      const result = (await GET(makeRequest({}))) as unknown as JsonResult
      expect(result.status).toBe(500)
      expect(result.body).toEqual({ error: 'server_misconfigured' })
    } finally {
      process.env.CLOVER_OAUTH_STATE_SECRET = 'test-state-secret'
    }
  })

  it('redirects to /welcome?error=missing_params when state is valid but other params are absent', async () => {
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state }, { clover_oauth_state: state }),
    )) as unknown as RedirectResult
    expect(result.url).toContain('error=missing_params')
    expectCookieCleared(result)
  })

  it('redirects to /welcome?merchant_id=... on success', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'clover-token-123',
          refresh_token: 'ref',
          expires_in: 3600,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      })
    vi.stubGlobal('fetch', mockFetch)

    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest(
        {
          merchant_id: 'MERCH1',
          employee_id: 'EMP1',
          client_id: 'test-app-id',
          code: 'auth-code-xyz',
          state,
        },
        { clover_oauth_state: state },
      ),
    )) as unknown as RedirectResult

    expect(result.url).toContain('merchant_id=MERCH1')
    expect(result.url).not.toContain('error=')
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expectCookieCleared(result)
  })

  it('redirects to /welcome?error=token_exchange_failed when Clover returns error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'bad_code',
      }),
    )

    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest(
        {
          merchant_id: 'MERCH1',
          employee_id: 'EMP1',
          client_id: 'test-app-id',
          code: 'bad-code',
          state,
        },
        { clover_oauth_state: state },
      ),
    )) as unknown as RedirectResult

    expect(result.url).toContain('error=token_exchange_failed')
    expectCookieCleared(result)
  })

  it('redirects to /welcome?error=storage_failed when Railway fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'tok' }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ message: 'not found' }),
        }),
    )

    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest(
        {
          merchant_id: 'MERCH1',
          employee_id: 'EMP1',
          client_id: 'test-app-id',
          code: 'code',
          state,
        },
        { clover_oauth_state: state },
      ),
    )) as unknown as RedirectResult

    expect(result.url).toContain('error=storage_failed')
    expectCookieCleared(result)
  })
})
