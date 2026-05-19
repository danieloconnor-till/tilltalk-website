import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_PATH = '/review/meta-bk2xp9'

export async function GET(request: Request): Promise<NextResponse> {
  const cookieStore = await cookies()
  cookieStore.set('meta_review_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: COOKIE_PATH,
  })
  cookieStore.set('meta_review_state', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    path: COOKIE_PATH,
  })
  return NextResponse.redirect(new URL('/review/meta-bk2xp9/', request.url))
}
