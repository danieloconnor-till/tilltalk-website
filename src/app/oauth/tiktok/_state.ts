import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export const STATE_COOKIE_NAME = 'tiktok_oauth_state'
// The TikTok account-holder flow gets its OWN cookie name. Both flows live under
// /oauth/tiktok and the state cookie is single-use, so sharing one name would let
// whichever flow started second silently invalidate the first — a connect-advertiser
// then connect-TikTok-account sequence is the ordinary case, not an edge case.
export const ACCOUNT_STATE_COOKIE_NAME = 'tiktok_account_oauth_state'
export const STATE_COOKIE_PATH = '/oauth/tiktok'
export const STATE_COOKIE_MAX_AGE_SEC = 600

export function getStateSecret(): string | null {
  const secret = process.env.TIKTOK_OAUTH_STATE_SECRET ?? ''
  return secret ? secret : null
}

function signNonce(nonce: string, secret: string): string {
  return createHmac('sha256', secret).update(nonce).digest('base64url')
}

export function buildSignedState(secret: string): string {
  const nonce = randomUUID()
  return `${nonce}.${signNonce(nonce, secret)}`
}

export function verifySignedState(state: string, secret: string): boolean {
  const idx = state.indexOf('.')
  if (idx <= 0) return false
  const nonce = state.slice(0, idx)
  const sig = state.slice(idx + 1)
  if (!nonce || !sig) return false
  const expected = signNonce(nonce, secret)
  return constantTimeEquals(sig, expected)
}

export function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function readStateCookie(
  request: Request,
  name: string = STATE_COOKIE_NAME,
): string | null {
  const header = request.headers.get('cookie') ?? ''
  if (!header) return null
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    if (part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1))
    }
  }
  return null
}
