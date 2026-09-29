import { NextResponse } from 'next/server'
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  STATE_COOKIE_MAX_AGE_SEC,
  buildSignedState,
  getStateSecret,
} from '../_state'

// Advertiser authorization. TikTok hosts this one on the business portal, not on
// tiktok.com — the account-holder flow is the one that goes to
// www.tiktok.com/v2/auth/authorize (see ../account-start/route.ts).
const AUTHORIZE_URL = 'https://business-api.tiktok.com/portal/auth'

// Byte-identical to the "Advertiser redirect URL" registered on app
// 7648876166014730256. TikTok compares what it is sent against the registration,
// so this is a constant — never derived from the incoming request's host.
const REDIRECT_URI  = 'https://tilltalk.ie/oauth/tiktok/callback'

export async function GET(): Promise<NextResponse> {
  const secret = getStateSecret()
  if (!secret) {
    console.error('[tiktok-oauth-start] TIKTOK_OAUTH_STATE_SECRET not configured')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const appId = process.env.TIKTOK_APP_ID ?? ''
  if (!appId) {
    console.error('[tiktok-oauth-start] TIKTOK_APP_ID not configured')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const state = buildSignedState(secret)

  const params = new URLSearchParams()
  params.set('app_id', appId)
  params.set('redirect_uri', REDIRECT_URI)
  params.set('state', state)

  const response = NextResponse.redirect(`${AUTHORIZE_URL}?${params.toString()}`)
  response.cookies.set({
    name:     STATE_COOKIE_NAME,
    value:    state,
    httpOnly: true,
    secure:   true,
    sameSite: 'lax',
    path:     STATE_COOKIE_PATH,
    maxAge:   STATE_COOKIE_MAX_AGE_SEC,
  })
  return response
}
