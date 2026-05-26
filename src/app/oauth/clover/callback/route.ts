import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import {
  STATE_COOKIE_NAME,
  STATE_COOKIE_PATH,
  constantTimeEquals,
  getStateSecret,
  readStateCookie,
  verifySignedState,
} from '../_state'

const RAILWAY_URL    = process.env.RAILWAY_ONBOARDING_URL ?? ''
const ONBOARDING_KEY = process.env.ONBOARDING_API_KEY ?? ''

function clearStateCookie<T extends NextResponse>(response: T): T {
  response.cookies.delete({ name: STATE_COOKIE_NAME, path: STATE_COOKIE_PATH })
  return response
}

function welcomeRedirect(params: Record<string, string>): NextResponse {
  const url = new URL('/welcome', 'https://tilltalk.ie')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return clearStateCookie(NextResponse.redirect(url.toString()))
}

function syntheticEmail(merchantId: string): string {
  // Placeholder — merchant updates real email in dashboard later. Lowercase
  // so we never get case-mismatch lookups in profiles.
  return `clover-${merchantId.toLowerCase()}@tilltalk.ie`
}

/**
 * Auto-provisioning path: create a Supabase user keyed off the synthetic
 * email, insert a profiles row, link the user to the auto-provisioned
 * Railway client, and return a magic-link URL that signs the user in and
 * lands them in /dashboard.
 *
 * Returns the magic-link URL on success, or null if user creation failed
 * (caller falls back to a welcome redirect with an error param).
 *
 * The link-endpoint call is best-effort: if it fails, we still return the
 * magic link so the merchant lands in the dashboard with a working session.
 * Their chat will return 404 until the link is repaired manually, but the
 * account is recoverable in Supabase Studio.
 */
async function autoProvisionAndSignIn(args: {
  merchantId: string
  clientId: number
}): Promise<string | null> {
  const email = syntheticEmail(args.merchantId)
  const admin = createServiceRoleClient()

  // 1. Create the Supabase auth user (or find an existing one for this
  //    exact synthetic email — happens on reconnect after a hard-delete).
  let userId: string | null = null

  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      clover_merchant_id: args.merchantId,
      provisioned_via: 'clover_oauth',
    },
  })

  if (createErr) {
    const msg = (createErr.message || '').toLowerCase()
    if (msg.includes('already') && (msg.includes('registered') || msg.includes('exists'))) {
      // User exists from a prior install — look up via profiles (same email).
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()
      if (existing?.id) {
        userId = existing.id as string
      } else {
        console.error(
          '[clover-oauth] auto-provision: createUser said already-registered ' +
            "but profiles lookup returned no row for " + email,
        )
        return null
      }
    } else {
      console.error('[clover-oauth] auto-provision: createUser failed:', createErr)
      return null
    }
  } else {
    userId = createData.user?.id ?? null
    if (!userId) {
      console.error('[clover-oauth] auto-provision: createUser returned no user id')
      return null
    }

    // 2. Insert the profiles row — mirrors the shape from /api/signup.
    //    Best-effort: if this fails (e.g. unique-constraint race on email),
    //    log and proceed; the merchant can still sign in and the dashboard
    //    server component will redirect appropriately.
    const now = new Date()
    const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    const { error: profileErr } = await admin.from('profiles').insert({
      id: userId,
      email,
      full_name: 'Clover Merchant',
      restaurant_name: 'Clover Merchant',
      pos_type: 'clover',
      whatsapp_number: null,
      plan: 'trial',
      trial_start: now.toISOString(),
      trial_end: fourteenDays.toISOString(),
    })
    if (profileErr) {
      console.error('[clover-oauth] auto-provision: profiles insert failed (non-fatal):', profileErr)
    }
  }

  // 3. Link the Supabase user to the Railway client (best-effort).
  try {
    const linkRes = await fetch(`${RAILWAY_URL}/api/onboard/clover/link-supabase-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Onboarding-Key': ONBOARDING_KEY,
      },
      body: JSON.stringify({
        supabase_user_id: userId,
        client_id: args.clientId,
        merchant_id: args.merchantId,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!linkRes.ok) {
      const body = await linkRes.text().catch(() => '')
      console.error(
        '[clover-oauth] auto-provision: link-supabase-user returned',
        linkRes.status, body,
      )
    }
  } catch (err) {
    console.error('[clover-oauth] auto-provision: link-supabase-user request error:', err)
  }

  // 4. Generate a magic link and route the browser through our own
  //    /auth/confirm server route using the hashed_token. The implicit/hash
  //    flow (redirecting straight to action_link) lands tokens in the URL
  //    fragment, which never reaches the server — so /dashboard (a server
  //    component reading the auth cookie) would bounce to /login. Instead we
  //    pass hashed_token to /auth/confirm, which calls verifyOtp server-side,
  //    sets the cookie, then redirects to next (/dashboard). redirectTo is
  //    kept for clarity but is not the operative destination.
  //    See decisions/2026-05-26-adr-magic-link-server-side-confirm-flow.md.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: 'https://tilltalk.ie/dashboard',
    },
  })
  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error('[clover-oauth] auto-provision: magic-link generation failed:', linkErr)
    return null
  }
  const params = new URLSearchParams({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
    next: '/dashboard',
  })
  return `https://tilltalk.ie/auth/confirm?${params.toString()}`
}

function stateError(error: 'missing_state' | 'invalid_state' | 'server_misconfigured', status: number): NextResponse {
  return clearStateCookie(NextResponse.json({ error }, { status }))
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)

  const merchantId = searchParams.get('merchant_id') ?? ''
  const employeeId = searchParams.get('employee_id') ?? ''
  const clientId   = searchParams.get('client_id')   ?? ''
  const code       = searchParams.get('code')         ?? ''
  const state      = searchParams.get('state') ?? ''
  const cookieState = readStateCookie(request) ?? ''

  const stateSecret = getStateSecret()
  if (!stateSecret) {
    console.error('[clover-oauth] CLOVER_OAUTH_STATE_SECRET not configured')
    return stateError('server_misconfigured', 500)
  }

  if (!state || !cookieState) {
    console.warn('[clover-oauth] state invalid — missing')
    return stateError('missing_state', 400)
  }
  if (!constantTimeEquals(state, cookieState)) {
    console.warn('[clover-oauth] state invalid — cookie mismatch')
    return stateError('invalid_state', 400)
  }
  if (!verifySignedState(state, stateSecret)) {
    console.warn('[clover-oauth] state invalid — bad signature')
    return stateError('invalid_state', 400)
  }

  if (!merchantId || !employeeId || !clientId || !code) {
    console.warn('[clover-oauth] missing params:', { merchantId, employeeId, clientId, code: !!code })
    return welcomeRedirect({ error: 'missing_params' })
  }

  // Detect sandbox: client_id matches CLOVER_SANDBOX_APP_ID
  const sandboxAppId     = process.env.CLOVER_SANDBOX_APP_ID ?? ''
  const isSandbox        = !!sandboxAppId && clientId === sandboxAppId

  const appId     = isSandbox
    ? sandboxAppId
    : (process.env.CLOVER_APP_ID ?? '')
  const appSecret = isSandbox
    ? (process.env.CLOVER_SANDBOX_APP_SECRET ?? '')
    : (process.env.CLOVER_APP_SECRET ?? '')
  const apiBase   = isSandbox
    ? (process.env.CLOVER_SANDBOX_BASE_URL ?? 'https://apisandbox.dev.clover.com')
    : (process.env.CLOVER_API_BASE ?? 'https://api.eu.clover.com')

  if (!appId || !appSecret) {
    console.error('[clover-oauth] app credentials not configured — isSandbox:', isSandbox)
    return welcomeRedirect({ error: 'token_exchange_failed' })
  }

  // Exchange auth code for access token
  let accessToken: string
  let refreshToken: string | undefined
  let expiresIn: number | undefined

  try {
    const tokenRes = await fetch(`${apiBase}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: appId, client_secret: appSecret, code }),
      signal: AbortSignal.timeout(10000),
    })

    if (!tokenRes.ok) {
      const body = await tokenRes.text().catch(() => '')
      console.error('[clover-oauth] token exchange failed:', tokenRes.status, body)
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }

    const tokenData = await tokenRes.json() as {
      access_token?: string
      refresh_token?: string
      access_token_expiration?: number    // Clover v2: absolute epoch seconds
      expires_in?: number                 // legacy/alternate: relative seconds
    }

    if (!tokenData.access_token) {
      console.error('[clover-oauth] no access_token in response:', tokenData)
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }

    accessToken  = tokenData.access_token
    refreshToken = tokenData.refresh_token

    // Clover v2 returns `access_token_expiration` as an absolute epoch (seconds).
    // We convert it to `expires_in` (seconds-from-now) for the Railway payload
    // because that's the shape the DB layer (`upsert_sandbox_location` and
    // `onboard_clover` auto-provision) already understands. Fall back to
    // `expires_in` if a future Clover response shape ever sends it directly.
    if (typeof tokenData.access_token_expiration === 'number') {
      const nowSec = Math.floor(Date.now() / 1000)
      expiresIn = Math.max(0, tokenData.access_token_expiration - nowSec)
    } else if (typeof tokenData.expires_in === 'number') {
      expiresIn = tokenData.expires_in
    } else {
      console.warn(
        '[clover-oauth] token response has no access_token_expiration or expires_in:',
        Object.keys(tokenData),
      )
      expiresIn = undefined
    }
  } catch (err) {
    console.error('[clover-oauth] token exchange error:', err)
    return welcomeRedirect({ error: 'token_exchange_failed' })
  }

  // Hand off to Railway for encrypted storage
  if (!RAILWAY_URL || !ONBOARDING_KEY) {
    console.error('[clover-oauth] RAILWAY_ONBOARDING_URL or ONBOARDING_API_KEY not configured')
    return welcomeRedirect({ error: 'storage_failed' })
  }

  let railwayBody: {
    status?: string
    auto_provisioned?: boolean
    client_id?: number
    location_id?: number
    merchant_id?: string
    grace_recovered?: boolean
    is_sandbox?: boolean
    message?: string
  } = {}

  try {
    const railwayRes = await fetch(`${RAILWAY_URL}/api/onboard/clover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Onboarding-Key': ONBOARDING_KEY,
      },
      body: JSON.stringify({
        merchant_id:   merchantId,
        employee_id:   employeeId,
        access_token:  accessToken,
        refresh_token: refreshToken,
        expires_in:    expiresIn,
        oauth_app_id:  appId,
        is_sandbox:    isSandbox,
      }),
      signal: AbortSignal.timeout(12000),
    })

    railwayBody = await railwayRes.json().catch(() => ({})) as typeof railwayBody

    if (!railwayRes.ok) {
      console.error('[clover-oauth] Railway storage failed:', railwayRes.status, railwayBody)
      return welcomeRedirect({ error: 'storage_failed' })
    }
  } catch (err) {
    console.error('[clover-oauth] Railway request error:', err)
    return welcomeRedirect({ error: 'storage_failed' })
  }

  // Brand-new merchant — Railway just provisioned a client + location. Spin
  // up the Supabase user, link it, sign them in via magic link. Falls
  // through to the welcome redirect if anything fatal blows up (e.g.
  // createUser failure with no recoverable path).
  if (railwayBody?.auto_provisioned === true && railwayBody.client_id) {
    console.log(
      '[clover-oauth] auto-provisioned merchant_id:', merchantId,
      'client_id:', railwayBody.client_id,
      'location_id:', railwayBody.location_id,
    )
    const magicLinkUrl = await autoProvisionAndSignIn({
      merchantId,
      clientId: railwayBody.client_id,
    })
    if (!magicLinkUrl) {
      return welcomeRedirect({ error: 'user_creation_failed' })
    }
    return clearStateCookie(NextResponse.redirect(magicLinkUrl))
  }

  // Existing merchant, grace-recovery, or sandbox — unchanged behaviour.
  console.log('[clover-oauth] success for merchant_id:', merchantId, '| sandbox:', isSandbox)
  return welcomeRedirect({ merchant_id: merchantId })
}
