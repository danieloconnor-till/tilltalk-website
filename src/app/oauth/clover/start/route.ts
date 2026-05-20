import { NextResponse } from 'next/server'
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  STATE_COOKIE_MAX_AGE_SEC,
  buildSignedState,
  getStateSecret,
} from '../_state'

const SANDBOX_AUTHORIZE_URL = 'https://sandbox.dev.clover.com/oauth/v2/authorize'
const PROD_AUTHORIZE_URL    = 'https://www.clover.com/oauth/v2/authorize'
const REDIRECT_URI          = 'https://tilltalk.ie/oauth/clover/callback'

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)

  const clientId   = searchParams.get('client_id')   ?? ''
  const merchantId = searchParams.get('merchant_id') ?? ''
  const employeeId = searchParams.get('employee_id') ?? ''

  if (!clientId || !merchantId) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

  const sandboxAppId = process.env.CLOVER_SANDBOX_APP_ID ?? ''
  const prodAppId    = process.env.CLOVER_APP_ID         ?? ''

  let authorizeBase: string
  if (sandboxAppId && clientId === sandboxAppId) {
    authorizeBase = SANDBOX_AUTHORIZE_URL
  } else if (prodAppId && clientId === prodAppId) {
    authorizeBase = PROD_AUTHORIZE_URL
  } else {
    console.warn('[clover-oauth-start] unknown_client_id:', clientId)
    return NextResponse.json({ error: 'unknown_client_id' }, { status: 400 })
  }

  const secret = getStateSecret()
  if (!secret) {
    console.error('[clover-oauth-start] CLOVER_OAUTH_STATE_SECRET not configured')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  const state = buildSignedState(secret)

  const params = new URLSearchParams()
  params.set('client_id', clientId)
  params.set('merchant_id', merchantId)
  params.set('redirect_uri', REDIRECT_URI)
  if (employeeId) params.set('employee_id', employeeId)
  params.set('state', state)

  const response = NextResponse.redirect(`${authorizeBase}?${params.toString()}`)
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
