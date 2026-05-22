/**
 * Render-time redaction for sensitive JSON fields shown on the Meta review
 * demo dashboard. The captured snapshot files on disk are left untouched —
 * redaction happens on the way to the rendered <pre> block.
 *
 * Matches keys by case-insensitive *exact name*, not substring. Public
 * identifiers (id, user_id, page_id, business_id, …) are deliberately not
 * matched — reviewers need them to verify call correctness.
 */

const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'access_token',
  'client_secret',
  'app_secret',
  'refresh_token',
  'id_token',
  'secret',
])

const REDACTED = '[REDACTED]'

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitive)
  }
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        out[k] = REDACTED
      } else {
        out[k] = redactSensitive(v)
      }
    }
    return out
  }
  return value
}
