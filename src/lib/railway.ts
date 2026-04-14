/**
 * Shared helpers for calling the Railway bot API.
 * Used by toggle-active, billing webhook, and trial-expiry cron.
 */

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const RAILWAY_KEY = process.env.ONBOARDING_API_KEY || ''

// ── Deactivation ─────────────────────────────────────────────────────────────

/**
 * Set clients.active = FALSE in Railway for the given Supabase user.
 * Non-fatal — logs on error but never throws.
 */
export async function railwayDeactivate(
  supabaseUserId: string,
): Promise<{ ok: boolean; wasActive: boolean }> {
  try {
    const res = await fetch(`${RAILWAY_URL}/api/manage/deactivate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': RAILWAY_KEY },
      body:    JSON.stringify({ supabase_user_id: supabaseUserId }),
      signal:  AbortSignal.timeout(8000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[railway] deactivate failed:', res.status, data)
      return { ok: false, wasActive: false }
    }
    return { ok: true, wasActive: data.was_active ?? false }
  } catch (err) {
    console.error('[railway] deactivate error:', err)
    return { ok: false, wasActive: false }
  }
}

// ── Reactivation ─────────────────────────────────────────────────────────────

/**
 * Set clients.active = TRUE in Railway for the given Supabase user.
 * Non-fatal — logs on error but never throws.
 */
export async function railwayReactivate(
  supabaseUserId: string,
): Promise<{ ok: boolean; wasInactive: boolean }> {
  try {
    const res = await fetch(`${RAILWAY_URL}/api/manage/reactivate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': RAILWAY_KEY },
      body:    JSON.stringify({ supabase_user_id: supabaseUserId }),
      signal:  AbortSignal.timeout(8000),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error('[railway] reactivate failed:', res.status, data)
      return { ok: false, wasInactive: false }
    }
    return { ok: true, wasInactive: data.was_inactive ?? false }
  } catch (err) {
    console.error('[railway] reactivate error:', err)
    return { ok: false, wasInactive: false }
  }
}

// ── Data integrity check ──────────────────────────────────────────────────────

/**
 * Verify Railway still has locations + numbers for this user after reactivation.
 * Non-blocking — logs to Sentry if data appears missing.
 */
export async function verifyRailwayDataIntegrity(
  supabaseUserId: string,
  email: string,
  profileId: string,
): Promise<void> {
  try {
    const [locRes, numRes] = await Promise.all([
      fetch(`${RAILWAY_URL}/api/manage/locations?supabase_user_id=${encodeURIComponent(supabaseUserId)}`,
        { headers: { 'X-Onboarding-Key': RAILWAY_KEY }, signal: AbortSignal.timeout(8000) }),
      fetch(`${RAILWAY_URL}/api/manage/numbers?supabase_user_id=${encodeURIComponent(supabaseUserId)}`,
        { headers: { 'X-Onboarding-Key': RAILWAY_KEY }, signal: AbortSignal.timeout(8000) }),
    ])
    const locData = locRes.ok ? await locRes.json().catch(() => ({})) : {}
    const numData = numRes.ok ? await numRes.json().catch(() => ({})) : {}
    const locationCount = (locData.locations ?? []).length
    const numberCount   = (numData.numbers   ?? []).length
    if (locationCount === 0 && numberCount === 0) {
      const msg = `Reactivated account has no Railway data — possible orphaned profile`
      console.warn(`[railway] ${msg}: email=${email} profileId=${profileId}`)
      // Dynamic Sentry import so this module has no hard dep on @sentry/nextjs
      import('@sentry/nextjs').then(Sentry => {
        Sentry.captureMessage(msg, {
          level: 'warning',
          extra: { email, profileId, supabaseUserId },
        })
      }).catch(() => {/* sentry not available */})
    } else {
      console.log(`[railway] data integrity OK: ${locationCount} location(s), ${numberCount} number(s) for ${email}`)
    }
  } catch (err) {
    console.warn('[railway] data integrity check error:', err)
  }
}
