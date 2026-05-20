/**
 * Capture real Graph API responses from Bella Napoli's Page/IG/ad account
 * for each of the 19 permissions exercised on the Meta App Review dashboard.
 *
 * Output: src/app/review/meta-bk2xp9/fallback-snapshots/{permission}.json
 *
 * Run:
 *   npx tsx scripts/capture-fallback-snapshots.ts
 *
 * Requires .env.local with:
 *   META_SYSTEM_USER_TOKEN
 *   META_APP_ID
 *   META_APP_SECRET
 *   META_TEST_PAGE_ID
 *   META_TEST_AD_ACCOUNT_ID
 */
import { config as loadEnv } from 'dotenv'
import { mkdirSync, writeFileSync } from 'fs'
import { resolve as resolvePath, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  ENDPOINTS,
  describeEndpoint,
  resolvePath as resolveTemplate,
  type EndpointDef,
} from '../src/app/review/meta-bk2xp9/lib/endpoints'

loadEnv({ path: '.env.local' })

const GRAPH_VERSION = 'v25.0'
const MERCHANT_LABEL =
  'Bella Napoli Ristorante, Cork (Facebook Page ID {page-id})'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = resolvePath(
  __dirname,
  '..',
  'src',
  'app',
  'review',
  'meta-bk2xp9',
  'fallback-snapshots',
)

function normalizeAdAccountId(id: string): string {
  return id.startsWith('act_') ? id : `act_${id}`
}

function scrubAccessTokens<T>(value: T): T {
  const s = JSON.stringify(value)
  const scrubbed = s.replace(/access_token=[^"&\s]+/g, 'access_token=REDACTED')
  return JSON.parse(scrubbed) as T
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

async function graphCall(
  token: string,
  path: string,
  params: Record<string, string> = {},
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${path.replace(/^\//, '')}`,
  )
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('access_token', token)
  const res = await fetch(url.toString(), { cache: 'no-store' })
  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  return { ok: res.ok, status: res.status, body }
}

async function main() {
  const userToken = requireEnv('META_SYSTEM_USER_TOKEN')
  requireEnv('META_APP_ID')
  requireEnv('META_APP_SECRET')
  const pageId = requireEnv('META_TEST_PAGE_ID')
  const adAccountId = normalizeAdAccountId(requireEnv('META_TEST_AD_ACCOUNT_ID'))

  console.log(`[capture] Graph API ${GRAPH_VERSION}`)
  console.log(`[capture] Page ID:        ${pageId}`)
  console.log(`[capture] Ad Account ID:  ${adAccountId}`)

  // Swap System User token → Page Access Token (required by Page-scoped endpoints).
  const pageTokenRes = await graphCall(userToken, pageId, {
    fields: 'access_token',
  })
  let pageToken: string = userToken
  if (
    pageTokenRes.ok &&
    typeof pageTokenRes.body === 'object' &&
    pageTokenRes.body !== null &&
    'access_token' in pageTokenRes.body
  ) {
    pageToken = (pageTokenRes.body as { access_token: string }).access_token
    console.log(`[capture] Page Access Token obtained (length ${pageToken.length})`)
  } else {
    console.warn(
      `[capture] WARNING: page token swap failed (status ${pageTokenRes.status}). Page-scoped calls will use System User token.`,
    )
  }

  // Derive IG user ID from the connected Page.
  const igRes = await graphCall(pageToken, pageId, {
    fields: 'instagram_business_account',
  })
  let igUserId: string | null = null
  if (
    igRes.ok &&
    typeof igRes.body === 'object' &&
    igRes.body !== null &&
    'instagram_business_account' in igRes.body
  ) {
    const data = (
      igRes.body as { instagram_business_account?: { id?: string } }
    ).instagram_business_account
    igUserId = data?.id ?? null
  }
  if (igUserId) {
    console.log(`[capture] IG User ID:     ${igUserId}`)
  } else {
    console.warn(
      `[capture] WARNING: could not derive IG user id from page. IG endpoints will write a stub with an error.`,
    )
  }

  mkdirSync(OUTPUT_DIR, { recursive: true })

  const merchantStr = MERCHANT_LABEL.replace('{page-id}', pageId)
  const ctx = { pageId, adAccountId, igUserId }

  let okCount = 0
  let failCount = 0
  const failures: Array<{ permission: string; reason: string }> = []

  for (const def of ENDPOINTS as EndpointDef[]) {
    const resolved = resolveTemplate(def.path, ctx)
    const descriptor = describeEndpoint(def, ctx)
    const outFile = resolvePath(OUTPUT_DIR, `${def.permission}.json`)

    if (!resolved) {
      const wrapper = {
        captured_at: new Date().toISOString(),
        endpoint: descriptor,
        merchant: merchantStr,
        response: {
          error: {
            message: `Could not resolve endpoint path for ${def.permission}: missing required identifier (page/ad-account/ig).`,
            type: 'CaptureError',
          },
        },
      }
      writeFileSync(outFile, JSON.stringify(wrapper, null, 2))
      failCount++
      failures.push({
        permission: def.permission,
        reason: 'unresolved identifier',
      })
      console.log(`[capture]  ✗  ${def.permission} → no IDs available`)
      continue
    }

    const token = def.tokenType === 'page' ? pageToken : userToken
    let response: unknown
    let httpStatus = 0
    try {
      const result = await graphCall(token, resolved, def.params)
      httpStatus = result.status
      response = result.body
      if (result.ok) {
        okCount++
        console.log(`[capture]  ✓  ${def.permission} → ${result.status}`)
      } else {
        failCount++
        failures.push({
          permission: def.permission,
          reason: `HTTP ${result.status}`,
        })
        console.log(
          `[capture]  ✗  ${def.permission} → ${result.status} (captured anyway)`,
        )
      }
    } catch (err) {
      response = {
        error: {
          message: err instanceof Error ? err.message : String(err),
          type: 'NetworkError',
        },
      }
      failCount++
      failures.push({
        permission: def.permission,
        reason: 'network error',
      })
      console.log(`[capture]  ✗  ${def.permission} → network error`)
    }

    const wrapper = {
      captured_at: new Date().toISOString(),
      endpoint: descriptor,
      merchant: merchantStr,
      http_status: httpStatus,
      response: scrubAccessTokens(response),
    }
    writeFileSync(outFile, JSON.stringify(wrapper, null, 2))
  }

  console.log('')
  console.log(`[capture] DONE — ${okCount} ok, ${failCount} fail, total ${ENDPOINTS.length}`)
  if (failures.length > 0) {
    console.log(`[capture] Failures:`)
    for (const f of failures) console.log(`           ${f.permission}: ${f.reason}`)
  }
}

main().catch((err) => {
  console.error('[capture] FATAL:', err)
  process.exit(1)
})
