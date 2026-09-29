import { describe, it, expect } from 'vitest'
import {
  CONNECTED_MESSAGE,
  PENDING_MESSAGE,
  resolveWelcomeOutcome,
  type ProviderKey,
} from '../_outcome'

const ALL_PROVIDERS: ProviderKey[] = ['clover', 'tiktok', 'tiktok_account', 'google']

describe('resolveWelcomeOutcome', () => {
  // ----------------------------------------------------------------- success

  it('treats a merchant_id as a Clover success (unchanged behaviour)', () => {
    expect(resolveWelcomeOutcome({ merchant_id: 'MERCH1' })).toEqual({
      kind: 'connected',
      provider: 'clover',
    })
  })

  it.each([
    ['tiktok', 'tiktok'],
    ['tiktok_account', 'tiktok_account'],
    ['google', 'google'],
  ] as const)('treats %s=connected as a success', (param, provider) => {
    expect(resolveWelcomeOutcome({ [param]: 'connected' })).toEqual({
      kind: 'connected',
      provider,
    })
  })

  // The regression this module exists for: verified live 2026-09-29, every one of
  // these rendered "Something went wrong".
  it.each(['tiktok', 'tiktok_account', 'google'] as const)(
    '%s=connected is NOT the error state',
    (param) => {
      expect(resolveWelcomeOutcome({ [param]: 'connected' }).kind).not.toBe('error')
    },
  )

  // ----------------------------------------------------------------- pending

  it.each(['tiktok', 'tiktok_account', 'google'] as const)(
    '%s=pending_credentials is its own state, neither success nor error',
    (param) => {
      const outcome = resolveWelcomeOutcome({ [param]: 'pending_credentials' })
      expect(outcome.kind).toBe('pending')
      expect(outcome.kind).not.toBe('error')
      expect(outcome.kind).not.toBe('connected')
    },
  )

  // ------------------------------------------------------------------- error

  it('shows the error state when nothing is in the query string', () => {
    expect(resolveWelcomeOutcome({})).toEqual({ kind: 'error' })
  })

  it.each([
    'missing_params',
    'token_exchange_failed',
    'storage_failed',
    'user_creation_failed',
  ])('shows the error state for error=%s', (error) => {
    expect(resolveWelcomeOutcome({ error })).toEqual({ kind: 'error' })
  })

  it('lets error win over a success param — a reported failure is never a success', () => {
    expect(
      resolveWelcomeOutcome({ tiktok: 'connected', error: 'storage_failed' }),
    ).toEqual({ kind: 'error' })
    expect(
      resolveWelcomeOutcome({ merchant_id: 'MERCH1', error: 'storage_failed' }),
    ).toEqual({ kind: 'error' })
  })

  it('does not treat an unknown status value as success', () => {
    expect(resolveWelcomeOutcome({ tiktok: 'garbage' })).toEqual({ kind: 'error' })
    expect(resolveWelcomeOutcome({ google: '1' })).toEqual({ kind: 'error' })
    // An empty value is not a connection either.
    expect(resolveWelcomeOutcome({ tiktok: '' })).toEqual({ kind: 'error' })
  })

  it('does not treat an unrelated param as success', () => {
    expect(
      resolveWelcomeOutcome({ utm_source: 'email' } as Record<string, string>),
    ).toEqual({ kind: 'error' })
  })

  // ------------------------------------------------------------------ copy

  it('has distinct connected copy for every provider', () => {
    const messages = ALL_PROVIDERS.map((p) => CONNECTED_MESSAGE[p])
    expect(messages.every((m) => m.length > 0)).toBe(true)
    expect(new Set(messages).size).toBe(ALL_PROVIDERS.length)
  })

  it('has pending copy for every provider', () => {
    for (const p of ALL_PROVIDERS) {
      expect(PENDING_MESSAGE[p].length).toBeGreaterThan(0)
    }
  })

  it('keeps the live Clover copy verbatim', () => {
    expect(CONNECTED_MESSAGE.clover).toBe(
      "Your Clover account is connected. We'll send setup instructions once your account is activated.",
    )
  })

  it('names the right platform in each connected message', () => {
    expect(CONNECTED_MESSAGE.clover).toContain('Clover')
    expect(CONNECTED_MESSAGE.tiktok).toContain('TikTok Ads')
    expect(CONNECTED_MESSAGE.tiktok_account).toContain('Spark Ads')
    expect(CONNECTED_MESSAGE.google).toContain('Google Ads')
  })

  it('never puts a credential-shaped word in user-facing copy', () => {
    for (const message of [
      ...Object.values(CONNECTED_MESSAGE),
      ...Object.values(PENDING_MESSAGE),
    ]) {
      expect(message.toLowerCase()).not.toContain('token')
      expect(message.toLowerCase()).not.toContain('secret')
    }
  })

  // -------------------------------------------------- precedence between params

  it('prefers the advertiser flow when both TikTok params are present', () => {
    // Not a case the callbacks produce (each sets one param), but the order must
    // be defined rather than incidental.
    expect(
      resolveWelcomeOutcome({ tiktok: 'connected', tiktok_account: 'connected' }),
    ).toEqual({ kind: 'connected', provider: 'tiktok' })
  })

  it('prefers Clover over a status param when both are present', () => {
    expect(
      resolveWelcomeOutcome({ merchant_id: 'MERCH1', tiktok: 'connected' }),
    ).toEqual({ kind: 'connected', provider: 'clover' })
  })
})
