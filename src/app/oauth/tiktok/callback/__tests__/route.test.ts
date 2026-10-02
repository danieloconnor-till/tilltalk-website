import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock next/server before importing the route (mirrors the Clover OAuth tests).
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
        return { type: 'redirect', url, status: 302, cookies: jar.api, _cookies: jar.store }
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
process.env.TIKTOK_APP_ID             = 'test-app-id'
process.env.TIKTOK_APP_SECRET         = 'test-app-secret'
process.env.TIKTOK_OAUTH_STATE_SECRET = 'test-state-secret'
process.env.TILLTALK1_BASE_URL        = 'https://railway.test'
process.env.TILLTALK1_ONBOARDING_KEY  = 'test-onboarding-key'

const { GET } = await import('../route')
const { buildSignedState } = await import('../../_state')

const ACCESS_TOKEN = 'tiktok-advertiser-token-must-not-leak-123456'
const AUTH_CODE    = 'auth-code-must-not-leak-abcdef'

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

function makeRequest(params: Record<string, string>, cookies?: Record<string, string>) {
  const url = new URL('https://tilltalk.ie/oauth/tiktok/callback')
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
  const cookie = result._cookies.get('tiktok_oauth_state')
  expect(cookie).toBeDefined()
  expect(cookie!._deleted).toBe(true)
  expect(cookie!.path).toBe('/oauth/tiktok')
}

/** Every console.* argument this route emitted, flattened to one string. */
function captureConsole() {
  const lines: string[] = []
  const record = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
  }
  const spies = [
    vi.spyOn(console, 'log').mockImplementation(record),
    vi.spyOn(console, 'warn').mockImplementation(record),
    vi.spyOn(console, 'error').mockImplementation(record),
  ]
  return { lines, restore: () => spies.forEach((s) => s.mockRestore()) }
}

describe('GET /oauth/tiktok/callback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.restoreAllMocks()
    process.env.TIKTOK_OAUTH_STATE_SECRET = 'test-state-secret'
  })

  // ------------------------------------------------------------------ state

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
  })

  it('returns 400 missing_state when cookie is present but state query is missing', async () => {
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({}, { tiktok_oauth_state: state }),
    )) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'missing_state' })
  })

  it('returns 400 invalid_state when state and cookie do not match', async () => {
    const state = buildSignedState('test-state-secret')
    const other = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state }, { tiktok_oauth_state: other }),
    )) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'invalid_state' })
  })

  it('returns 400 invalid_state when the HMAC signature is tampered', async () => {
    const valid = buildSignedState('test-state-secret')
    const idx = valid.indexOf('.')
    const sig = valid.slice(idx + 1)
    const tampered = valid.slice(0, idx + 1) + (sig.startsWith('A') ? 'B' : 'A') + sig.slice(1)
    const result = (await GET(
      makeRequest({ state: tampered }, { tiktok_oauth_state: tampered }),
    )) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'invalid_state' })
  })

  it('returns 500 server_misconfigured when TIKTOK_OAUTH_STATE_SECRET is unset', async () => {
    delete process.env.TIKTOK_OAUTH_STATE_SECRET
    const result = (await GET(makeRequest({}))) as unknown as JsonResult
    expect(result.status).toBe(500)
    expect(result.body).toEqual({ error: 'server_misconfigured' })
  })

  // ------------------------------------------------------------- missing code

  it('redirects to /welcome?error=missing_params when state is valid but auth_code is absent', async () => {
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state }, { tiktok_oauth_state: state }),
    )) as unknown as RedirectResult
    expect(result.url).toContain('/welcome')
    expect(result.url).toContain('error=missing_params')
    expectCookieCleared(result)
  })

  // ---------------------------------------------------------------- success

  it('exchanges the code, POSTs the expected body to Railway, and logs no token', async () => {
    const mockFetch = vi
      .fn()
      // token exchange
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          message: 'OK',
          // The advertiser response carries no refresh_token and no expires_in:
          // this token is long-lived. Absence is the assertion.
          data: {
            access_token: ACCESS_TOKEN,
            advertiser_ids: ['7643575841385021458'],
            scope: [4, 5],
          },
        }),
      })
      // Railway storage
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'ok' })
    vi.stubGlobal('fetch', mockFetch)

    const cap = captureConsole()
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state, auth_code: AUTH_CODE }, { tiktok_oauth_state: state }),
    )) as unknown as RedirectResult
    cap.restore()

    expect(result.url).toContain('tiktok=connected')
    expect(result.url).not.toContain('error=')
    expectCookieCleared(result)

    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Railway call: URL, auth header, and body shape.
    const [railwayUrl, railwayInit] = mockFetch.mock.calls[1] as [string, RequestInit]
    expect(railwayUrl).toBe('https://railway.test/api/onboard/tiktok')
    expect((railwayInit.headers as Record<string, string>)['X-Onboarding-Key']).toBe(
      'test-onboarding-key',
    )
    expect(JSON.parse(railwayInit.body as string)).toEqual({
      client_id: 11,
      access_token: ACCESS_TOKEN,
      advertiser_ids: ['7643575841385021458'],
      refresh_token: null,
      expires_in: null,
      scopes: '4,5',
      oauth_app_id: 'test-app-id',
    })

    // Nothing token-shaped anywhere in the logs, and no auth_code either.
    const logged = cap.lines.join('\n')
    expect(logged).not.toContain(ACCESS_TOKEN)
    expect(logged).not.toContain(AUTH_CODE)
    // The redirect must not echo them either.
    expect(result.url).not.toContain(ACCESS_TOKEN)
    expect(result.url).not.toContain(AUTH_CODE)
  })

  it('forwards refresh_token and expires_in when TikTok does send them', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          data: {
            access_token: ACCESS_TOKEN,
            advertiser_ids: [],
            refresh_token: 'refresh-abc',
            expires_in: 86400,
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'ok' })
    vi.stubGlobal('fetch', mockFetch)

    const state = buildSignedState('test-state-secret')
    await GET(makeRequest({ state, auth_code: AUTH_CODE }, { tiktok_oauth_state: state }))

    const body = JSON.parse((mockFetch.mock.calls[1][1] as RequestInit).body as string)
    expect(body.refresh_token).toBe('refresh-abc')
    expect(body.expires_in).toBe(86400)
  })

  it('forwards scopes as null when TikTok sends no scope list', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 0, data: { access_token: ACCESS_TOKEN, advertiser_ids: [] } }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'ok' })
    vi.stubGlobal('fetch', mockFetch)

    const state = buildSignedState('test-state-secret')
    await GET(makeRequest({ state, auth_code: AUTH_CODE }, { tiktok_oauth_state: state }))

    const body = JSON.parse((mockFetch.mock.calls[1][1] as RequestInit).body as string)
    expect(body.scopes).toBeNull()
  })

  // ----------------------------------------------------------------- failure

  it('redirects to /welcome?error=token_exchange_failed on a non-OK exchange, logging no body', async () => {
    const textSpy = vi.fn(async () => `{"access_token":"${ACCESS_TOKEN}"}`)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: textSpy,
        json: async () => ({ code: 40001, message: 'auth_code expired' }),
      }),
    )

    const cap = captureConsole()
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state, auth_code: 'bad' }, { tiktok_oauth_state: state }),
    )) as unknown as RedirectResult
    cap.restore()

    expect(result.url).toContain('error=token_exchange_failed')
    // The raw body is never read, so it can never be logged.
    expect(textSpy).not.toHaveBeenCalled()
    const logged = cap.lines.join('\n')
    expect(logged).not.toContain(ACCESS_TOKEN)
    expect(logged).toContain('auth_code expired')
  })

  it('still succeeds (non-fatal) when Railway storage fails, logging no response body', async () => {
    const railwayText = vi.fn(async () => `leaked ${ACCESS_TOKEN}`)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ code: 0, data: { access_token: ACCESS_TOKEN, advertiser_ids: [] } }),
        })
        .mockResolvedValueOnce({ ok: false, status: 404, text: railwayText }),
    )

    const cap = captureConsole()
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state, auth_code: AUTH_CODE }, { tiktok_oauth_state: state }),
    )) as unknown as RedirectResult
    cap.restore()

    expect(result.url).toContain('tiktok=connected')
    expect(railwayText).not.toHaveBeenCalled()
    expect(cap.lines.join('\n')).not.toContain(ACCESS_TOKEN)
  })
})
