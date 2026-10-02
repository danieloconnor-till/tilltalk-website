import { NextResponse } from 'next/server'
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  constantTimeEquals,
  getStateSecret,
  readStateCookie,
  verifySignedState,
} from '../_state'

// The website's tilltalk1 handoff pair, same as src/app/connect/meta/callback.
const TILLTALK1_BASE = process.env.TILLTALK1_BASE_URL ?? ''
const ONBOARDING_KEY = process.env.TILLTALK1_ONBOARDING_KEY ?? ''

// TODO(multi-tenant): resolve the TillTalk client id from the authenticated
// session when client #2 lands. Bella Napoli is client 11. Mirrors the constant
// in src/app/connect/meta/callback/route.ts — tilltalk1's token receivers key
// every stored token to a client_id carried in the handoff body.
const CLIENT_ID = 11

// TikTok Business/Marketing API token-exchange endpoint — the ADVERTISER flow.
// Returns a long-lived token: no refresh_token and no expires_in, unlike the
// account-holder exchange in ../account-callback/route.ts (24h + 1y refresh).
// Both are read off the response rather than assumed, so neither lifetime is
// baked in here.
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
  //
  // Log hygiene: the raw response body is NEVER logged. TikTok answers this
  // endpoint with HTTP 200 even for application-level failures, so a non-2xx body
  // is an unmodelled shape that may echo request content — and the status plus
  // TikTok's own code/message is what is actually diagnostic anyway.
  let accessToken: string
  let advertiserIds: string[] = []
  let refreshToken: string | null = null
  let expiresIn: number | null = null
  let scope: number[] = []
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

    // TikTok wraps the payload in { code, message, data: {...} }.
    const tokenJson = await tokenRes.json().catch(() => null) as {
      code?: number
      message?: string
      data?: {
        access_token?: string
        advertiser_ids?: string[]
        // Scope IDs (numbers), per "Obtain a long-term access token". Forwarded
        // so tilltalk1 records what this token was actually granted: an approved
        // scope only reaches a token on re-authorisation (2026-10-02).
        scope?: number[]
        // Absent on this (advertiser) flow — the token is long-lived. Modelled so
        // the handoff forwards whatever TikTok actually sent rather than a
        // lifetime assumed at build time.
        refresh_token?: string
        expires_in?: number
      }
    } | null

    if (!tokenRes.ok) {
      console.error(
        '[tiktok-oauth] token exchange failed:',
        tokenRes.status,
        tokenJson?.code,
        tokenJson?.message,
      )
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }

    const accessTokenValue = tokenJson?.data?.access_token
    if (!accessTokenValue) {
      console.error('[tiktok-oauth] no access_token in response:', tokenJson?.code, tokenJson?.message)
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }
    accessToken = accessTokenValue
    advertiserIds = tokenJson?.data?.advertiser_ids ?? []
    refreshToken = tokenJson?.data?.refresh_token ?? null
    expiresIn = typeof tokenJson?.data?.expires_in === 'number' ? tokenJson.data.expires_in : null
    scope = Array.isArray(tokenJson?.data?.scope) ? tokenJson.data.scope : []
  } catch (err) {
    // Only the error's name/message — never the object, whose `cause` can carry
    // the request that produced it.
    console.error(
      '[tiktok-oauth] token exchange error:',
      err instanceof Error ? `${err.name}: ${err.message}` : 'unknown',
    )
    return welcomeRedirect({ error: 'token_exchange_failed' })
  }

  // Hand off to Railway for encrypted storage. Best-effort: if it errors, log and
  // continue — the token exchange itself succeeded.
  if (TILLTALK1_BASE && ONBOARDING_KEY) {
    try {
      const railwayRes = await fetch(`${TILLTALK1_BASE}/api/onboard/tiktok`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Onboarding-Key': ONBOARDING_KEY,
        },
        body: JSON.stringify({
          client_id:      CLIENT_ID,
          access_token:   accessToken,
          advertiser_ids: advertiserIds,
          refresh_token:  refreshToken,
          expires_in:     expiresIn,
          scopes:         scope.length ? scope.join(',') : null,
          oauth_app_id:   appId,
        }),
        signal: AbortSignal.timeout(12000),
      })
      if (!railwayRes.ok) {
        // Status only — the response body is not logged, for the same reason the
        // token response body is not.
        console.error('[tiktok-oauth] Railway storage non-OK (non-fatal):', railwayRes.status)
      }
    } catch (err) {
      console.error(
        '[tiktok-oauth] Railway request error (non-fatal):',
        err instanceof Error ? `${err.name}: ${err.message}` : 'unknown',
      )
    }
  } else {
    console.warn('[tiktok-oauth] TILLTALK1_BASE_URL/TILLTALK1_ONBOARDING_KEY not set — skipping storage')
  }

  console.log('[tiktok-oauth] success — advertiser_ids:', advertiserIds.length)
  return welcomeRedirect({ tiktok: 'connected' })
}
