import { NextResponse } from 'next/server'

const CLOVER_API_BASE = process.env.CLOVER_API_BASE ?? 'https://api.eu.clover.com'
const RAILWAY_URL     = process.env.RAILWAY_ONBOARDING_URL ?? ''
const ONBOARDING_KEY  = process.env.ONBOARDING_API_KEY ?? ''

function welcomeRedirect(params: Record<string, string>): NextResponse {
  const url = new URL('/welcome', 'https://tilltalk.ie')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return NextResponse.redirect(url.toString())
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)

  const merchantId = searchParams.get('merchant_id') ?? ''
  const employeeId = searchParams.get('employee_id') ?? ''
  const clientId   = searchParams.get('client_id')   ?? ''
  const code       = searchParams.get('code')         ?? ''

  if (!merchantId || !employeeId || !clientId || !code) {
    console.warn('[clover-oauth] missing params:', { merchantId, employeeId, clientId, code: !!code })
    return welcomeRedirect({ error: 'missing_params' })
  }

  const appId     = process.env.CLOVER_APP_ID     ?? ''
  const appSecret = process.env.CLOVER_APP_SECRET ?? ''

  if (!appId || !appSecret) {
    console.error('[clover-oauth] CLOVER_APP_ID or CLOVER_APP_SECRET not configured')
    return welcomeRedirect({ error: 'token_exchange_failed' })
  }

  // Exchange auth code for access token
  let accessToken: string
  let refreshToken: string | undefined
  let expiresIn: number | undefined

  try {
    const tokenRes = await fetch(`${CLOVER_API_BASE}/oauth/v2/token`, {
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
      expires_in?: number
    }

    if (!tokenData.access_token) {
      console.error('[clover-oauth] no access_token in response:', tokenData)
      return welcomeRedirect({ error: 'token_exchange_failed' })
    }

    accessToken  = tokenData.access_token
    refreshToken = tokenData.refresh_token
    expiresIn    = tokenData.expires_in
  } catch (err) {
    console.error('[clover-oauth] token exchange error:', err)
    return welcomeRedirect({ error: 'token_exchange_failed' })
  }

  // Hand off to Railway for encrypted storage
  if (!RAILWAY_URL || !ONBOARDING_KEY) {
    console.error('[clover-oauth] RAILWAY_ONBOARDING_URL or ONBOARDING_API_KEY not configured')
    return welcomeRedirect({ error: 'storage_failed' })
  }

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
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!railwayRes.ok) {
      const body = await railwayRes.json().catch(() => ({})) as { message?: string }
      console.error('[clover-oauth] Railway storage failed:', railwayRes.status, body)
      return welcomeRedirect({ error: 'storage_failed' })
    }
  } catch (err) {
    console.error('[clover-oauth] Railway request error:', err)
    return welcomeRedirect({ error: 'storage_failed' })
  }

  console.log('[clover-oauth] success for merchant_id:', merchantId)
  return welcomeRedirect({ merchant_id: merchantId })
}
