import { describe, it, expect } from 'vitest'
import { shouldRenderFallback } from '../lib/fallback'

describe('shouldRenderFallback', () => {
  it('triggers for non-2xx responses', () => {
    const d = shouldRenderFallback({
      ok: false,
      status: 400,
      body: '{"error":{"message":"bad"}}',
    })
    expect(d.trigger).toBe(true)
    expect(d.reason).toMatch(/400/)
  })

  it('triggers for 2xx with empty data array', () => {
    const d = shouldRenderFallback({
      ok: true,
      status: 200,
      body: '{"data":[]}',
    })
    expect(d.trigger).toBe(true)
    expect(d.reason).toMatch(/empty result set/)
  })

  it('does NOT trigger for 2xx with populated data', () => {
    const d = shouldRenderFallback({
      ok: true,
      status: 200,
      body: '{"data":[{"id":"1","message":"hello"}]}',
    })
    expect(d.trigger).toBe(false)
  })

  it('triggers for 2xx with a minimal profile stub', () => {
    const d = shouldRenderFallback({
      ok: true,
      status: 200,
      body: '{"id":"123","name":"foo"}',
    })
    expect(d.trigger).toBe(true)
    expect(d.reason).toMatch(/minimal profile stub/)
  })

  it('triggers for 2xx with unparseable body', () => {
    const d = shouldRenderFallback({
      ok: true,
      status: 200,
      body: 'not json',
    })
    expect(d.trigger).toBe(true)
    expect(d.reason).toMatch(/unexpected response shape/)
  })

  it('triggers for network errors (status 0)', () => {
    const d = shouldRenderFallback({
      ok: false,
      status: 0,
      body: 'Network error: ECONNREFUSED',
    })
    expect(d.trigger).toBe(true)
    expect(d.reason).toMatch(/network error/)
  })
})
