import { NextRequest, NextResponse } from 'next/server'

// GET /ref/[code]
// Sets a 30-day attribution cookie and redirects to the signup page.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tilltalk.ie'
  const destination = `${siteUrl}/signup?ref=${encodeURIComponent(code)}`

  const response = NextResponse.redirect(destination)

  // 30-day attribution cookie
  response.cookies.set('tilltalk_referral', code, {
    httpOnly: false,          // readable by client JS for display
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,  // 30 days in seconds
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}
