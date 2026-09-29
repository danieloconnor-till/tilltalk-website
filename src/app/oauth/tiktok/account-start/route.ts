import { NextResponse } from 'next/server'
import {
  ACCOUNT_STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  STATE_COOKIE_MAX_AGE_SEC,
  buildSignedState,
  getStateSecret,
} from '../_state'

// The TikTok account holder authorizes on tiktok.com itself, not on the business
// portal — this is the URL shown on the app's Basic Information page. The
// advertiser flow's equivalent is business-api.tiktok.com/portal/auth
// (see ../start/route.ts).
const AUTHORIZE_URL = 'https://www.tiktok.com/v2/auth/authorize/'

// Byte-identical to the "TikTok account holder redirect URL" registered on app
// 7648876166014730256, and to the redirect_uri the token exchange replays in
// ../account-callback/route.ts. TikTok checks all three agree.
const REDIRECT_URI  = 'https://tilltalk.ie/oauth/tiktok/account-callback'

// The scopes TikTok assigned to the app, comma-separated. Overridable because the
// authoritative list is whatever TikTok granted, not whatever we would like:
// requesting an unassigned scope fails on TikTok's own consent page, where the
// user sees it and we do not. As of 2026-09-29 the app holds the four base
// Marketing API scopes and the extension covering TikTok accounts is still under
// review, so this flow cannot complete end-to-end until that is granted — set
// TIKTOK_ACCOUNT_SCOPES to the assigned list when it is.
const SCOPES =
  process.env.TIKTOK_ACCOUNT_SCOPES ?? 'user.info.basic,video.list,biz.spark.auth'

export async function GET(): Promise<NextResponse> {
  const secret = getStateSecret()
  if (!secret) {
    console.error('[tiktok-account-oauth-start] TIKTOK_OAUTH_STATE_SECRET not configured')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  // The v2 authorize endpoint names the app `client_key`; it is the same app id.
  const appId = process.env.TIKTOK_APP_ID ?? ''
  if (!appId) {
    console.error('[tiktok-account-oauth-start] TIKTOK_APP_ID not configured')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const state = buildSignedState(secret)

  const params = new URLSearchParams()
  params.set('client_key', appId)
  params.set('response_type', 'code')
  params.set('scope', SCOPES)
  params.set('redirect_uri', REDIRECT_URI)
  params.set('state', state)

  const response = NextResponse.redirect(`${AUTHORIZE_URL}?${params.toString()}`)
  response.cookies.set({
    name:     ACCOUNT_STATE_COOKIE_NAME,
    value:    state,
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    path:     STATE_COOKIE_PATH,
    maxAge:   STATE_COOKIE_MAX_AGE_SEC,
  })
  return response
}
