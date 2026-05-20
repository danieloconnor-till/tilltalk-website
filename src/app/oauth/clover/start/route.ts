import { NextResponse } from 'next/server'

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

  const params = new URLSearchParams()
  params.set('client_id', clientId)
  params.set('merchant_id', merchantId)
  params.set('redirect_uri', REDIRECT_URI)
  if (employeeId) params.set('employee_id', employeeId)

  return NextResponse.redirect(`${authorizeBase}?${params.toString()}`)
}
