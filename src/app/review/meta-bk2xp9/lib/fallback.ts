export type GraphResponse = {
  ok: boolean
  status: number
  body: string
}

export type FallbackDecision = {
  trigger: boolean
  reason: string
}

const MINIMAL_STUB_BODY_MAX = 200
const MINIMAL_STUB_ALLOWED_KEYS = new Set(['id', 'name', 'username'])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function shouldRenderFallback(liveResponse: GraphResponse): FallbackDecision {
  // Network error: status 0 in our wrapper convention.
  if (liveResponse.status === 0) {
    return { trigger: true, reason: 'a network error' }
  }

  // Non-2xx: extract Graph error message if available.
  if (liveResponse.status < 200 || liveResponse.status >= 300) {
    let errMessage: string | undefined
    try {
      const parsed = JSON.parse(liveResponse.body)
      if (
        isPlainObject(parsed) &&
        isPlainObject(parsed.error) &&
        typeof parsed.error.message === 'string'
      ) {
        errMessage = parsed.error.message
      }
    } catch {
      // ignore parse failure
    }
    return {
      trigger: true,
      reason: errMessage
        ? `a ${liveResponse.status} error: ${errMessage}`
        : `a ${liveResponse.status} error`,
    }
  }

  // 2xx — parse the body.
  let parsed: unknown
  try {
    parsed = JSON.parse(liveResponse.body)
  } catch {
    return { trigger: true, reason: 'an unexpected response shape' }
  }

  // 2xx with empty top-level data array → trigger.
  if (
    isPlainObject(parsed) &&
    Array.isArray(parsed.data) &&
    parsed.data.length === 0
  ) {
    return { trigger: true, reason: 'an empty result set' }
  }

  // 2xx with short body AND only minimal-stub keys → trigger.
  if (
    isPlainObject(parsed) &&
    liveResponse.body.length < MINIMAL_STUB_BODY_MAX
  ) {
    const keys = Object.keys(parsed)
    if (
      keys.length > 0 &&
      keys.every((k) => MINIMAL_STUB_ALLOWED_KEYS.has(k))
    ) {
      return { trigger: true, reason: 'a minimal profile stub' }
    }
  }

  return { trigger: false, reason: '' }
}
