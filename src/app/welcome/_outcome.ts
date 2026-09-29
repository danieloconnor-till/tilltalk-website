/**
 * What /welcome should show, decided from the callback's query string.
 *
 * Separated from page.tsx so the decision is unit-testable without rendering a
 * server component — the same reason the OAuth folders keep `_state.ts` apart
 * from their routes.
 *
 * Every OAuth callback in src/app/oauth/ lands the browser on /welcome with one
 * status param. The page understood only Clover's, so a perfectly successful
 * TikTok or Google connection rendered "Something went wrong" (verified live
 * 2026-09-29 on ?tiktok=connected, ?tiktok_account=connected and
 * ?google=connected). A success that reads as a failure is worse than a plain
 * failure: the owner retries a connection that already worked.
 */

export type ProviderKey = 'clover' | 'tiktok' | 'tiktok_account' | 'google'

export type WelcomeOutcome =
  | { kind: 'connected'; provider: ProviderKey }
  | { kind: 'pending'; provider: ProviderKey }
  | { kind: 'error' }

export interface WelcomeParams {
  merchant_id?: string
  tiktok?: string
  tiktok_account?: string
  google?: string
  error?: string
}

/**
 * Status params carrying 'connected' | 'pending_credentials', in the order they
 * are checked. Clover is absent because it signals success differently — see
 * resolveWelcomeOutcome.
 *
 * Adding a provider means adding it here and to CONNECTED_MESSAGE; the page
 * needs no change. A param not listed here is not a status this page knows, and
 * an unknown status value is deliberately NOT treated as success.
 */
const STATUS_PARAMS: readonly Exclude<ProviderKey, 'clover'>[] = [
  'tiktok',
  'tiktok_account',
  'google',
]

export const CONNECTED_MESSAGE: Record<ProviderKey, string> = {
  // Unchanged from the original page — Clover's copy is live and referenced by
  // the App Market listing review.
  clover:
    "Your Clover account is connected. We'll send setup instructions once your account is activated.",
  tiktok:
    'Your TikTok Ads account is connected. TillTalk can now run and measure your TikTok campaigns.',
  // The account-holder flow authorises the TikTok account itself, not an ad
  // account — it is what lets TillTalk promote the venue's own posts.
  tiktok_account:
    'Your TikTok account is connected. TillTalk can now promote your own posts as Spark Ads.',
  google:
    'Your Google Ads account is connected. TillTalk can now run and measure your Search campaigns.',
}

export const PENDING_MESSAGE: Record<ProviderKey, string> = {
  clover:
    "Your Clover authorisation was received. We'll finish the connection and be in touch.",
  tiktok:
    "Your TikTok authorisation was received. We'll finish the connection and be in touch — nothing more is needed from you.",
  tiktok_account:
    "Your TikTok account authorisation was received. We'll finish the connection and be in touch — nothing more is needed from you.",
  google:
    "Your Google authorisation was received. We'll finish the connection and be in touch — nothing more is needed from you.",
}

/**
 * Decide what to render.
 *
 * `error` wins over everything, preserving the original page's precedence: a
 * callback that reports a failure is never rendered as a success, whatever else
 * is in the URL.
 *
 * Clover is checked separately because it does not send a status param at all —
 * it echoes `merchant_id`, and its presence IS the success signal. That
 * asymmetry is why this cannot just be a lookup.
 */
export function resolveWelcomeOutcome(params: WelcomeParams): WelcomeOutcome {
  if (params.error) return { kind: 'error' }

  if (params.merchant_id) return { kind: 'connected', provider: 'clover' }

  for (const key of STATUS_PARAMS) {
    const value = params[key]
    if (value === 'connected') return { kind: 'connected', provider: key }
    if (value === 'pending_credentials') return { kind: 'pending', provider: key }
  }

  // No recognised signal — including an unknown value on a known param. Falling
  // through to the error state is the safe direction: claiming a connection that
  // may not exist is the worse mistake.
  return { kind: 'error' }
}
