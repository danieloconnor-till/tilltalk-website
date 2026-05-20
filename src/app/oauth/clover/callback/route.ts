import { NextResponse } from 'next/server'
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  constantTimeEquals,
  getStateSecret,
  readStateCookie,
  verifySignedState,
} from '../_state'

const RAILWAY_URL    = process.env.RAILWAY_ONBOARDING_URL ?? ''
const ONBOARDING_KEY = process.env.ONBOARDING_API_KEY ?? ''

function clearStateCookie<T extends NextResponse>(response: T): T {
  response.cookies.delete({ name: STATE_COOKIE_NAME, path: STATE_COOKIE_PATH })
  return response
}

function welcomeRedirect(params: Record<string, string>): NextResponse {
  const url = new URL('/welcome', 'https://tilltalk.ie')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return clearStateCookie(NextResponse.redirect(url.toString()))
}

function stateError(error: 'missing_state' | 'invalid_state' | 'server_misconfigured', status: number): NextResponse {
  return clearStateCookie(NextResponse.json({ error }, { status }))
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)

  const merchantId = searchParams.get('merchant_id') ?? ''
  const employeeId = searchParams.get('employee_id') ?? ''
  const clientId   = searchParams.get('client_id')   ?? ''
  const code       = searchParams.get('code')         ?? ''
  const state      = searchParams.get('state') ?? ''
  const cookieState = readStateCookie(request) ?? ''

  const stateSecret = getStateSecret()
  if (!stateSecret) {
    console.error('[clover-oauth] CLOVER_OAUTH_STATE_SECRET not configured')
    return stateError('server_misconfigured', 500)
  }

  if (!state || !cookieState) {
    console.warn('[clover-oauth] state invalid — missing')
    return stateError('missing_state', 400)
  }
  if (!constantTimeEquals(state, cookieState)) {
    console.warn('[clover-oauth] state invalid — cookie mismatch')
    return stateError('invalid_state', 400)
  }
  if (!verifySignedState(state, stateSecret)) {
    console.warn('[clover-oauth] state invalid — bad signature')
    return stateError('invalid_state', 400)
  }

  if (!merchantId || !employeeId || !clientId || !code) {
    console.warn('[clover-oauth] missing params:', { merchantId, employeeId, clientId, code: !!code })
    return welcomeRedirect({ error: 'missing_params' })
  }

  // Detect sandbox: client_id matches CLOVER_SANDBOX_APP_ID
  const sandboxAppId     = process.env.CLOVER_SANDBOX_APP_ID ?? ''
  const isSandbox        = !!sandboxAppId && clientId === sandboxAppId

  const appId     = isSandbox
    ? sandboxAppId
    : (process.env.CLOVER_APP_ID ?? '')
  const appSecret = isSandbox
    ? (process.env.CLOVER_SANDBOX_APP_SECRET ?? '')
    : (process.env.CLOVER_APP_SECRET ?? '')
  const apiBase   = isSandbox
    ? (process.env.CLOVER_SANDBOX_BASE_URL ?? 'https://apisandbox.dev.clover.com')
    : (process.env.CLOVER_API_BASE ?? 'https://api.eu.clover.com')

  if (!appId || !appSecret) {
    console.error('[clover-oauth] app credentials not configured — isSandbox:', isSandbox)
    return welcomeRedirect({ error: 'token_exchange_failed' })
  }

  // Exchange auth code for access token
  let accessToken: string
  let refreshToken: string | undefined
  let expiresIn: number | undefined

  try {
    const tokenRes = await fetch(`${apiBase}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: appId, client_secret: appSecret, code }),
      signal: AbortSignal.timeout(10000),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '')
      console.error('[clover-oauth] token exchange failed:', tokenRes.status, body)
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }

    const tokenData = await tokenRes.json() as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
    }

    if (!tokenData.access_token) {
      console.error('[clover-oauth] no access_token in response:', tokenData)
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }

    accessToken  = tokenData.access_token
    refreshToken = tokenData.refresh_token
    expiresIn    = tokenData.expires_in
  } catch (err) {
    console.error('[clover-oauth] token exchange error:', err)
    return welcomeRedirect({ error: 'token_exchange_failed' })
  }

  // Hand off to Railway for encrypted storage
  if (!RAILWAY_URL || !ONBOARDING_KEY) {
    console.error('[clover-oauth] RAILWAY_ONBOARDING_URL or ONBOARDING_API_KEY not configured')
    return welcomeRedirect({ error: 'storage_failed' })
  }

  try {
    const railwayRes = await fetch(`${RAILWAY_URL}/api/onboard/clover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Onboarding-Key': ONBOARDING_KEY,
      },
      body: JSON.stringify({
        merchant_id:   merchantId,
        employee_id:   employeeId,
        access_token:  accessToken,
        refresh_token: refreshToken,
        expires_in:    expiresIn,
        is_sandbox:    isSandbox,
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!railwayRes.ok) {
      const body = await railwayRes.json().catch(() => ({})) as { message?: string }
      console.error('[clover-oauth] Railway storage failed:', railwayRes.status, body)
      return welcomeRedirect({ error: 'storage_failed' })
    }
  } catch (err) {
    console.error('[clover-oauth] Railway request error:', err)
    return welcomeRedirect({ error: 'storage_failed' })
  }

  console.log('[clover-oauth] success for merchant_id:', merchantId, '| sandbox:', isSandbox)
  return welcomeRedirect({ merchant_id: merchantId })
}
