import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Server-side magic-link confirmation.
 *
 * The Clover OAuth callback generates a magic link via
 * `admin.generateLink({ type: 'magiclink' })` and forwards the browser here
 * with the `hashed_token`. We exchange it for a session server-side via
 * `verifyOtp`, which sets the auth cookie through the SSR cookie setter wired
 * in `@/lib/supabase/server`. The browser is then redirected to `next`
 * already authenticated — no client-side URL-fragment parsing.
 *
 * This avoids the implicit/hash flow pitfall where `#access_token=...` never
 * reaches the server, leaving `/dashboard` (a server component) with no cookie
 * and bouncing the user to `/login`.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash') ?? ''
  const type = searchParams.get('type') ?? ''
  const nextParam = searchParams.get('next') ?? '/dashboard'

  // Open-redirect guard: only allow relative paths. Reject absolute URLs and
  // protocol-relative (`//host`) values; fall back to /dashboard.
  const next =
    nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : '/dashboard'

  if (type !== 'magiclink') {
    console.warn('[auth-confirm] rejected unsupported type:', type)
    return NextResponse.json({ error: 'unsupported_type' }, { status: 400 })
  }

  if (!tokenHash) {
    console.warn('[auth-confirm] missing token_hash')
    return NextResponse.redirect(new URL('/login?error=auth_confirm_failed', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash })

  if (error) {
    console.error('[auth-confirm] verifyOtp failed:', error.message)
    return NextResponse.redirect(new URL('/login?error=auth_confirm_failed', request.url))
  }

  return NextResponse.redirect(new URL(next, request.url))
}
