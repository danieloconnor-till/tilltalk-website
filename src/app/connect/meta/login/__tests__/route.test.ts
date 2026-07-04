import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

let setCalls: { name: string; value: string }[]
vi.mock('next/headers', () => ({
  cookies: async () => ({
    set: (name: string, value: string) => {
      setCalls.push({ name, value })
    },
  }),
}))

async function loadRoute() {
  return await import('../route')
}

describe('GET /connect/meta/login', () => {
  beforeEach(() => {
    setCalls = []
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('redirects to missing_config when env is unset', async () => {
    vi.stubEnv('META_REVIEW_APP_ID', '')
    vi.stubEnv('META_CONNECT_REDIRECT_URI', '')
    const { GET } = await loadRoute()
    const res = await GET(new Request('https://tilltalk.ie/connect/meta/login'))
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('/connect/meta/error')
    expect(loc).toContain('reason=missing_config')
  })

  it('redirects to the Facebook OAuth dialog with approved scopes and sets the state cookie', async () => {
    vi.stubEnv('META_REVIEW_APP_ID', 'appid')
    vi.stubEnv('META_CONNECT_REDIRECT_URI', 'https://tilltalk.ie/connect/meta/callback')
    const { GET } = await loadRoute()
    const res = await GET(new Request('https://tilltalk.ie/connect/meta/login'))
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain('https://www.facebook.com/v25.0/dialog/oauth')
    expect(loc).toContain('client_id=appid')

    const scope = decodeURIComponent(loc)
    expect(scope).toContain('ads_management')
    expect(scope).toContain('business_management')
    expect(scope).toContain('pages_manage_ads')
    // Rejected/not-approved scopes must NOT be requested in production.
    expect(scope).not.toContain('instagram')

    // Single-use CSRF state cookie is set.
    expect(setCalls.some((c) => c.name === 'meta_connect_state')).toBe(true)
  })
})
