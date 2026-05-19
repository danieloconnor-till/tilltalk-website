import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardTabs from './DashboardTabs'

const GRAPH_VERSION = 'v25.0'
const ENTRY_PATH = '/review/meta-bk2xp9/'
const LOGOUT_PATH = '/review/meta-bk2xp9/logout'

type CallResult = {
  ok: boolean
  status: number
  body: string
  note?: string
}

async function call(
  token: string,
  endpoint: string,
  params: Record<string, string> = {},
): Promise<CallResult> {
  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${endpoint.replace(/^\//, '')}`,
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
    display = JSON.stringify(JSON.parse(s), null, 2)
  } catch {
    display = s
  }
  return display.length > maxChars
    ? display.slice(0, maxChars) + '\n... (truncated)'
    : display
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
  permission: string
  endpoint: string
  result: CallResult
}

function PanelCard({ panel }: { panel: Panel }) {
  const isNA = panel.result.note !== undefined
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-mono text-sm font-bold text-gray-900 break-all">
            {panel.permission}
          </h3>
          <p className="font-mono text-xs text-gray-600 mt-1 break-all">
            {panel.endpoint}
          </p>
        </div>
        {isNA ? (
          <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            N/A
          </span>
        ) : panel.result.ok ? (
          <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Success {panel.result.status}
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Error {panel.result.status || '—'}
          </span>
        )}
      </div>
      {isNA ? (
        <p className="text-sm text-gray-500 italic">{panel.result.note}</p>
      ) : (
        <pre className="bg-gray-900 text-gray-100 text-xs rounded-lg p-3 overflow-y-auto max-h-60 font-mono whitespace-pre-wrap break-all">
          {prettyJson(panel.result.body)}
        </pre>
      )}
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

  // Resolve owning Page, BM, ad account in parallel.
  const [accountsRes, businessesRes, adAccountsRes] = await Promise.all([
    call(userToken, 'me/accounts', { fields: 'id,name,access_token' }),
    call(userToken, 'me/businesses', { fields: 'id,name' }),
    call(userToken, 'me/adaccounts', { fields: 'id,name' }),
  ])

  type AccountsResponse = {
    data?: Array<{ id: string; name?: string; access_token?: string }>
  }
  type BusinessesResponse = { data?: Array<{ id: string; name?: string }> }
  type AdAccountsResponse = { data?: Array<{ id: string; name?: string }> }

  const accountsData = accountsRes.ok
    ? jsonParseSafe<AccountsResponse>(accountsRes.body)
    : null
  const businessesData = businessesRes.ok
    ? jsonParseSafe<BusinessesResponse>(businessesRes.body)
    : null
  const adAccountsData = adAccountsRes.ok
    ? jsonParseSafe<AdAccountsResponse>(adAccountsRes.body)
    : null

  const firstPage = accountsData?.data?.[0]
  const pageId = firstPage?.id ?? null
  const pageToken = firstPage?.access_token ?? null
  const businessId = businessesData?.data?.[0]?.id ?? null
  const adAccountIdRaw = adAccountsData?.data?.[0]?.id ?? null
  const adAccountId = adAccountIdRaw ? normalizeAdAccountId(adAccountIdRaw) : null

  // IG user id is reachable only via the Page → resolve after Page is known.
  let igUserId: string | null = null
  if (pageId) {
    const igRes = await call(userToken, pageId, {
      fields: 'instagram_business_account',
    })
    if (igRes.ok) {
      const data = jsonParseSafe<{
        instagram_business_account?: { id?: string }
      }>(igRes.body)
      igUserId = data?.instagram_business_account?.id ?? null
    }
  }

  // Page Access Token swap — required for Page-scoped endpoints (8 of the 17
  // listed in the prompt). If swap fails for some reason, fall back to the
  // User token so panels return Meta's specific error rather than crashing.
  const tokenForPage = pageToken ?? userToken

  // Each panel is independent — build them as Promises and resolve via
  // Promise.allSettled so any single 4xx/5xx never kills the whole render.
  const buildPanel = async (
    permission: string,
    endpointDesc: string,
    fetchFn: () => Promise<CallResult>,
    missing: boolean,
  ): Promise<Panel> => {
    if (missing)
      return { permission, endpoint: endpointDesc, result: NA_RESULT }
    const result = await fetchFn()
    return { permission, endpoint: endpointDesc, result }
  }

  const panelPromises: Array<Promise<Panel>> = [
    // ── Tab 1 — Pages & Content (7) ─────────────────────────────────────
    buildPanel(
      'pages_show_list',
      'GET /me/accounts',
      () => call(userToken, 'me/accounts', { fields: 'id,name' }),
      false,
    ),
    buildPanel(
      'pages_read_engagement',
      `GET /${pageId ?? '{page_id}'}`,
      () =>
        call(tokenForPage, pageId!, {
          fields: 'name,fan_count,followers_count',
        }),
      !pageId,
    ),
    buildPanel(
      'pages_manage_ads',
      `GET /${pageId ?? '{page_id}'}`,
      () => call(tokenForPage, pageId!, { fields: 'name,id' }),
      !pageId,
    ),
    buildPanel(
      'pages_manage_engagement',
      `GET /${pageId ?? '{page_id}'}`,
      () => call(tokenForPage, pageId!, { fields: 'name,id' }),
      !pageId,
    ),
    buildPanel(
      'pages_read_user_content',
      `GET /${pageId ?? '{page_id}'}/ratings`,
      () => call(tokenForPage, `${pageId}/ratings`, { limit: '1' }),
      !pageId,
    ),
    buildPanel(
      'pages_manage_metadata',
      `GET /${pageId ?? '{page_id}'}/subscribed_apps`,
      () => call(tokenForPage, `${pageId}/subscribed_apps`),
      !pageId,
    ),
    buildPanel(
      'pages_messaging',
      `GET /${pageId ?? '{page_id}'}/conversations`,
      () => call(tokenForPage, `${pageId}/conversations`, { limit: '1' }),
      !pageId,
    ),
    // ── Tab 2 — Insights & Attribution (2) ──────────────────────────────
    buildPanel(
      'read_insights',
      `GET /${pageId ?? '{page_id}'}/insights`,
      () =>
        call(tokenForPage, `${pageId}/insights`, {
          metric: 'page_impressions_unique',
          period: 'day',
          limit: '1',
        }),
      !pageId,
    ),
    buildPanel(
      'attribution_read',
      `GET /${adAccountId ?? 'act_{ad_account_id}'}/insights`,
      () =>
        call(userToken, `${adAccountId}/insights`, {
          fields: 'spend',
          limit: '1',
        }),
      !adAccountId,
    ),
    // ── Tab 3 — Ads & Business (4) ──────────────────────────────────────
    buildPanel(
      'ads_read',
      `GET /${adAccountId ?? 'act_{ad_account_id}'}/campaigns`,
      () =>
        call(userToken, `${adAccountId}/campaigns`, {
          fields: 'id,name',
          limit: '1',
        }),
      !adAccountId,
    ),
    buildPanel(
      'ads_management',
      `GET /${adAccountId ?? 'act_{ad_account_id}'}`,
      () =>
        call(userToken, adAccountId!, {
          fields: 'id,name,account_status',
        }),
      !adAccountId,
    ),
    buildPanel(
      'business_management',
      `GET /${businessId ?? '{business_id}'}`,
      () =>
        call(userToken, businessId!, {
          fields: 'id,name,verification_status',
        }),
      !businessId,
    ),
    buildPanel(
      'leads_retrieval',
      `GET /${pageId ?? '{page_id}'}/leadgen_forms`,
      () =>
        call(tokenForPage, `${pageId}/leadgen_forms`, {
          fields: 'id,name',
          limit: '1',
        }),
      !pageId,
    ),
    // ── Tab 4 — Instagram (4) ───────────────────────────────────────────
    buildPanel(
      'instagram_basic',
      `GET /${igUserId ?? '{ig_user_id}'}`,
      () =>
        call(userToken, igUserId!, {
          fields: 'id,username,followers_count',
        }),
      !igUserId,
    ),
    buildPanel(
      'instagram_manage_comments',
      `GET /${igUserId ?? '{ig_user_id}'}/media`,
      () =>
        call(userToken, `${igUserId}/media`, {
          fields: 'id,comments_count',
          limit: '1',
        }),
      !igUserId,
    ),
    buildPanel(
      'instagram_manage_insights',
      `GET /${igUserId ?? '{ig_user_id}'}/insights`,
      () =>
        call(userToken, `${igUserId}/insights`, {
          metric: 'reach',
          metric_type: 'total_value',
          period: 'day',
        }),
      !igUserId,
    ),
    buildPanel(
      'instagram_manage_messages',
      `GET /${igUserId ?? '{ig_user_id}'}/conversations`,
      () =>
        call(userToken, `${igUserId}/conversations`, {
          platform: 'instagram',
          limit: '1',
        }),
      !igUserId,
    ),
  ]

  const settled = await Promise.allSettled(panelPromises)
  const allPanels: Panel[] = settled.map((s) =>
    s.status === 'fulfilled'
      ? s.value
      : {
          permission: 'unknown',
          endpoint: 'unknown',
          result: { ok: false, status: 0, body: 'Promise rejected' },
        },
  )

  const tabs = [
    {
      label: 'Pages & Content',
      count: 7,
      note:
        'These calls use a Page Access Token (swapped from the User Token via /me/accounts), as required by Meta for Page-scoped endpoints. The first call (pages_show_list) uses the User Token, since /me/accounts is the endpoint that returns the Page list and its Page tokens.',
      panels: allPanels.slice(0, 7),
    },
    {
      label: 'Insights & Attribution',
      count: 2,
      note:
        'read_insights uses a Page Access Token; attribution_read uses the User Token against the ad account.',
      panels: allPanels.slice(7, 9),
    },
    {
      label: 'Ads & Business',
      count: 4,
      note:
        'leads_retrieval uses a Page Access Token; the other three use the User Token.',
      panels: allPanels.slice(9, 13),
    },
    {
      label: 'Instagram',
      count: 4,
      note:
        'All Instagram calls use the User Token. The IG user id is resolved from the connected Page via instagram_business_account.',
      panels: allPanels.slice(13, 17),
    },
  ]

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Meta App Review — 17 Permissions Demo
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Live Graph API <code className="font-mono">{GRAPH_VERSION}</code>{' '}
          calls, server-side, using the Test App OAuth token in your session.
        </p>
      </div>
      <DashboardTabs
        tabs={tabs.map((t) => ({
          label: t.label,
          count: t.count,
          note: t.note,
          content: (
            <div className="grid gap-4">
              {t.panels.map((p, i) => (
                <PanelCard key={`${t.label}-${i}`} panel={p} />
              ))}
            </div>
          ),
        }))}
      />
    </div>
  )
}
