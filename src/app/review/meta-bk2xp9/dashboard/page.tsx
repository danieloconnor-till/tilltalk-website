import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardTabs from './DashboardTabs'
import {
  ENDPOINTS,
  TABS,
  describeEndpoint,
  resolvePath,
  type EndpointDef,
  type EndpointContext,
  type EndpointTab,
} from '../lib/endpoints'
import { shouldRenderFallback, type GraphResponse } from '../lib/fallback'
import { redactSensitive } from '../lib/redact'
import { loadSnapshot, type SnapshotFile } from '../lib/snapshots'

const GRAPH_VERSION = 'v25.0'
const ENTRY_PATH = '/review/meta-bk2xp9/'
const LOGOUT_PATH = '/review/meta-bk2xp9/logout'

type CallResult = GraphResponse & { note?: string }

async function call(
  token: string,
  path: string,
  params: Record<string, string> = {},
): Promise<CallResult> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${path.replace(/^\//, '')}`,
  )
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('access_token', token)
  try {
    const res = await fetch(url.toString(), { cache: 'no-store' })
    const body = await res.text()
    return { ok: res.ok, status: res.status, body }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: `Network error: ${err instanceof Error ? err.message : 'unknown'}`,
    }
  }
}

function jsonParseSafe<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}

function prettyJson(s: string, maxChars = 500): string {
  let display: string
  try {
    display = JSON.stringify(redactSensitive(JSON.parse(s)), null, 2)
  } catch {
    display = s
  }
  return display.length > maxChars
    ? display.slice(0, maxChars) + '\n... (truncated)'
    : display
}

function prettyJsonObject(value: unknown, maxChars = 600): string {
  const s = JSON.stringify(redactSensitive(value), null, 2)
  return s.length > maxChars ? s.slice(0, maxChars) + '\n... (truncated)' : s
}

function normalizeAdAccountId(id: string): string {
  return id.startsWith('act_') ? id : `act_${id}`
}

const NA_RESULT: CallResult = {
  ok: false,
  status: 0,
  body: '',
  note: 'N/A on this test account — would return data on a real merchant install',
}

type Panel = {
  def: EndpointDef
  endpointDescriptor: string
  result: CallResult
  fallback: null | {
    captionReason: string
    snapshot: SnapshotFile
  }
}

function CardHeader({ def }: { def: EndpointDef }) {
  if (def.title) {
    return (
      <div>
        <h3 className="text-base font-semibold text-gray-900">{def.title}</h3>
        {def.subtitle ? (
          <p className="text-xs text-gray-600 mt-1 leading-relaxed">
            {def.subtitle}
          </p>
        ) : null}
      </div>
    )
  }
  return (
    <h3 className="font-mono text-sm font-bold text-gray-900 break-all">
      {def.permission}
    </h3>
  )
}

function PanelCard({ panel }: { panel: Panel }) {
  const { result, def, endpointDescriptor, fallback } = panel
  const isNA = result.note !== undefined
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <CardHeader def={def} />
          <p className="font-mono text-xs text-gray-600 mt-2 break-all">
            {endpointDescriptor}
          </p>
        </div>
        {isNA ? (
          <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            N/A
          </span>
        ) : result.ok ? (
          <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Success {result.status}
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Error {result.status || '—'}
          </span>
        )}
      </div>
      {isNA ? (
        <p className="text-sm text-gray-500 italic">{result.note}</p>
      ) : (
        <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-y-auto max-h-60 font-mono whitespace-pre-wrap break-all">
          {prettyJson(result.body)}
        </pre>
      )}
      {fallback ? (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h4 className="text-sm font-semibold text-amber-900">
              Demo data — Bella Napoli Ristorante, Cork
            </h4>
            <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-200 text-amber-900 uppercase tracking-wide">
              Captured
            </span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed mb-3">
            Your test account returned {fallback.captionReason}. The panel
            below shows a real captured response from Bella Napoli Ristorante
            (the live reference merchant for this submission), used with
            merchant consent. Captured {fallback.snapshot.captured_at} from{' '}
            <span className="font-mono">{fallback.snapshot.endpoint}</span>.
          </p>
          <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-y-auto max-h-72 font-mono whitespace-pre-wrap break-all">
            {prettyJsonObject(fallback.snapshot.response)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}

export default async function MetaReviewDashboardPage() {
  const cookieStore = await cookies()
  const userToken = cookieStore.get('meta_review_token')?.value
  if (!userToken) redirect(ENTRY_PATH)

  // Verify token. /me returning 401 means the token is invalid/expired —
  // bounce through the logout route handler to clear the cookie cleanly
  // (server components cannot mutate cookies during render).
  const me = await call(userToken, 'me', { fields: 'id,name' })
  if (me.status === 401) redirect(LOGOUT_PATH)

  // Resolve owning Page and ad account in parallel.
  const [accountsRes, adAccountsRes] = await Promise.all([
    call(userToken, 'me/accounts', { fields: 'id,name,access_token' }),
    call(userToken, 'me/adaccounts', { fields: 'id,name' }),
  ])

  type AccountsResponse = {
    data?: Array<{ id: string; name?: string; access_token?: string }>
  }
  type AdAccountsResponse = { data?: Array<{ id: string; name?: string }> }

  const accountsData = accountsRes.ok
    ? jsonParseSafe<AccountsResponse>(accountsRes.body)
    : null
  const adAccountsData = adAccountsRes.ok
    ? jsonParseSafe<AdAccountsResponse>(adAccountsRes.body)
    : null

  const firstPage = accountsData?.data?.[0]
  const pageId = firstPage?.id ?? null
  const pageToken = firstPage?.access_token ?? null
  const adAccountIdRaw = adAccountsData?.data?.[0]?.id ?? null
  const adAccountId = adAccountIdRaw ? normalizeAdAccountId(adAccountIdRaw) : null

  // IG user id is reachable only via the Page → resolve after Page is known.
  let igUserId: string | null = null
  if (pageId) {
    const igRes = await call(pageToken ?? userToken, pageId, {
      fields: 'instagram_business_account',
    })
    if (igRes.ok) {
      const data = jsonParseSafe<{
        instagram_business_account?: { id?: string }
      }>(igRes.body)
      igUserId = data?.instagram_business_account?.id ?? null
    }
  }

  // Page Access Token swap — required for Page-scoped endpoints. If swap
  // failed, fall back to the User token so panels return Meta's specific
  // error rather than crashing.
  const tokenForPage = pageToken ?? userToken
  const ctx: EndpointContext = { pageId, adAccountId, igUserId }

  // Resolve each endpoint in parallel. Promise.allSettled isolates failures so
  // one rejected promise can never kill the whole render.
  const panelPromises: Array<Promise<Panel>> = ENDPOINTS.map(async (def) => {
    const resolved = resolvePath(def.path, ctx)
    const descriptor = describeEndpoint(def, ctx)
    if (!resolved) {
      return {
        def,
        endpointDescriptor: descriptor,
        result: NA_RESULT,
        fallback: null,
      }
    }
    const token = def.tokenType === 'page' ? tokenForPage : userToken
    const result = await call(token, resolved, def.params)
    return {
      def,
      endpointDescriptor: descriptor,
      result,
      fallback: null,
    }
  })

  const settled = await Promise.allSettled(panelPromises)
  const allPanels: Panel[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value
    const def = ENDPOINTS[i]
    return {
      def,
      endpointDescriptor: describeEndpoint(def, ctx),
      result: {
        ok: false,
        status: 0,
        body: 'Promise rejected — see server logs',
      },
      fallback: null,
    }
  })

  // For each panel, evaluate the fallback trigger and load the snapshot if
  // needed. Only the snapshots for triggered panels are loaded.
  await Promise.all(
    allPanels.map(async (panel) => {
      // N/A panels (missing identifier) also trigger fallback — they're
      // effectively "the live call could not be made at all".
      const decision = panel.result.note
        ? { trigger: true, reason: panel.result.note }
        : shouldRenderFallback(panel.result)
      if (!decision.trigger) return
      const snapshot = await loadSnapshot(panel.def.permission)
      if (!snapshot) return
      // Special-case caption for instagram_manage_messages — the live 400 is
      // an app-level capability block, not an empty/missing data issue.
      const captionReason =
        panel.def.permission === 'instagram_manage_messages'
          ? 'the linked Bella Napoli IG account has a known app-level capability block separate from this submission'
          : decision.reason
      panel.fallback = { captionReason, snapshot }
    }),
  )

  // Group by tab in the order defined in TABS, preserving ENDPOINTS order
  // within each tab.
  const panelsByTab: Record<EndpointTab, Panel[]> = {
    pages: [],
    insights: [],
    ads: [],
    instagram: [],
  }
  for (const p of allPanels) panelsByTab[p.def.tab].push(p)

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Meta App Review — 18 Permissions Demo
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Live Graph API <code className="font-mono">{GRAPH_VERSION}</code>{' '}
          calls, server-side, using the Test App OAuth token in your session.
          Where the live call returns empty data or an error on a thin
          reviewer account, a clearly labelled &ldquo;Demo data&rdquo; panel
          below shows a captured snapshot from Bella Napoli Ristorante so you
          can see what populated data looks like.
        </p>
      </div>
      <DashboardTabs
        tabs={TABS.map((t) => ({
          label: t.label,
          count: t.count,
          note: t.note,
          content: (
            <div className="grid gap-4">
              {panelsByTab[t.id].map((p, i) => (
                <PanelCard key={`${t.id}-${i}-${p.def.permission}`} panel={p} />
              ))}
            </div>
          ),
        }))}
      />
    </div>
  )
}
