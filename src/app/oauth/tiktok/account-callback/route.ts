import { NextResponse } from 'next/server'
import {
  ACCOUNT_STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  constantTimeEquals,
  getStateSecret,
  readStateCookie,
  verifySignedState,
} from '../_state'

const RAILWAY_URL    = process.env.RAILWAY_ONBOARDING_URL ?? ''
const ONBOARDING_KEY = process.env.ONBOARDING_API_KEY ?? ''

// TODO(multi-tenant): resolve the TillTalk client id from the authenticated
// session when client #2 lands. Bella Napoli is client 11. Mirrors the constant
// in src/app/connect/meta/callback/route.ts — tilltalk1's token receivers key
// every stored token to a client_id carried in the handoff body.
const CLIENT_ID = 11

// The TikTok-account-holder ("creator" / Spark Ads identity) token exchange.
// DISTINCT from the advertiser exchange in ../callback/route.ts, which posts to
// /open_api/v1.3/oauth2/access_token/ with app_id+secret and gets a long-lived,
// non-expiring token back. This endpoint takes client_id+client_secret and
// returns a SHORT-lived token (expires_in ≈ 86400) plus a refresh_token good for
// a year, and the open_id that identifies the TikTok account — the value every
// /business/* endpoint later wants as business_id.
const TIKTOK_ACCOUNT_TOKEN_URL =
  process.env.TIKTOK_ACCOUNT_TOKEN_URL ??
  'https://business-api.tiktok.com/open_api/v1.3/tt_user/oauth2/token/'

// Byte-identical to the "TikTok account holder redirect URL" registered on the
// app (app id 7648876166014730256). TikTok validates the value it is sent here
// against that registration, so it is a constant, never derived from the request.
const REDIRECT_URI = 'https://tilltalk.ie/oauth/tiktok/account-callback'

function clearStateCookie<T extends NextResponse>(response: T): T {
  response.cookies.delete({ name: ACCOUNT_STATE_COOKIE_NAME, path: STATE_COOKIE_PATH })
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

  // The v2 authorize flow returns `code`; `auth_code` is accepted as the same
  // fallback alias the advertiser callback allows.
  const authCode = searchParams.get('code') ?? searchParams.get('auth_code') ?? ''
  const state    = searchParams.get('state') ?? ''
  const cookieState = readStateCookie(request, ACCOUNT_STATE_COOKIE_NAME) ?? ''

  const stateSecret = getStateSecret()
  if (!stateSecret) {
    console.error('[tiktok-account-oauth] TIKTOK_OAUTH_STATE_SECRET not configured')
    return stateError('server_misconfigured', 500)
  }

  if (!state || !cookieState) {
    console.warn('[tiktok-account-oauth] state invalid — missing')
    return stateError('missing_state', 400)
  }
  if (!constantTimeEquals(state, cookieState)) {
    console.warn('[tiktok-account-oauth] state invalid — cookie mismatch')
    return stateError('invalid_state', 400)
  }
  if (!verifySignedState(state, stateSecret)) {
    console.warn('[tiktok-account-oauth] state invalid — bad signature')
    return stateError('invalid_state', 400)
  }

  if (!authCode) {
    console.warn('[tiktok-account-oauth] missing code')
    return welcomeRedirect({ error: 'missing_params' })
  }

  const appId     = process.env.TIKTOK_APP_ID ?? ''
  const appSecret = process.env.TIKTOK_APP_SECRET ?? ''
  if (!appId || !appSecret) {
    console.warn(
      '[tiktok-account-oauth] code received but TIKTOK_APP_ID/SECRET not configured ' +
        '— captured state OK, cannot exchange yet',
    )
    return welcomeRedirect({ tiktok_account: 'pending_credentials' })
  }

  // Exchange the auth code for the account-holder token.
  //
  // Log hygiene, enforced here and in ../callback/route.ts alike: the raw
  // response body is NEVER logged. TikTok answers this endpoint with HTTP 200
  // even for application-level failures, so a non-2xx body is an unmodelled
  // shape that may echo request content — the status, plus TikTok's own
  // code/message when the body parses, is what is actually diagnostic anyway.
  let accessToken: string
  let refreshToken: string | null = null
  let expiresIn: number | null = null
  let refreshExpiresIn: number | null = null
  let openId = ''
  let scope: string[] = []
  try {
    const tokenRes = await fetch(TIKTOK_ACCOUNT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     appId,
        client_secret: appSecret,
        auth_code:     authCode,
        grant_type:    'authorization_code',
        redirect_uri:  REDIRECT_URI,
      }),
      signal: AbortSignal.timeout(10000),
    })

    // TikTok wraps the payload in { code, message, data: {...} }.
    const tokenJson = await tokenRes.json().catch(() => null) as {
      code?: number
      message?: string
      data?: {
        access_token?: string
        refresh_token?: string
        expires_in?: number
        refresh_token_expires_in?: number
        open_id?: string
        scope?: string[]
      }
    } | null

    if (!tokenRes.ok) {
      console.error(
        '[tiktok-account-oauth] token exchange failed:',
        tokenRes.status,
        tokenJson?.code,
        tokenJson?.message,
      )
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }

    const accessTokenValue = tokenJson?.data?.access_token
    if (!accessTokenValue) {
      console.error(
        '[tiktok-account-oauth] no access_token in response:',
        tokenJson?.code,
        tokenJson?.message,
      )
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }
    accessToken = accessTokenValue
    // Present on this flow (24h access / 1y refresh) and absent on the advertiser
    // flow. Forwarded as-is so the store honours whatever TikTok actually said
    // rather than a lifetime assumed at build time.
    refreshToken     = tokenJson?.data?.refresh_token ?? null
    expiresIn        = typeof tokenJson?.data?.expires_in === 'number' ? tokenJson.data.expires_in : null
    refreshExpiresIn =
      typeof tokenJson?.data?.refresh_token_expires_in === 'number'
        ? tokenJson.data.refresh_token_expires_in
        : null
    openId = tokenJson?.data?.open_id ?? ''
    scope  = tokenJson?.data?.scope ?? []
  } catch (err) {
    // Only the error's name/message — never the object, whose `cause` can carry
    // the request that produced it.
    console.error(
      '[tiktok-account-oauth] token exchange error:',
      err instanceof Error ? `${err.name}: ${err.message}` : 'unknown',
    )
    return welcomeRedirect({ error: 'token_exchange_failed' })
  }

  // Hand off to Railway for encrypted storage. Best-effort, matching the
  // advertiser callback: the exchange itself succeeded, so a storage failure is
  // logged and the user still lands on a clean success page.
  if (RAILWAY_URL && ONBOARDING_KEY) {
    try {
      const railwayRes = await fetch(`${RAILWAY_URL}/api/onboard/tiktok-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Onboarding-Key': ONBOARDING_KEY,
        },
        body: JSON.stringify({
          client_id:                CLIENT_ID,
          access_token:             accessToken,
          refresh_token:            refreshToken,
          expires_in:               expiresIn,
          refresh_token_expires_in: refreshExpiresIn,
          open_id:                  openId,
          scopes:                   scope.length ? scope.join(',') : null,
          oauth_app_id:             appId,
        }),
        signal: AbortSignal.timeout(12000),
      })
      if (!railwayRes.ok) {
        // Status only — the response body is not logged, for the same reason the
        // token response body is not.
        console.error('[tiktok-account-oauth] Railway storage non-OK (non-fatal):', railwayRes.status)
      }
    } catch (err) {
      console.error(
        '[tiktok-account-oauth] Railway request error (non-fatal):',
        err instanceof Error ? `${err.name}: ${err.message}` : 'unknown',
      )
    }
  } else {
    console.warn(
      '[tiktok-account-oauth] RAILWAY_ONBOARDING_URL/ONBOARDING_API_KEY not set — skipping storage',
    )
  }

  // open_id is an account identifier, not a credential, but it is still not put
  // in a redirect URL — only whether one arrived.
  console.log('[tiktok-account-oauth] success — open_id present:', Boolean(openId))
  return welcomeRedirect({ tiktok_account: 'connected' })
}
