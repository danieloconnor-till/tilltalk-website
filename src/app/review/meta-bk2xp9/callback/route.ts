import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_PATH = '/review/meta-bk2xp9'

function errorRedirect(request: Request, reason: string, detail?: string): NextResponse {
  const url = new URL('/review/meta-bk2xp9/error', request.url)
  url.searchParams.set('reason', reason)
  if (detail) url.searchParams.set('detail', detail.slice(0, 200))
  return NextResponse.redirect(url)
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const cookieStore = await cookies()
  const stateCookie = cookieStore.get('meta_review_state')?.value

  // Always clear the state cookie — it's single-use.
  cookieStore.set('meta_review_state', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: COOKIE_PATH,
  })

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return errorRedirect(request, 'invalid_state')
  }

  const appId = process.env.META_REVIEW_APP_ID
  const appSecret = process.env.META_REVIEW_APP_SECRET
  const redirectUri = process.env.META_REVIEW_REDIRECT_URI

  if (!appId || !appSecret || !redirectUri) {
    return errorRedirect(request, 'missing_config')
  }

  const tokenUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  let accessToken: string
  try {
    const res = await fetch(tokenUrl.toString(), { cache: 'no-store' })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string }
      }
      return errorRedirect(
        request,
        'token_exchange_failed',
        body?.error?.message ?? `HTTP ${res.status}`,
      )
    }
    const data = (await res.json()) as { access_token?: string }
    if (!data.access_token) {
      return errorRedirect(request, 'no_token')
    }
    accessToken = data.access_token
  } catch {
    return errorRedirect(request, 'network_error')
  }

  cookieStore.set('meta_review_token', accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 3600,
    path: COOKIE_PATH,
  })

  return NextResponse.redirect(new URL('/review/meta-bk2xp9/dashboard', request.url))
}
