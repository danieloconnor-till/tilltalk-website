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

// Google OAuth 2.0 token-exchange endpoint.
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const REDIRECT_URI     = 'https://tilltalk.ie/oauth/google/callback'

function clearStateCookie<T extends NextResponse>(response: T): T {
  response.cookies.delete({ name: STATE_COOKIE_NAME, path: STATE_COOKIE_PATH })
  return response
}

function welcomeRedirect(params: Record<string, string>): NextResponse {
  const url = new URL('/welcome', 'https://tilltalk.ie')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return clearStateCookie(NextResponse.redirect(url.toString()))
}

function stateError(
  error: 'missing_state' | 'invalid_state' | 'server_misconfigured',
  status: number,
): NextResponse {
  return clearStateCookie(NextResponse.json({ error }, { status }))
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)

  // Google returns code (and state).
  const code        = searchParams.get('code') ?? ''
  const state       = searchParams.get('state') ?? ''
  const cookieState = readStateCookie(request) ?? ''

  const stateSecret = getStateSecret()
  if (!stateSecret) {
    console.error('[google-oauth] GOOGLE_OAUTH_STATE_SECRET not configured')
    return stateError('server_misconfigured', 500)
  }

  if (!state || !cookieState) {
    console.warn('[google-oauth] state invalid — missing')
    return stateError('missing_state', 400)
  }
  if (!constantTimeEquals(state, cookieState)) {
    console.warn('[google-oauth] state invalid — cookie mismatch')
    return stateError('invalid_state', 400)
  }
  if (!verifySignedState(state, stateSecret)) {
    console.warn('[google-oauth] state invalid — bad signature')
    return stateError('invalid_state', 400)
  }

  if (!code) {
    console.warn('[google-oauth] missing code')
    return welcomeRedirect({ error: 'missing_params' })
  }

  // App credentials are issued only on Google app approval. Until then, guard
  // the token exchange: log and redirect cleanly so the route is deployable
  // and demonstrable pre-approval without crashing.
  const clientId     = process.env.GOOGLE_OAUTH_CLIENT_ID     ?? ''
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? ''
  if (!clientId || !clientSecret) {
    console.warn(
      '[google-oauth] code received but GOOGLE_OAUTH_CLIENT_ID/SECRET not configured ' +
        '— captured state OK, cannot exchange yet',
    )
    return welcomeRedirect({ google: 'pending_credentials' })
  }

  // Exchange code for an access token.
  // Google's token endpoint takes form-encoded params (not JSON) and returns
  // flat JSON: { access_token, expires_in, refresh_token?, scope, token_type }.
  let accessToken: string
  let refreshToken: string | undefined
  let expiresIn: number | undefined
  let scope: string | undefined
  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
      }).toString(),
      signal: AbortSignal.timeout(10000),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '')
      console.error('[google-oauth] token exchange failed:', tokenRes.status, body)
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }

    const tokenJson = await tokenRes.json() as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      scope?: string
    }

    if (!tokenJson.access_token) {
      console.error('[google-oauth] no access_token in response')
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }
    accessToken  = tokenJson.access_token
    refreshToken = tokenJson.refresh_token
    expiresIn    = tokenJson.expires_in
    scope        = tokenJson.scope
  } catch (err) {
    console.error('[google-oauth] token exchange error:', err)
    return welcomeRedirect({ error: 'token_exchange_failed' })
  }

  // Hand off to Railway for encrypted storage. Best-effort: the
  // /api/onboard/google endpoint may not exist yet (backend provider wiring is
  // sequenced separately). If it 404s or errors, log and continue — the token
  // exchange itself succeeded.
  if (RAILWAY_URL && ONBOARDING_KEY) {
    try {
      const railwayRes = await fetch(`${RAILWAY_URL}/api/onboard/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Onboarding-Key': ONBOARDING_KEY,
        },
        body: JSON.stringify({
          access_token:    accessToken,
          refresh_token:   refreshToken,
          expires_in:      expiresIn,
          scope,
          oauth_client_id: clientId,
        }),
        signal: AbortSignal.timeout(12000),
      })
      if (!railwayRes.ok) {
        const body = await railwayRes.text().catch(() => '')
        console.error('[google-oauth] Railway storage non-OK (non-fatal):', railwayRes.status, body)
      }
    } catch (err) {
      console.error('[google-oauth] Railway request error (non-fatal):', err)
    }
  } else {
    console.warn('[google-oauth] RAILWAY_ONBOARDING_URL/ONBOARDING_API_KEY not set — skipping storage')
  }

  console.log('[google-oauth] success — scope:', scope)
  return welcomeRedirect({ google: 'connected' })
}
