import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_PATH = '/connect/meta'

// TODO(multi-tenant): resolve the TillTalk client id from the authenticated
// connect session when client #2 lands. Bella Napoli is client 11.
const CLIENT_ID = 11

function errorRedirect(request: Request, reason: string, detail?: string): NextResponse {
  const url = new URL('/connect/meta/error', request.url)
  url.searchParams.set('reason', reason)
  if (detail) url.searchParams.set('detail', detail.slice(0, 200))
  return NextResponse.redirect(url)
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  const cookieStore = await cookies()
  const stateCookie = cookieStore.get('meta_connect_state')?.value

  // Always clear the state cookie — it's single-use.
  cookieStore.set('meta_connect_state', '', {
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
  const redirectUri = process.env.META_CONNECT_REDIRECT_URI
  const tilltalk1Base = process.env.TILLTALK1_BASE_URL
  const onboardingKey = process.env.TILLTALK1_ONBOARDING_KEY

  if (!appId || !appSecret || !redirectUri || !tilltalk1Base || !onboardingKey) {
    return errorRedirect(request, 'missing_config')
  }

  // a. Exchange the authorization code for a short-lived user token.
  const tokenUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  let shortToken: string
  try {
    const res = await fetch(tokenUrl.toString(), { cache: 'no-store' })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      return errorRedirect(request, 'token_exchange_failed', body?.error?.message ?? `HTTP ${res.status}`)
    }
    const data = (await res.json()) as { access_token?: string }
    if (!data.access_token) return errorRedirect(request, 'no_token')
    shortToken = data.access_token
  } catch {
    return errorRedirect(request, 'network_error')
  }

  // b. Exchange the short-lived token for a long-lived one (~60 days).
  const llUrl = new URL('https://graph.facebook.com/v25.0/oauth/access_token')
  llUrl.searchParams.set('grant_type', 'fb_exchange_token')
  llUrl.searchParams.set('client_id', appId)
  llUrl.searchParams.set('client_secret', appSecret)
  llUrl.searchParams.set('fb_exchange_token', shortToken)

  let longToken: string
  let expiresIn: number | null = null
  try {
    const res = await fetch(llUrl.toString(), { cache: 'no-store' })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      return errorRedirect(request, 'long_lived_exchange_failed', body?.error?.message ?? `HTTP ${res.status}`)
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number }
    if (!data.access_token) return errorRedirect(request, 'long_lived_exchange_failed')
    longToken = data.access_token
    expiresIn = typeof data.expires_in === 'number' ? data.expires_in : null
  } catch {
    return errorRedirect(request, 'network_error')
  }

  // c. Fetch user identity + granted scopes with the long-lived token.
  // Both are best-effort — a booking is still stored even if these are empty.
  let fbUserId: string | null = null
  let fbUserName = ''
  try {
    const meUrl = new URL('https://graph.facebook.com/v25.0/me')
    meUrl.searchParams.set('fields', 'id,name')
    meUrl.searchParams.set('access_token', longToken)
    const res = await fetch(meUrl.toString(), { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as { id?: string; name?: string }
      fbUserId = data.id ?? null
      fbUserName = data.name ?? ''
    }
  } catch {
    // non-fatal
  }

  let scopes = ''
  try {
    const permUrl = new URL('https://graph.facebook.com/v25.0/me/permissions')
    permUrl.searchParams.set('access_token', longToken)
    const res = await fetch(permUrl.toString(), { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as { data?: { permission: string; status: string }[] }
      scopes = (data.data ?? [])
        .filter((p) => p.status === 'granted')
        .map((p) => p.permission)
        .join(',')
    }
  } catch {
    // non-fatal
  }

  // d. Persist the long-lived token server-side in tilltalk1's encrypted store.
  // The token never touches the browser — no cookie, no query param.
  try {
    const res = await fetch(`${tilltalk1Base}/internal/meta-oauth-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Onboarding-Key': onboardingKey,
      },
      cache: 'no-store',
      body: JSON.stringify({
        client_id: CLIENT_ID,
        access_token: longToken,
        fb_user_id: fbUserId,
        scopes: scopes || null,
        expires_in: expiresIn,
      }),
    })
    if (!res.ok) {
      return errorRedirect(request, 'token_store_failed', `HTTP ${res.status}`)
    }
  } catch {
    return errorRedirect(request, 'token_store_failed')
  }

  // e. Success — redirect back to the connect page's success state.
  const successUrl = new URL('/connect/meta', request.url)
  successUrl.searchParams.set('connected', '1')
  if (fbUserName) successUrl.searchParams.set('name', fbUserName)
  if (scopes) successUrl.searchParams.set('scopes', scopes)
  return NextResponse.redirect(successUrl)
}
