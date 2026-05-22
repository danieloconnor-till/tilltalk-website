export type EndpointTab = 'pages' | 'insights' | 'ads' | 'instagram'

export type EndpointDef = {
  permission: string
  tab: EndpointTab
  title?: string
  subtitle?: string
  path: string
  params: Record<string, string>
  tokenType: 'user' | 'page'
}

export const TABS: Array<{
  id: EndpointTab
  label: string
  count: number
  note: string
}> = [
  {
    id: 'pages',
    label: 'Pages & Content',
    count: 7,
    note:
      'These calls use a Page Access Token (swapped from the User Token via /me/accounts), as required by Meta for Page-scoped endpoints. The first call (pages_show_list) uses the User Token, since /me/accounts is the endpoint that returns the Page list and its Page tokens.',
  },
  {
    id: 'insights',
    label: 'Insights & Attribution',
    count: 2,
    note:
      'read_insights uses a Page Access Token; attribution_read uses the User Token against the ad account.',
  },
  {
    id: 'ads',
    label: 'Ads & Business',
    count: 4,
    note:
      'leads_retrieval uses a Page Access Token; the other three use the User Token.',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    count: 5,
    note:
      'All Instagram calls use the User Token. The IG user id is resolved from the connected Page via instagram_business_account.',
  },
]

export const ENDPOINTS: EndpointDef[] = [
  // ── Tab 1 — Pages & Content (7) ─────────────────────────────────────
  {
    permission: 'pages_show_list',
    tab: 'pages',
    path: 'me/accounts',
    params: {},
    tokenType: 'user',
  },
  {
    permission: 'pages_read_engagement',
    tab: 'pages',
    path: '{page-id}/posts',
    params: {
      fields:
        'message,created_time,reactions.summary(true),comments.summary(true)',
      limit: '5',
    },
    tokenType: 'page',
  },
  {
    permission: 'pages_read_user_content',
    tab: 'pages',
    path: '{page-id}/feed',
    params: {
      fields: 'message,created_time,from',
      limit: '5',
    },
    tokenType: 'page',
  },
  {
    permission: 'pages_manage_metadata',
    tab: 'pages',
    path: '{page-id}',
    params: {
      fields: 'name,category,about,website,phone',
    },
    tokenType: 'page',
  },
  {
    permission: 'pages_manage_ads',
    tab: 'pages',
    path: '{page-id}/published_posts',
    params: {
      fields: 'id,message,created_time',
      limit: '3',
    },
    tokenType: 'page',
  },
  {
    permission: 'pages_manage_engagement',
    tab: 'pages',
    path: '{page-id}/conversations',
    params: { limit: '3' },
    tokenType: 'page',
  },
  {
    permission: 'pages_messaging',
    tab: 'pages',
    path: '{page-id}/conversations',
    params: {
      fields:
        'participants,updated_time,messages.limit(1){message,from,created_time}',
      limit: '3',
    },
    tokenType: 'page',
  },

  // ── Tab 2 — Insights & Attribution (2) ──────────────────────────────
  {
    permission: 'read_insights',
    tab: 'insights',
    path: '{page-id}/insights',
    params: {
      metric: 'page_post_engagements,page_views_total',
      period: 'day',
    },
    tokenType: 'page',
  },
  {
    permission: 'attribution_read',
    tab: 'insights',
    path: '{ad-account-id}/insights',
    params: {
      fields: 'spend,impressions,actions',
      date_preset: 'last_7d',
    },
    tokenType: 'user',
  },

  // ── Tab 3 — Ads & Business (4) ──────────────────────────────────────
  {
    permission: 'ads_read',
    tab: 'ads',
    path: '{ad-account-id}/insights',
    params: {
      fields: 'campaign_name,spend,impressions,clicks',
      level: 'campaign',
      date_preset: 'last_7d',
    },
    tokenType: 'user',
  },
  {
    permission: 'ads_management',
    tab: 'ads',
    path: '{ad-account-id}/campaigns',
    params: {
      fields: 'name,status,objective,daily_budget',
      limit: '5',
    },
    tokenType: 'user',
  },
  {
    permission: 'business_management',
    tab: 'ads',
    path: 'me/businesses',
    params: { fields: 'name,verification_status' },
    tokenType: 'user',
  },
  {
    permission: 'leads_retrieval',
    tab: 'ads',
    path: '{page-id}/leadgen_forms',
    params: { limit: '3' },
    tokenType: 'page',
  },

  // ── Tab 4 — Instagram (5) ───────────────────────────────────────────
  {
    permission: 'instagram_basic',
    tab: 'instagram',
    path: '{ig-user-id}',
    params: {
      fields:
        'username,name,profile_picture_url,followers_count,media_count',
    },
    tokenType: 'user',
  },
  {
    permission: 'instagram_manage_comments',
    tab: 'instagram',
    path: '{ig-user-id}/media',
    params: {
      fields: 'id,caption,comments.limit(2){text,username,timestamp}',
      limit: '3',
    },
    tokenType: 'user',
  },
  {
    permission: 'instagram_manage_messages',
    tab: 'instagram',
    path: '{ig-user-id}/conversations',
    params: { limit: '3' },
    tokenType: 'user',
  },
  {
    permission: 'instagram_manage_insights',
    tab: 'instagram',
    path: '{ig-user-id}/insights',
    params: {
      metric: 'reach,profile_views,views',
      period: 'day',
      metric_type: 'total_value',
    },
    tokenType: 'user',
  },
  {
    permission: 'instagram_content_publish',
    tab: 'instagram',
    title: 'IG Content Publishing Limit (instagram_content_publish)',
    subtitle:
      "Demonstrates permission to publish to the merchant's Instagram Business account. This dashboard exercises the permission by reading the content publishing limit; actual publishing in production happens under merchant approval over WhatsApp.",
    path: '{ig-user-id}/content_publishing_limit',
    params: {},
    tokenType: 'user',
  },
]

export type EndpointContext = {
  pageId?: string | null
  adAccountId?: string | null
  igUserId?: string | null
}

export function resolvePath(
  template: string,
  ctx: EndpointContext,
): string | null {
  const replacements: Array<[string, string | null | undefined]> = [
    ['{page-id}', ctx.pageId],
    ['{ad-account-id}', ctx.adAccountId],
    ['{ig-user-id}', ctx.igUserId],
  ]
  let out = template
  for (const [token, value] of replacements) {
    if (out.includes(token)) {
      if (!value) return null
      out = out.split(token).join(value)
    }
  }
  return out
}

export function describeEndpoint(def: EndpointDef, ctx?: EndpointContext): string {
  const path = ctx
    ? (resolvePath(def.path, ctx) ?? def.path)
    : def.path
  const qs = new URLSearchParams(def.params).toString()
  return `GET /${path}${qs ? `?${qs}` : ''}`
}
