import { describe, it, expect } from 'vitest'
import { commenterDisplayName } from '../displayName'

// The comment preview card renders `commenterDisplayName(commenter_name)`.
// Graph v25.0 omits `from` for third-party commenters, so the preview payload
// carries commenter_name === null for a valid target — the card must then show
// "Facebook user" rather than an empty name.
describe('commenterDisplayName', () => {
  it('returns the name when present', () => {
    expect(commenterDisplayName('Reviewer Rita')).toBe('Reviewer Rita')
  })

  it('falls back to "Facebook user" when the name is null', () => {
    expect(commenterDisplayName(null)).toBe('Facebook user')
  })

  it('falls back to "Facebook user" when the name is undefined or blank', () => {
    expect(commenterDisplayName(undefined)).toBe('Facebook user')
    expect(commenterDisplayName('')).toBe('Facebook user')
    expect(commenterDisplayName('   ')).toBe('Facebook user')
  })
})
