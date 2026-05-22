import { describe, it, expect } from 'vitest'
import { redactSensitive } from '../redact'

describe('redactSensitive', () => {
  it('redacts a top-level access_token', () => {
    const out = redactSensitive({ access_token: 'EAAxxxxx', id: '12345' })
    expect(out).toEqual({ access_token: '[REDACTED]', id: '12345' })
  })

  it('redacts a nested access_token inside a data array entry', () => {
    const out = redactSensitive({
      data: [
        { id: '1', name: 'Bella', access_token: 'EAAyyy' },
        { id: '2', name: 'Napoli', access_token: 'EAAzzz' },
      ],
      paging: { cursors: { before: 'B', after: 'A' } },
    })
    expect(out).toEqual({
      data: [
        { id: '1', name: 'Bella', access_token: '[REDACTED]' },
        { id: '2', name: 'Napoli', access_token: '[REDACTED]' },
      ],
      paging: { cursors: { before: 'B', after: 'A' } },
    })
  })

  it('does NOT redact id, user_id, page_id, business_id, name', () => {
    const out = redactSensitive({
      id: '106478188163979',
      user_id: 'u_1',
      page_id: 'p_1',
      business_id: '1488648489486228',
      name: 'Bella Napoli',
    })
    expect(out).toEqual({
      id: '106478188163979',
      user_id: 'u_1',
      page_id: 'p_1',
      business_id: '1488648489486228',
      name: 'Bella Napoli',
    })
  })

  it('redacts case-insensitively (Access_Token, ACCESS_TOKEN)', () => {
    const out1 = redactSensitive({ Access_Token: 'tok1' })
    const out2 = redactSensitive({ ACCESS_TOKEN: 'tok2' })
    expect(out1).toEqual({ Access_Token: '[REDACTED]' })
    expect(out2).toEqual({ ACCESS_TOKEN: '[REDACTED]' })
  })

  it('redacts every entry of an array of objects', () => {
    const out = redactSensitive([
      { access_token: 'a' },
      { access_token: 'b' },
      { access_token: 'c' },
    ])
    expect(out).toEqual([
      { access_token: '[REDACTED]' },
      { access_token: '[REDACTED]' },
      { access_token: '[REDACTED]' },
    ])
  })

  it('returns primitives unchanged', () => {
    expect(redactSensitive('plain string')).toBe('plain string')
    expect(redactSensitive(42)).toBe(42)
    expect(redactSensitive(true)).toBe(true)
    expect(redactSensitive(null)).toBe(null)
    expect(redactSensitive(undefined)).toBe(undefined)
  })

  it('returns empty object and empty array as themselves', () => {
    expect(redactSensitive({})).toEqual({})
    expect(redactSensitive([])).toEqual([])
  })

  it('redacts all other sensitive keys (client_secret, app_secret, refresh_token, id_token, secret)', () => {
    const out = redactSensitive({
      client_secret: 'cs',
      app_secret: 'as',
      refresh_token: 'rt',
      id_token: 'it',
      secret: 's',
      something_else: 'kept',
    })
    expect(out).toEqual({
      client_secret: '[REDACTED]',
      app_secret: '[REDACTED]',
      refresh_token: '[REDACTED]',
      id_token: '[REDACTED]',
      secret: '[REDACTED]',
      something_else: 'kept',
    })
  })

  it('does not mutate the input', () => {
    const input = { access_token: 'EAA', nested: { access_token: 'EAB' } }
    const snapshot = JSON.parse(JSON.stringify(input))
    redactSensitive(input)
    expect(input).toEqual(snapshot)
  })

  it('preserves key order', () => {
    const input = { id: '1', access_token: 'EAA', name: 'Bella', extra: 'x' }
    const out = redactSensitive(input) as Record<string, unknown>
    expect(Object.keys(out)).toEqual(['id', 'access_token', 'name', 'extra'])
  })
})
