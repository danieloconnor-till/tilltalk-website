import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared mock state for the Supabase admin client — reset per test.
let mockAdmin: ReturnType<typeof makeMockAdmin>

function makeMockAdmin() {
  const createUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'sb-user-id-default' } },
    error: null,
  })
  const generateLink = vi.fn().mockResolvedValue({
    data: {
      properties: {
        hashed_token: 'hashed-tok-abc123',
        action_link: 'https://vxcmaluzktaxzhjskhhw.supabase.co/auth/v1/verify?token=t&type=magiclink',
      },
    },
    error: null,
  })
  const profilesInsert = vi.fn().mockResolvedValue({ error: null })
  const profilesSelectMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })

  return {
    createUser,
    generateLink,
    profilesInsert,
    profilesSelectMaybeSingle,
    client: {
      auth: { admin: { createUser, generateLink } },
      from: (table: string) => {
        if (table === 'profiles') {
          return {
            insert: profilesInsert,
            select: () => ({
              eq: () => ({ maybeSingle: profilesSelectMaybeSingle }),
            }),
          }
        }
        return { insert: vi.fn(), select: () => ({ eq: () => ({ maybeSingle: vi.fn() }) }) }
      },
    },
  }
}

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleClient: () => mockAdmin.client,
}))

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
    mockAdmin = makeMockAdmin()
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

  // ---------------------------------------------- auto-provisioned branch

  function autoProvisionedFetchMock(opts?: { railwayBody?: Record<string, unknown>; linkOk?: boolean }) {
    const body = opts?.railwayBody ?? {
      status: 'ok',
      auto_provisioned: true,
      client_id: 42,
      location_id: 7,
      merchant_id: 'NEW123',
    }
    const linkOk = opts?.linkOk ?? true
    return vi
      .fn()
      // token exchange
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600 }),
      })
      // Railway /api/onboard/clover
      .mockResolvedValueOnce({
        ok: true,
        json: async () => body,
      })
      // Railway /api/onboard/clover/link-supabase-user
      .mockResolvedValueOnce({
        ok: linkOk,
        status: linkOk ? 200 : 500,
        text: async () => (linkOk ? 'ok' : 'storage_failed'),
      })
  }

  it('auto-provisioned: redirects to Supabase magic-link URL', async () => {
    vi.stubGlobal('fetch', autoProvisionedFetchMock())

    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest(
        {
          merchant_id: 'NEW123',
          employee_id: 'EMP1',
          client_id: 'test-app-id',
          code: 'auth-code',
          state,
        },
        { clover_oauth_state: state },
      ),
    )) as unknown as RedirectResult

    expect(result.status).toBe(302)
    // Routes through our own /auth/confirm server route (hashed_token flow),
    // not straight to Supabase's /auth/v1/verify (the old hash-fragment flow).
    expect(result.url).toContain('tilltalk.ie/auth/confirm')
    expect(result.url).toContain('token_hash=hashed-tok-abc123')
    expect(result.url).toContain('type=magiclink')
    expect(result.url).toContain('next=%2Fdashboard')
    expect(result.url).not.toContain('error=')
    expectCookieCleared(result)

    // createUser was called with the synthetic email + clover metadata.
    expect(mockAdmin.createUser).toHaveBeenCalledTimes(1)
    const createUserCall = mockAdmin.createUser.mock.calls[0][0] as {
      email: string
      email_confirm: boolean
      user_metadata: Record<string, string>
    }
    expect(createUserCall.email).toBe('clover-new123@tilltalk.ie')
    expect(createUserCall.email_confirm).toBe(true)
    expect(createUserCall.user_metadata.clover_merchant_id).toBe('NEW123')
    expect(createUserCall.user_metadata.provisioned_via).toBe('clover_oauth')

    // profiles row inserted with placeholder values + trial plan.
    expect(mockAdmin.profilesInsert).toHaveBeenCalledTimes(1)
    const profileRow = mockAdmin.profilesInsert.mock.calls[0][0] as Record<string, unknown>
    expect(profileRow.id).toBe('sb-user-id-default')
    expect(profileRow.email).toBe('clover-new123@tilltalk.ie')
    expect(profileRow.plan).toBe('trial')
    expect(profileRow.pos_type).toBe('clover')

    // Magic link generated with /dashboard redirect target.
    expect(mockAdmin.generateLink).toHaveBeenCalledTimes(1)
    const linkCall = mockAdmin.generateLink.mock.calls[0][0] as {
      type: string
      email: string
      options: { redirectTo: string }
    }
    expect(linkCall.type).toBe('magiclink')
    expect(linkCall.email).toBe('clover-new123@tilltalk.ie')
    expect(linkCall.options.redirectTo).toBe('https://tilltalk.ie/dashboard')
  })

  it('auto-provisioned: createUser failure redirects to /welcome?error=user_creation_failed', async () => {
    mockAdmin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'database error', status: 500 },
    })
    vi.stubGlobal('fetch', autoProvisionedFetchMock())

    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest(
        {
          merchant_id: 'NEW123',
          employee_id: 'EMP1',
          client_id: 'test-app-id',
          code: 'auth-code',
          state,
        },
        { clover_oauth_state: state },
      ),
    )) as unknown as RedirectResult

    expect(result.url).toContain('error=user_creation_failed')
    expectCookieCleared(result)
  })

  it('auto-provisioned: link-supabase-user failure still signs the user in', async () => {
    vi.stubGlobal('fetch', autoProvisionedFetchMock({ linkOk: false }))

    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest(
        {
          merchant_id: 'NEW123',
          employee_id: 'EMP1',
          client_id: 'test-app-id',
          code: 'auth-code',
          state,
        },
        { clover_oauth_state: state },
      ),
    )) as unknown as RedirectResult

    // User still lands in the /auth/confirm route despite link failure.
    expect(result.url).toContain('tilltalk.ie/auth/confirm')
    expect(result.url).toContain('token_hash=hashed-tok-abc123')
    expect(result.url).not.toContain('error=')
    expect(mockAdmin.createUser).toHaveBeenCalled()
    expect(mockAdmin.generateLink).toHaveBeenCalled()
  })

  it('auto-provisioned: createUser already-registered re-uses existing profiles row', async () => {
    mockAdmin.createUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'A user with this email has already been registered', status: 422 },
    })
    mockAdmin.profilesSelectMaybeSingle.mockResolvedValueOnce({
      data: { id: 'existing-user-id' },
      error: null,
    })
    vi.stubGlobal('fetch', autoProvisionedFetchMock())

    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest(
        {
          merchant_id: 'NEW123',
          employee_id: 'EMP1',
          client_id: 'test-app-id',
          code: 'auth-code',
          state,
        },
        { clover_oauth_state: state },
      ),
    )) as unknown as RedirectResult

    expect(result.url).toContain('tilltalk.ie/auth/confirm')
    // No profiles insert on re-use of an existing user.
    expect(mockAdmin.profilesInsert).not.toHaveBeenCalled()
    expect(mockAdmin.generateLink).toHaveBeenCalled()
  })

  // ----------------------------------------- existing-merchant branch intact

  it('existing merchant (no auto_provisioned): redirects to /welcome?merchant_id=...', async () => {
    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', refresh_token: 'r', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', grace_recovered: false }),
      }))

    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest(
        {
          merchant_id: 'MERCH1',
          employee_id: 'EMP1',
          client_id: 'test-app-id',
          code: 'auth-code',
          state,
        },
        { clover_oauth_state: state },
      ),
    )) as unknown as RedirectResult

    expect(result.url).toContain('/welcome')
    expect(result.url).toContain('merchant_id=MERCH1')
    expect(result.url).not.toContain('error=')
    // Auto-provision side effects must NOT fire.
    expect(mockAdmin.createUser).not.toHaveBeenCalled()
    expect(mockAdmin.generateLink).not.toHaveBeenCalled()
  })

  it('sandbox (no auto_provisioned): redirects to /welcome?merchant_id=...', async () => {
    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'tok', refresh_token: 'r', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', is_sandbox: true }),
      }))

    const state = buildSignedState('test-state-secret')
    const result = (await GET(
      makeRequest(
        {
          merchant_id: 'SBX1',
          employee_id: 'EMP1',
          client_id: 'test-app-id',
          code: 'auth-code',
          state,
        },
        { clover_oauth_state: state },
      ),
    )) as unknown as RedirectResult

    expect(result.url).toContain('/welcome')
    expect(result.url).toContain('merchant_id=SBX1')
    expect(mockAdmin.createUser).not.toHaveBeenCalled()
  })
})
