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
process.env.TIKTOK_OAUTH_STATE_SECRET = 'test-state-secret'

const { GET } = await import('../route')

type RedirectResult = {
  type: 'redirect'
  url: string
  status: number
  _cookies: Map<string, Record<string, unknown>>
}
type JsonResult = { type: 'json'; body: { error: string }; status: number }

describe('GET /oauth/tiktok/start', () => {
  afterEach(() => {
    process.env.TIKTOK_APP_ID             = 'test-app-id'
    process.env.TIKTOK_OAUTH_STATE_SECRET = 'test-state-secret'
  })

  it('returns 500 server_misconfigured when TIKTOK_OAUTH_STATE_SECRET is unset', async () => {
    delete process.env.TIKTOK_OAUTH_STATE_SECRET
    const result = (await GET()) as unknown as JsonResult
    expect(result.status).toBe(500)
    expect(result.body).toEqual({ error: 'server_misconfigured' })
  })

  it('returns 500 server_misconfigured when TIKTOK_APP_ID is unset', async () => {
    delete process.env.TIKTOK_APP_ID
    const result = (await GET()) as unknown as JsonResult
    expect(result.status).toBe(500)
    expect(result.body).toEqual({ error: 'server_misconfigured' })
  })

  it('redirects to the advertiser portal auth URL with signed state and a matching cookie', async () => {
    const result = (await GET()) as unknown as RedirectResult
    expect(result.status).toBe(302)
    expect(result.url).toContain('https://business-api.tiktok.com/portal/auth')
    expect(result.url).toContain('app_id=test-app-id')

    // The redirect_uri must be byte-identical to the registered advertiser URL.
    expect(result.url).toContain(
      'redirect_uri=https%3A%2F%2Ftilltalk.ie%2Foauth%2Ftiktok%2Fcallback',
    )

    const stateMatch = result.url.match(/[?&]state=([^&]+)/)
    expect(stateMatch).not.toBeNull()
    const state = decodeURIComponent(stateMatch![1])
    expect(state).toMatch(/^[0-9a-f-]{36}\.[A-Za-z0-9_-]+$/)

    const cookie = result._cookies.get('tiktok_oauth_state')
    expect(cookie).toBeDefined()
    expect(cookie!.value).toBe(state)
    expect(cookie!.httpOnly).toBe(true)
    expect(cookie!.secure).toBe(true)
    expect(cookie!.sameSite).toBe('lax')
    expect(cookie!.path).toBe('/oauth/tiktok')
    expect(cookie!.maxAge).toBe(600)
  })

  it('never puts the app secret in the authorization URL', async () => {
    process.env.TIKTOK_APP_SECRET = 'super-secret-value'
    const result = (await GET()) as unknown as RedirectResult
    expect(result.url).not.toContain('super-secret-value')
    expect(result.url).not.toContain('secret=')
  })

  it('generates a fresh state on every call', async () => {
    const r1 = (await GET()) as unknown as RedirectResult
    const r2 = (await GET()) as unknown as RedirectResult
    const s1 = decodeURIComponent(r1.url.match(/[?&]state=([^&]+)/)![1])
    const s2 = decodeURIComponent(r2.url.match(/[?&]state=([^&]+)/)![1])
    expect(s1).not.toBe(s2)
  })
})
