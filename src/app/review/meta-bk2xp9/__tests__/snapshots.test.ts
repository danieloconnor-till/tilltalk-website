import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { ENDPOINTS } from '../lib/endpoints'

const SNAPSHOT_DIR = join(
  process.cwd(),
  'src',
  'app',
  'review',
  'meta-bk2xp9',
  'fallback-snapshots',
)

describe('endpoints', () => {
  it('exports 17 endpoint definitions', () => {
    expect(ENDPOINTS).toHaveLength(17)
  })

  it('has unique permission names', () => {
    const names = ENDPOINTS.map((e) => e.permission)
    expect(new Set(names).size).toBe(names.length)
  })

  it('includes instagram_content_publish and excludes the dropped pages_manage_posts', () => {
    const names = new Set(ENDPOINTS.map((e) => e.permission))
    expect(names.has('instagram_content_publish')).toBe(true)
    expect(names.has('pages_manage_posts')).toBe(false)
  })
})

describe('fallback snapshots', () => {
  it.each(ENDPOINTS.map((e) => e.permission))(
    'snapshot file exists and parses as valid JSON: %s',
    (permission) => {
      const path = join(SNAPSHOT_DIR, `${permission}.json`)
      const raw = readFileSync(path, 'utf8')
      const parsed = JSON.parse(raw)
      expect(parsed).toMatchObject({
        captured_at: expect.any(String),
        endpoint: expect.any(String),
        merchant: expect.any(String),
      })
      expect(parsed.response).toBeDefined()
    },
  )
})
