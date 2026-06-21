import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

// The 17 permissions covered by this demo (instagram_manage_messages was
// dropped from the submission — it cannot be demonstrated at standard access).
// Kept here as the OAuth scope string source of truth so the dashboard panels
// and the OAuth dialog stay in sync.
const SCOPES = [
  // Tab 1 — Pages & Content
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_ads',
  'pages_manage_engagement',
  'pages_read_user_content',
  'pages_manage_metadata',
  'pages_messaging',
  // Tab 2 — Insights & Attribution
  'read_insights',
  'attribution_read',
  // Tab 3 — Ads & Business
  'ads_read',
  'ads_management',
  'business_management',
  'leads_retrieval',
  // Tab 4 — Instagram
  'instagram_basic',
  'instagram_manage_comments',
  'instagram_manage_insights',
  'instagram_content_publish',
].join(',')

const COOKIE_PATH = '/review/meta-bk2xp9'

function errorRedirect(request: Request, reason: string): NextResponse {
  const url = new URL('/review/meta-bk2xp9/error', request.url)
  url.searchParams.set('reason', reason)
  return NextResponse.redirect(url)
}

export async function GET(request: Request): Promise<NextResponse> {
  const appId = process.env.META_REVIEW_APP_ID
  const redirectUri = process.env.META_REVIEW_REDIRECT_URI

  if (!appId || !redirectUri) {
    return errorRedirect(request, 'missing_config')
  }

  const state = crypto.randomBytes(32).toString('hex')

  const cookieStore = await cookies()
  cookieStore.set('meta_review_state', state, {
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
