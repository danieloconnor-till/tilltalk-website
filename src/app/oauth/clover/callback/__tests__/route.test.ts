import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/server before importing the route
vi.mock('next/server', () => {
  return {
    NextResponse: {
      redirect: (url: string) => ({ type: 'redirect', url }),
    },
  }
})

// Set required env vars before importing the route
process.env.CLOVER_APP_ID       = 'test-app-id'
process.env.CLOVER_APP_SECRET   = 'test-app-secret'
process.env.CLOVER_API_BASE     = 'https://api.eu.clover.com'
process.env.RAILWAY_ONBOARDING_URL = 'https://railway.test'
process.env.ONBOARDING_API_KEY  = 'test-onboarding-key'

const { GET } = await import('../route')

describe('GET /oauth/clover/callback', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  function makeRequest(params: Record<string, string>) {
    const url = new URL('https://tilltalk.ie/oauth/clover/callback')
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return new Request(url.toString())
  }

  it('redirects to /welcome?error=missing_params when params are absent', async () => {
    const result = await GET(makeRequest({})) as { url: string }
    expect(result.url).toContain('error=missing_params')
  })

  it('redirects to /welcome?merchant_id=... on success', async () => {
    const mockFetch = vi.fn()
      // First call: Clover token exchange
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'clover-token-123', refresh_token: 'ref', expires_in: 3600 }),
      })
      // Second call: Railway storage
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      })
    vi.stubGlobal('fetch', mockFetch)

    const result = await GET(makeRequest({
      merchant_id: 'MERCH1',
      employee_id: 'EMP1',
      client_id:   'test-app-id',
      code:        'auth-code-xyz',
    })) as { url: string }

    expect(result.url).toContain('merchant_id=MERCH1')
    expect(result.url).not.toContain('error=')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('redirects to /welcome?error=token_exchange_failed when Clover returns error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'bad_code',
    }))

    const result = await GET(makeRequest({
      merchant_id: 'MERCH1',
      employee_id: 'EMP1',
      client_id:   'test-app-id',
      code:        'bad-code',
    })) as { url: string }

    expect(result.url).toContain('error=token_exchange_failed')
  })

  it('redirects to /welcome?error=storage_failed when Railway fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'not found' }),
      })
    )

    const result = await GET(makeRequest({
      merchant_id: 'MERCH1',
      employee_id: 'EMP1',
      client_id:   'test-app-id',
      code:        'code',
    })) as { url: string }

    expect(result.url).toContain('error=storage_failed')
  })
})
