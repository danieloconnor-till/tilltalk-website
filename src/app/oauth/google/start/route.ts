import { NextResponse } from 'next/server'
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  STATE_COOKIE_MAX_AGE_SEC,
  buildSignedState,
  getStateSecret,
} from '../_state'

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const REDIRECT_URI  = 'https://tilltalk.ie/oauth/google/callback'
const SCOPE         = 'https://www.googleapis.com/auth/adwords'

export async function GET(): Promise<NextResponse> {
  const secret = getStateSecret()
  if (!secret) {
    console.error('[google-oauth-start] GOOGLE_OAUTH_STATE_SECRET not configured')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? ''
  if (!clientId) {
    console.error('[google-oauth-start] GOOGLE_OAUTH_CLIENT_ID not configured')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const state = buildSignedState(secret)

  const params = new URLSearchParams()
  params.set('client_id', clientId)
  params.set('redirect_uri', REDIRECT_URI)
  params.set('response_type', 'code')
  params.set('scope', SCOPE)
  params.set('access_type', 'offline')
  params.set('prompt', 'consent')
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
