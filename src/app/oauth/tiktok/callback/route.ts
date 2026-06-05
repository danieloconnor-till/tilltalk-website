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

// TikTok Business/Marketing API token-exchange endpoint.
const TIKTOK_TOKEN_URL =
  process.env.TIKTOK_TOKEN_URL ??
  'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/'

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

  // TikTok returns auth_code (and code as a fallback alias on some flows) plus state.
  const authCode = searchParams.get('auth_code') ?? searchParams.get('code') ?? ''
  const state    = searchParams.get('state') ?? ''
  const cookieState = readStateCookie(request) ?? ''

  const stateSecret = getStateSecret()
  if (!stateSecret) {
    console.error('[tiktok-oauth] TIKTOK_OAUTH_STATE_SECRET not configured')
    return stateError('server_misconfigured', 500)
  }

  if (!state || !cookieState) {
    console.warn('[tiktok-oauth] state invalid — missing')
    return stateError('missing_state', 400)
  }
  if (!constantTimeEquals(state, cookieState)) {
    console.warn('[tiktok-oauth] state invalid — cookie mismatch')
    return stateError('invalid_state', 400)
  }
  if (!verifySignedState(state, stateSecret)) {
    console.warn('[tiktok-oauth] state invalid — bad signature')
    return stateError('invalid_state', 400)
  }

  if (!authCode) {
    console.warn('[tiktok-oauth] missing auth_code')
    return welcomeRedirect({ error: 'missing_params' })
  }

  // App credentials are issued only on TikTok app approval. Until then, guard
  // the token exchange: log and redirect cleanly so the route is deployable
  // and demonstrable pre-approval without crashing.
  const appId     = process.env.TIKTOK_APP_ID ?? ''
  const appSecret = process.env.TIKTOK_APP_SECRET ?? ''
  if (!appId || !appSecret) {
    console.warn(
      '[tiktok-oauth] auth_code received but TIKTOK_APP_ID/SECRET not configured ' +
        '(app pending approval) — captured state OK, cannot exchange yet',
    )
    return welcomeRedirect({ tiktok: 'pending_credentials' })
  }

  // Exchange auth_code for an access token.
  // Response includes access_token and the advertiser_ids the token can act on.
  let accessToken: string
  let advertiserIds: string[] = []
  try {
    const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: appId,
        secret: appSecret,
        auth_code: authCode,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '')
      console.error('[tiktok-oauth] token exchange failed:', tokenRes.status, body)
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }

    // TikTok wraps the payload in { code, message, data: {...} }.
    const tokenJson = await tokenRes.json() as {
      code?: number
      message?: string
      data?: {
        access_token?: string
        advertiser_ids?: string[]
        scope?: string[]
      }
    }

    const accessTokenValue = tokenJson.data?.access_token
    if (!accessTokenValue) {
      console.error('[tiktok-oauth] no access_token in response:', tokenJson.code, tokenJson.message)
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }
    accessToken = accessTokenValue
    advertiserIds = tokenJson.data?.advertiser_ids ?? []
  } catch (err) {
    console.error('[tiktok-oauth] token exchange error:', err)
    return welcomeRedirect({ error: 'token_exchange_failed' })
  }

  // Hand off to Railway for encrypted storage. Best-effort: the
  // /api/onboard/tiktok endpoint may not exist yet (backend provider wiring is
  // sequenced separately). If it 404s or errors, log and continue — the token
  // exchange itself succeeded.
  if (RAILWAY_URL && ONBOARDING_KEY) {
    try {
      const railwayRes = await fetch(`${RAILWAY_URL}/api/onboard/tiktok`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Onboarding-Key': ONBOARDING_KEY,
        },
        body: JSON.stringify({
          access_token:   accessToken,
          advertiser_ids: advertiserIds,
          oauth_app_id:   appId,
        }),
        signal: AbortSignal.timeout(12000),
      })
      if (!railwayRes.ok) {
        const body = await railwayRes.text().catch(() => '')
        console.error('[tiktok-oauth] Railway storage non-OK (non-fatal):', railwayRes.status, body)
      }
    } catch (err) {
      console.error('[tiktok-oauth] Railway request error (non-fatal):', err)
    }
  } else {
    console.warn('[tiktok-oauth] RAILWAY_ONBOARDING_URL/ONBOARDING_API_KEY not set — skipping storage')
  }

  console.log('[tiktok-oauth] success — advertiser_ids:', advertiserIds.length)
  return welcomeRedirect({ tiktok: 'connected' })
}
