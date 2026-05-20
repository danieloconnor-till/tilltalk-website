import { describe, it, expect, vi } from 'vitest'

// Mock next/server before importing the route
vi.mock('next/server', () => {
  return {
    NextResponse: {
      redirect: (url: string) => ({ type: 'redirect', url, status: 302 }),
      json: (body: unknown, init?: { status?: number }) => ({
        type: 'json',
        body,
        status: init?.status ?? 200,
      }),
    },
  }
})

// Set required env vars before importing the route
process.env.CLOVER_SANDBOX_APP_ID = 'sandbox-app-id'
process.env.CLOVER_APP_ID         = 'prod-app-id'

const { GET } = await import('../route')

describe('GET /oauth/clover/start', () => {
  function makeRequest(params: Record<string, string>) {
    const url = new URL('https://tilltalk.ie/oauth/clover/start')
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    return new Request(url.toString())
  }

  it('returns 400 missing_params when client_id is absent', async () => {
    const result = (await GET(makeRequest({ merchant_id: 'M1' }))) as unknown as {
      type: string
      body: { error: string }
      status: number
    }
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'missing_params' })
  })

  it('returns 400 missing_params when merchant_id is absent', async () => {
    const result = (await GET(
      makeRequest({ client_id: 'sandbox-app-id' }),
    )) as unknown as {
      status: number
      body: { error: string }
    }
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'missing_params' })
  })

  it('returns 400 unknown_client_id when client_id matches no configured app', async () => {
    const result = (await GET(
      makeRequest({ client_id: 'bogus', merchant_id: 'M1' }),
    )) as unknown as {
      status: number
      body: { error: string }
    }
    expect(result.status).toBe(400)
    expect(result.body).toEqual({ error: 'unknown_client_id' })
  })

  it('redirects to sandbox authorize URL when client_id is the sandbox app', async () => {
    const result = (await GET(
      makeRequest({ client_id: 'sandbox-app-id', merchant_id: 'M1' }),
    )) as unknown as { type: string; url: string; status: number }
    expect(result.status).toBe(302)
    expect(result.url).toContain(
      'https://sandbox.dev.clover.com/oauth/v2/authorize',
    )
    expect(result.url).toContain('client_id=sandbox-app-id')
    expect(result.url).toContain('merchant_id=M1')
    expect(result.url).toContain(
      'redirect_uri=https%3A%2F%2Ftilltalk.ie%2Foauth%2Fclover%2Fcallback',
    )
  })

  it('redirects to production authorize URL when client_id is the prod app', async () => {
    const result = (await GET(
      makeRequest({ client_id: 'prod-app-id', merchant_id: 'M2' }),
    )) as unknown as { url: string; status: number }
    expect(result.status).toBe(302)
    expect(result.url).toContain('https://www.clover.com/oauth/v2/authorize')
    expect(result.url).toContain('client_id=prod-app-id')
    expect(result.url).toContain('merchant_id=M2')
  })

  it('forwards employee_id when present', async () => {
    const result = (await GET(
      makeRequest({
        client_id: 'sandbox-app-id',
        merchant_id: 'M1',
        employee_id: 'E1',
      }),
    )) as unknown as { url: string }
    expect(result.url).toContain('employee_id=E1')
  })

  it('omits employee_id when absent', async () => {
    const result = (await GET(
      makeRequest({ client_id: 'sandbox-app-id', merchant_id: 'M1' }),
    )) as unknown as { url: string }
    expect(result.url).not.toContain('employee_id=')
  })
})
