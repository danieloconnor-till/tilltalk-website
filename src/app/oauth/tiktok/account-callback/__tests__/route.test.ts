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

process.env.TIKTOK_APP_ID             = 'test-app-id'
process.env.TIKTOK_APP_SECRET         = 'test-app-secret'
process.env.TIKTOK_OAUTH_STATE_SECRET = 'test-state-secret'
process.env.RAILWAY_ONBOARDING_URL    = 'https://railway.test'
process.env.ONBOARDING_API_KEY        = 'test-onboarding-key'

const { GET } = await import('../route')
const { buildSignedState } = await import('../../_state')

const ACCESS_TOKEN  = 'tiktok-account-token-must-not-leak-123456'
const REFRESH_TOKEN = 'tiktok-account-refresh-must-not-leak-654321'
const AUTH_CODE     = 'account-code-must-not-leak-abcdef'
const COOKIE        = 'tiktok_account_oauth_state'

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
  const url = new URL('https://tilltalk.ie/oauth/tiktok/account-callback')
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
  const cookie = result._cookies.get(COOKIE)
  expect(cookie).toBeDefined()
  expect(cookie!._deleted).toBe(true)
  expect(cookie!.path).toBe('/oauth/tiktok')
}

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

describe('GET /oauth/tiktok/account-callback', () => {
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
    const result = (await GET(makeRequest({}, { [COOKIE]: state }))) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'missing_state' })
  })

  it('returns 400 invalid_state when state and cookie do not match', async () => {
    const state = buildSignedState('test-state-secret')
    const other = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state }, { [COOKIE]: other }),
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
      makeRequest({ state: tampered }, { [COOKIE]: tampered }),
    )) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'invalid_state' })
  })

  it('ignores the advertiser flow cookie — the two flows do not share state', async () => {
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state }, { tiktok_oauth_state: state }),
    )) as unknown as JsonResult
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'missing_state' })
  })

  it('returns 500 server_misconfigured when TIKTOK_OAUTH_STATE_SECRET is unset', async () => {
    delete process.env.TIKTOK_OAUTH_STATE_SECRET
    const result = (await GET(makeRequest({}))) as unknown as JsonResult
    expect(result.status).toBe(500)
    expect(result.body).toEqual({ error: 'server_misconfigured' })
  })

  // ------------------------------------------------------------- missing code

  it('redirects to /welcome?error=missing_params when state is valid but code is absent', async () => {
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state }, { [COOKIE]: state }),
    )) as unknown as RedirectResult
    expect(result.url).toContain('/welcome')
    expect(result.url).toContain('error=missing_params')
    expectCookieCleared(result)
  })

  // ---------------------------------------------------------------- success

  it('exchanges at the tt_user endpoint, POSTs the expected body, and logs no token', async () => {
    const mockFetch = vi
      .fn()
      // token exchange — the account-holder shape: short access token, 1y refresh,
      // and the open_id that later doubles as business_id.
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          message: 'OK',
          data: {
            access_token: ACCESS_TOKEN,
            refresh_token: REFRESH_TOKEN,
            expires_in: 86400,
            refresh_token_expires_in: 31536000,
            open_id: 'open-id-bella-napoli',
            scope: ['user.info.basic', 'biz.spark.auth'],
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'ok' })
    vi.stubGlobal('fetch', mockFetch)

    const cap = captureConsole()
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state, code: AUTH_CODE }, { [COOKIE]: state }),
    )) as unknown as RedirectResult
    cap.restore()

    expect(result.url).toContain('tiktok_account=connected')
    expect(result.url).not.toContain('error=')
    expectCookieCleared(result)

    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Exchange call: the account-holder endpoint, replaying the registered
    // redirect_uri byte for byte.
    const [tokenUrl, tokenInit] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(tokenUrl).toBe('https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/')
    expect(JSON.parse(tokenInit.body as string)).toEqual({
      client_id: 'test-app-id',
      client_secret: 'test-app-secret',
      auth_code: AUTH_CODE,
      grant_type: 'authorization_code',
      redirect_uri: 'https://tilltalk.ie/oauth/tiktok/account-callback',
    })

    // Railway call: URL, auth header, and body shape.
    const [railwayUrl, railwayInit] = mockFetch.mock.calls[1] as [string, RequestInit]
    expect(railwayUrl).toBe('https://railway.test/api/onboard/tiktok-account')
    expect((railwayInit.headers as Record<string, string>)['X-Onboarding-Key']).toBe(
      'test-onboarding-key',
    )
    expect(JSON.parse(railwayInit.body as string)).toEqual({
      client_id: 11,
      access_token: ACCESS_TOKEN,
      refresh_token: REFRESH_TOKEN,
      expires_in: 86400,
      refresh_token_expires_in: 31536000,
      open_id: 'open-id-bella-napoli',
      scopes: 'user.info.basic,biz.spark.auth',
      oauth_app_id: 'test-app-id',
    })

    // Neither token nor code reaches a log line or the redirect URL.
    const logged = cap.lines.join('\n')
    for (const secret of [ACCESS_TOKEN, REFRESH_TOKEN, AUTH_CODE]) {
      expect(logged).not.toContain(secret)
      expect(result.url).not.toContain(secret)
    }
    // Nor does the open_id, which is an account identifier, not a credential —
    // still not worth putting in a URL the browser keeps.
    expect(result.url).not.toContain('open-id-bella-napoli')
  })

  it('accepts auth_code as an alias for code', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ code: 0, data: { access_token: ACCESS_TOKEN, open_id: 'oid' } }),
        })
        .mockResolvedValueOnce({ ok: true, status: 200, text: async () => 'ok' }),
    )
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state, auth_code: AUTH_CODE }, { [COOKIE]: state }),
    )) as unknown as RedirectResult
    expect(result.url).toContain('tiktok_account=connected')
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
      makeRequest({ state, code: 'bad' }, { [COOKIE]: state }),
    )) as unknown as RedirectResult
    cap.restore()

    expect(result.url).toContain('error=token_exchange_failed')
    expect(textSpy).not.toHaveBeenCalled()
    expect(cap.lines.join('\n')).not.toContain(ACCESS_TOKEN)
  })

  it('redirects to /welcome?error=token_exchange_failed when the response carries no token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ code: 40105, message: 'Authorization failed', data: {} }),
      }),
    )
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state, code: AUTH_CODE }, { [COOKIE]: state }),
    )) as unknown as RedirectResult
    expect(result.url).toContain('error=token_exchange_failed')
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
          json: async () => ({ code: 0, data: { access_token: ACCESS_TOKEN, open_id: 'oid' } }),
        })
        .mockResolvedValueOnce({ ok: false, status: 404, text: railwayText }),
    )

    const cap = captureConsole()
    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest({ state, code: AUTH_CODE }, { [COOKIE]: state }),
    )) as unknown as RedirectResult
    cap.restore()

    expect(result.url).toContain('tiktok_account=connected')
    expect(railwayText).not.toHaveBeenCalled()
    expect(cap.lines.join('\n')).not.toContain(ACCESS_TOKEN)
  })
})
