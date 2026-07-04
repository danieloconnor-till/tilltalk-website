import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

// Approved scopes only — every one below has Advanced Access. Nothing rejected
// in review goes into this production dialog. Source of truth for the connect
// OAuth scope string.
const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_ads',
  'pages_manage_metadata',
  'pages_messaging',
  'leads_retrieval',
  'ads_management',
  'business_management',
].join(',')

const COOKIE_PATH = '/connect/meta'

function errorRedirect(request: Request, reason: string): NextResponse {
  const url = new URL('/connect/meta/error', request.url)
  url.searchParams.set('reason', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: Request): Promise<NextResponse> {
  const appId = process.env.META_REVIEW_APP_ID
  const redirectUri = process.env.META_CONNECT_REDIRECT_URI

  if (!appId || !redirectUri) {
    return errorRedirect(request, 'missing_config')
  }

  const state = crypto.randomBytes(32).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('meta_connect_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: COOKIE_PATH,
  })

  const dialog = new URL('https://www.facebook.com/v25.0/dialog/oauth')
  dialog.searchParams.set('client_id', appId)
  dialog.searchParams.set('redirect_uri', redirectUri)
  dialog.searchParams.set('scope', SCOPES)
  dialog.searchParams.set('response_type', 'code')
  dialog.searchParams.set('state', state)

  return NextResponse.redirect(dialog.toString())
}
