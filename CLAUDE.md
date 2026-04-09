@AGENTS.md

# TillTalk Website — Project Reference

## Last Updated

**2026-04-09** — Update this file at the end of every Claude Code session with what was built, changed, or decided.

## What This Is

The marketing and customer-facing web app for TillTalk: a service that lets hospitality and retail businesses query their POS system via WhatsApp. This repo handles the landing page, signup flow, user dashboard, and admin panel. The bot itself lives in a separate repo (`C:\Users\User\Documents\tilltalk`), deployed on Railway.

**Production URL:** https://tilltalk.ie  
**GitHub:** https://github.com/danieloconnor-till/tilltalk-website  
**Vercel project:** till-talk / tilltalk-website  
**Supabase project:** vxcmaluzktaxzhjskhhw (https://vxcmaluzktaxzhjskhhw.supabase.co)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.2 (App Router, Turbopack) |
| Language | TypeScript 5, React 19 |
| Styling | Tailwind CSS v4 — CSS-based `@theme` in `globals.css`, no `tailwind.config.js` |
| Auth + DB | Supabase (`@supabase/ssr` ^0.10.0 + `@supabase/supabase-js` ^2) |
| Email | SendGrid (direct REST API via `src/lib/sendgrid.ts`) |
| Payments | Stripe (`stripe` ^22, `@stripe/stripe-js` ^9) — keys wired up, self-service Stripe portal not yet built |
| Icons | `lucide-react` ^1.7 |
| Utilities | `clsx` ^2 |
| Hosting | Vercel (framework: nextjs, explicit `vercel.json`) |

**Important Tailwind note:** This is Tailwind v4. There is no `tailwind.config.js`. Custom tokens go in `globals.css` under `@theme { }`. Do not create a config file.

**Important Next.js note:** This is Next.js 16.2.2 with React 19. APIs may differ from training data — check `node_modules/next/dist/docs/` before writing code.

---

## Environment Variables

All variables are set in Vercel (project settings → Environment Variables) and pulled locally via `npx vercel env pull .env.local`.

| Variable | Where used | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | Public — safe to expose |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server clients | Public — safe to expose |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts` | Secret — server-only, bypasses RLS |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Frontend (unused yet) | Public |
| `STRIPE_SECRET_KEY` | `src/lib/stripe.ts` | Secret — test key currently |
| `SENDGRID_API_KEY` | `src/lib/sendgrid.ts` | Secret — trailing `\n` in `.env.local`, trim if issues arise |
| `RAILWAY_ONBOARDING_URL` | `src/app/api/signup/route.ts` + all Railway proxy routes | URL of the Railway bot service |
| `ONBOARDING_API_KEY` | All Railway proxy routes | Shared secret for Railway API endpoints |
| `NOTIFICATION_EMAIL` | `src/app/api/signup/route.ts` | Defaults to `daniel@tilltalk.ie` |
| `NEXT_PUBLIC_SITE_URL` | — | Set to `https://tilltalk.ie` |
| `ANTHROPIC_API_KEY` | `src/app/api/support-chat/route.ts` | Claude API key for the website support chatbot. **Must be added to Vercel.** Copy value from Railway env vars. |
| `VERCEL_OIDC_TOKEN` | Auto-managed by Vercel | Do not touch |

**To update env vars:** `npx vercel env add <NAME>` or via Vercel dashboard. After changing, run `npx vercel env pull .env.local --yes` to sync locally.

---

## Database Schema (Supabase)

Migration file: `supabase/migrations/001_initial.sql` — applied via `npx supabase db push`.

### `profiles`
Primary user record. Created by the signup API route immediately after auth user creation.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | References `auth.users(id)` — same UUID |
| `email` | `text NOT NULL` | |
| `full_name` | `text` | |
| `restaurant_name` | `text` | The business name |
| `pos_type` | `text` | CHECK: `clover`, `square`, `eposnow` |
| `pos_merchant_id` | `text` | Set later by Railway bot; unique index where not null |
| `whatsapp_number` | `text` | Collected at signup |
| `plan` | `text` | CHECK: `starter`, `pro`, `business`. Default: `starter` |
| `trial_start` | `timestamptz` | Defaults to `now()` |
| `trial_end` | `timestamptz` | Defaults to `now() + 14 days` |
| `stripe_customer_id` | `text` | Null until Stripe is set up |
| `stripe_subscription_id` | `text` | Null while on trial |
| `active` | `boolean` | Default `true`. Admin can toggle off |
| `created_at` | `timestamptz` | Default `now()` |

RLS enabled. Policies: users can SELECT and UPDATE their own row (`auth.uid() = id`). Service role bypasses RLS — admin routes use service role.

### `trial_extensions`
Audit log of manual trial extensions made via the admin panel.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `profile_id` | `uuid` FK → `profiles.id` | |
| `extended_by_days` | `integer NOT NULL` | |
| `extended_by` | `text NOT NULL` | Admin email |
| `reason` | `text` | Optional |
| `created_at` | `timestamptz` | |

### `daily_usage`
Reserved for future query-count tracking per user per day.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `profile_id` | `uuid` FK → `profiles.id` | |
| `date` | `date` | Default `current_date` |
| `query_count` | `integer` | Default 0 |
| `email_report_count` | `integer` | Default 0 |
| — | unique | `(profile_id, date)` |

---

## Signup Flow — End-to-End

1. User fills in `src/app/signup/page.tsx` (name, email, password, business name, POS type, WhatsApp number, plan)
2. POST to `/api/signup`
3. API route:
   - Validates fields + password length
   - Calls `admin.auth.admin.generateLink({ type: 'signup', email, password })` → creates Supabase auth user AND returns a confirmation URL in one call
   - POSTs to Railway `/api/onboard` with user details (non-fatal if it fails)
   - Inserts row into `profiles` table; rolls back (deletes auth user) if this fails
   - Sends welcome email via SendGrid with a "Confirm my account" button linking to the Supabase confirmation URL
   - Sends admin notification email to `NOTIFICATION_EMAIL`
4. Frontend redirects to `/signup/success` (static page with next-steps checklist)
5. User clicks confirmation link in email → redirected to `https://tilltalk.ie/dashboard`

**Why `generateLink` instead of `signUp`?** `generateLink` returns the confirmation URL server-side so we can embed it in our own branded email via SendGrid. Without it we'd have to rely on Supabase's default confirmation email.

---

## Password Reset Flow

1. `/forgot-password` — user enters email, calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://tilltalk.ie/reset-password' })`
2. Supabase emails the user a link containing a `?code=` PKCE param
3. `/reset-password` — on mount, reads `code` from URL, calls `supabase.auth.exchangeCodeForSession(code)` to establish a session
4. User enters new password, calls `supabase.auth.updateUser({ password })`
5. Redirects to `/dashboard`

---

## Route Protection

`src/proxy.ts` is the Next.js middleware (note: named `proxy.ts` not `middleware.ts` — this is intentional). It protects `/dashboard/:path*` and `/admin/:path*`. Unauthenticated users are redirected to `/login`.

The admin layout (`src/app/admin/layout.tsx`) additionally checks `user.email === 'daniel@tilltalk.ie'` and redirects to `/dashboard` if not.

Public routes (no protection): `/`, `/login`, `/signup`, `/signup/success`, `/forgot-password`, `/reset-password`, `/terms`, `/privacy`.

---

## All Routes & Files

### Pages

| Route | File | Type | Description |
|---|---|---|---|
| `/` | `src/app/page.tsx` | Client | Landing page: hero, how it works, demo, features, pricing, trust section |
| `/login` | `src/app/login/page.tsx` | Client | Email+password sign-in. `friendlyAuthError()` maps Supabase errors to readable messages |
| `/signup` | `src/app/signup/page.tsx` | Client | Signup form. Wrapped in `<Suspense>` for `useSearchParams`. Accepts `?plan=` query param |
| `/signup/success` | `src/app/signup/success/page.tsx` | Static | Post-signup confirmation page with next-steps checklist |
| `/forgot-password` | `src/app/forgot-password/page.tsx` | Client | Sends password reset email. Shows success state inline (no redirect) |
| `/reset-password` | `src/app/reset-password/page.tsx` | Client | Exchanges PKCE code, collects new password. Wrapped in `<Suspense>` |
| `/dashboard` | `src/app/dashboard/page.tsx` | Server | Fetches user + profile from Supabase, renders `DashboardClient` |
| `/admin` | `src/app/admin/page.tsx` | Server | Fetches all profiles via service role, renders `AdminClient`. Gated to `daniel@tilltalk.ie` |
| `/terms` | `src/app/terms/page.tsx` | Static | Terms & Conditions |
| `/privacy` | `src/app/privacy/page.tsx` | Static | Privacy Policy |

### API Routes

| Method | Route | File | Auth | Description |
|---|---|---|---|---|
| POST | `/api/signup` | `src/app/api/signup/route.ts` | None | Creates auth user, Railway record, profile, sends emails |
| POST | `/api/admin/extend-trial` | `src/app/api/admin/extend-trial/route.ts` | Admin only | Extends `trial_end` by N days, logs to `trial_extensions` |
| POST | `/api/admin/toggle-active` | `src/app/api/admin/toggle-active/route.ts` | Admin only | Flips `profiles.active` boolean |
| GET/POST | `/api/manage/numbers` | `src/app/api/manage/numbers/route.ts` | Supabase session | Proxy to Railway `/api/manage/numbers` |
| PATCH/DELETE | `/api/manage/numbers/[id]` | `src/app/api/manage/numbers/[id]/route.ts` | Supabase session | Proxy to Railway `/api/manage/numbers/:id` |
| GET/POST | `/api/manage/locations` | `src/app/api/manage/locations/route.ts` | Supabase session | Proxy to Railway `/api/manage/locations` |
| PATCH/DELETE | `/api/manage/locations/[id]` | `src/app/api/manage/locations/[id]/route.ts` | Supabase session | Proxy to Railway `/api/manage/locations/:id` |
| GET | `/api/dashboard/sales` | `src/app/api/dashboard/sales/route.ts` | Supabase session | Proxy to Railway `/api/dashboard/summary` |
| GET | `/api/dashboard/events` | `src/app/api/dashboard/events/route.ts` | Supabase session | Proxy to Railway `/api/nearby-events` |
| GET | `/api/dashboard/notes` | `src/app/api/dashboard/notes/route.ts` | Supabase session | Proxy to Railway `/api/dashboard/notes` |
| POST | `/api/chat` | `src/app/api/chat/route.ts` | Supabase session | Proxy to Railway `/api/chat` — dashboard AI chat |
| POST | `/api/support-chat` | `src/app/api/support-chat/route.ts` | Optional Supabase | Calls Anthropic directly; visitor mode = sales, client mode = support |
| POST | `/api/profile/credentials` | `src/app/api/profile/credentials/route.ts` | Supabase session | Updates POS merchant ID and API credentials in Supabase profiles |

### Components

| File | Description |
|---|---|
| `src/components/Nav.tsx` | Top navigation bar with logo, links, sign-in/start trial CTAs |
| `src/components/Footer.tsx` | Footer with links and copyright 2026 |
| `src/components/CookieBanner.tsx` | GDPR cookie consent banner (localStorage persistence) |
| `src/components/SupportChatWidget.tsx` | Floating chat widget on every page — visitor mode (sales) or client mode (support); powered by `/api/support-chat`; history in sessionStorage |
| `src/components/HowItWorks.tsx` | 3-step explainer section |
| `src/components/DemoSection.tsx` | Simulated WhatsApp conversation demo |
| `src/components/FeatureGrid.tsx` | Feature cards grid |
| `src/components/SupportedPOS.tsx` | Logos/names of supported POS systems (Clover, Square, Epos Now) |
| `src/components/PricingCard.tsx` | Single pricing tier card, supports monthly/annual toggle |
| `src/components/TrustSection.tsx` | Social proof / trust signals |

### Lib / Utilities

| File | Description |
|---|---|
| `src/lib/supabase/client.ts` | `createClient()` — browser Supabase client via `createBrowserClient` |
| `src/lib/supabase/server.ts` | `createClient()` — server Supabase client via `createServerClient` + Next.js cookies |
| `src/lib/supabase/admin.ts` | `createServiceRoleClient()` — bypasses RLS, server-only |
| `src/lib/sendgrid.ts` | `sendEmail()` wrapper — direct SendGrid REST API, gracefully no-ops if key missing |
| `src/lib/stripe.ts` | Initialised `stripe` instance — not yet used in any routes |
| `src/lib/plans.ts` | `PLANS` const with pricing, features, location/number limits per tier. `PlanKey` type |

### Client Components (in route folders)

| File | Description |
|---|---|
| `src/app/dashboard/DashboardClient.tsx` | Dashboard UI: subscription status + trial progress bar, editable account details, billing info, data deletion request |
| `src/app/admin/AdminClient.tsx` | Admin UI: stats cards, searchable client table, extend-trial modal, activate/deactivate buttons |

---

## Key Decisions

**`proxy.ts` not `middleware.ts`:** The middleware file is named `proxy.ts`. This is intentional — do not rename it. It exports both `proxy` (the function) and `config` (the matcher).

**`generateLink` for signup:** Using `admin.auth.admin.generateLink({ type: 'signup' })` instead of `supabase.auth.signUp()`. This creates the user server-side and returns the email confirmation URL so we can embed it in our own SendGrid welcome email. Supabase's default confirmation email is not used.

**No reCAPTCHA currently:** reCAPTCHA v3 was implemented then removed to unblock testing. TODO comments are left in `src/app/signup/page.tsx` (client) and `src/app/api/signup/route.ts` (server). The package `react-google-recaptcha-v3` is still in `package.json`.

**Stripe self-service not built:** Stripe keys are wired up and the `stripe` instance is exported from `src/lib/stripe.ts`, but no checkout/portal routes exist yet. Billing changes are handled manually via email to hello@tilltalk.ie.

**Admin gating is email-based:** The admin check (`user.email === 'daniel@tilltalk.ie'`) lives in `src/app/admin/layout.tsx`. It's simple and intentional — only one admin is needed right now.

**Railway integration is non-fatal:** If the Railway `/api/onboard` call fails during signup, the error is logged but the signup continues. The user gets created in Supabase. This prevents a Railway outage from blocking all signups.

**Profile insert is fatal:** If the `profiles` INSERT fails, the auth user is deleted and a 500 is returned. A Supabase user without a profile would be broken.

**`vercel.json` is explicit:** Added after Vercel's framework autodetection was set to "Other" instead of "Next.js", which caused all pages to 404. The file pins `framework: "nextjs"` so this can't regress.

---

## Related Systems

### Railway Bot (`C:\Users\User\Documents\tilltalk`)
The WhatsApp bot and POS integration service. Exposes:
- `POST /api/onboard` — called by this app's signup route. Accepts: `full_name`, `email`, `restaurant_name`, `pos_type`, `whatsapp_number`, `plan`, `supabase_user_id`. Returns 409 if that POS merchant has already had a free trial.
- `GET /api/client-status` — returns subscription/trial status for a client

Auth: `X-Onboarding-Key` header must match `ONBOARDING_API_KEY`.

---

## Local Development

```bash
npm install
npx vercel env pull .env.local --yes   # pull env vars from Vercel
npm run dev                             # starts on http://localhost:3000
```

To push DB migrations after changing `supabase/migrations/001_initial.sql`:
```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase link --project-ref vxcmaluzktaxzhjskhhw
SUPABASE_ACCESS_TOKEN=<token> npx supabase db push
```

To deploy:
```bash
git push origin main    # triggers Vercel auto-deploy
# or manually:
npx vercel --prod
```

---

## Legal Document Triggers
The T&Cs (src/app/terms/page.tsx) and Privacy Policy (src/app/privacy/page.tsx) must be kept in sync with the business. See LEGAL_TRIGGERS.md for the full trigger mapping. At the end of every session, check if any changes made this session require a T&Cs or Privacy Policy update. If yes, update the pages, bump the version number, and note it in the session log. Current T&Cs version: 4.1.

---

## Session Log

### Session 1 (initial build)
- Scaffolded Next.js 16 project with Tailwind v4, Supabase SSR, Stripe, SendGrid
- Built landing page: hero, how-it-works, demo section, feature grid, supported POS, pricing with monthly/annual toggle, trust section
- Built `/dashboard` (server component + DashboardClient): trial status, account details (editable), billing section, data & privacy
- Built `/admin` (server component + AdminClient): stats cards, client table with search, extend-trial modal, activate/deactivate
- Built `/terms` and `/privacy` pages
- Built API routes: `/api/signup`, `/api/admin/extend-trial`, `/api/admin/toggle-active`
- Added `src/proxy.ts` middleware protecting `/dashboard` and `/admin`
- Added `src/lib/plans.ts`, `src/lib/stripe.ts`, `src/lib/sendgrid.ts`
- Added Supabase migration `001_initial.sql` (profiles, trial_extensions, daily_usage tables)
- Set up `.env.local` with real credentials from Vercel

### Session 2
- Fixed Vercel 404: framework preset was "Other" — added `vercel.json` with `framework: "nextjs"` and patched via Vercel API
- Updated footer copyright 2025 → 2026
- Broadened copy from "Irish restaurants" to "hospitality & retail businesses"
- Added Railway `/api/onboard` call to signup route (non-fatal)
- Applied Supabase migration via `npx supabase db push` using `SUPABASE_ACCESS_TOKEN` env var
- Added confirmation link button to welcome email using `generateLink` (instead of `signUp`)
- Added then removed reCAPTCHA v3 (`react-google-recaptcha-v3`) — left TODO comments, kept package in `package.json`
- Added detailed `[signup]` prefixed logging throughout `/api/signup/route.ts`

### Session 3 (2026-04-06)
- Rebuilt complete auth flow from scratch (removed magic-link mode, removed reCAPTCHA provider wrapper):
  - `src/app/signup/page.tsx` — clean form, posts to `/api/signup`, redirects to `/signup/success`
  - `src/app/signup/success/page.tsx` — new static success page with Mail icon and next-steps checklist
  - `src/app/api/signup/route.ts` — clean rewrite: generateLink → Railway → profile insert → SendGrid welcome email with confirmation button → admin notification
  - `src/app/login/page.tsx` — email+password only, `friendlyAuthError()` helper, forgot password as `<Link>` to `/forgot-password`
  - `src/app/forgot-password/page.tsx` — new: `resetPasswordForEmail` with `redirectTo: https://tilltalk.ie/reset-password`, inline success state
  - `src/app/reset-password/page.tsx` — new: exchanges PKCE `code` param on mount, collects new password, `updateUser({ password })`, redirects to `/dashboard`
- Committed as `f3d39d2`, pushed to GitHub and Vercel

### Session 4 (2026-04-07)
- **Weather alerts on calendar** (`src/app/dashboard/CalendarSection.tsx` — full rewrite):
  - Pre-fetches 14-day forecast at mount via Open-Meteo free API (no key needed)
  - `classifyAlerts()` detects: heavy rain (>10mm), storm winds (>50km/h), extreme heat (>28°C), snow/ice (>0.5cm or WMO 71-77/85-86), dense fog (WMO 45/48)
  - Orange dots on calendar days that have alerts
  - Warning banners per alert in the detail panel with icon, label, and business impact text
  - Staffing suggestion is now alert-aware (snow > wind > rain > event compound logic)
  - 4-column weather grid in detail view (added snowfall card)
  - Legend updated: red=holiday, blue=event, green=reminder, orange=weather alert
- **Self-service account management** — new "Manage" section on dashboard:
  - `src/app/dashboard/ManageSection.tsx` (new ~500-line component): Numbers tab, Locations tab, Permissions tab
  - Numbers tab: list/toggle/role-edit/remove WhatsApp numbers, plan-limit bar, add new number
  - Locations tab: list/edit (inline with masked API key)/remove locations, guided credential help per POS type, add new location
  - Permissions tab: role legend (Owner/Manager/Staff) + quick role edit table
  - Plan limits enforced both server-side (Railway) and shown in UI: Starter 2/1, Pro 4/3, Business unlimited
  - API proxy routes: `src/app/api/manage/numbers/route.ts`, `src/app/api/manage/numbers/[id]/route.ts`, `src/app/api/manage/locations/route.ts`, `src/app/api/manage/locations/[id]/route.ts`
  - Railway backend: new `manage.py` Blueprint with 8 endpoints + 7 new database functions in `database.py`
- **POS Address field moved to Account Details**:
  - `addressStreet`, `addressCity`, `addressCountry` moved from `credForm` to `editForm` in `DashboardClient.tsx`
  - `handleSaveProfile` saves `pos_address_street/city/country` to Supabase
  - Account Details edit form shows address fields; POS Credentials no longer shows address
- **Website support chatbot** (`src/components/SupportChatWidget.tsx` — new):
  - Floating green chat button (bottom-right) on every page via `src/app/layout.tsx`
  - Visitor mode (sales assistant) vs client mode (support) based on Supabase auth session
  - Server-side API route `src/app/api/support-chat/route.ts` calls Anthropic `claude-haiku-4-5-20251001` directly
  - Chat history persisted in sessionStorage (last 40 messages, 20 sent to API)
  - Full-screen on mobile, 400×560px panel on desktop
  - Quick-question chips, typing indicator, escape-to-close, keyboard-friendly
  - `@anthropic-ai/sdk ^0.82.0` added to `package.json`
  - **Note: `ANTHROPIC_API_KEY` must be added to Vercel** — copy from Railway env vars: `npx vercel env add ANTHROPIC_API_KEY`

### Session 6 (2026-04-09) — Signup hardening, dashboard cleanup, GDPR export
- **Supabase RLS INSERT policy**: added `INSERT` policy to `profiles` table so the service-role client can write during signup without RLS blocking it
- **SMTP / SendGrid confirmed**: SendGrid API key wired up in Vercel; welcome email with confirmation link delivers via `src/lib/sendgrid.ts`; admin notification email also fires on every signup
- **Railway call isolation** (`src/app/api/signup/route.ts`): Railway `/api/onboard` call is now in its own isolated try/catch; `AbortSignal.timeout(8000)` prevents a slow/down Railway from hanging the Vercel function; 409 (duplicate trial) uses `earlyReturn` pattern — `deleteUser` uses `.catch()` so a cleanup failure can never suppress the 409 response
- **Welcome WhatsApp message updated** (`onboarding.py` on Railway): message now tells new users to add POS credentials first (Go to tilltalk.ie/dashboard → Manage → Locations) before asking sales questions
- **Merchant ID autocomplete bug fixed** (`src/app/dashboard/ManageSection.tsx`): browser was autofilling the Merchant ID input with the user's saved email; fixed by adding `autoComplete="off"` to the merchant_id field and `autoComplete="new-password"` to the api_key field
- **Legacy POS Credentials card removed** (`src/app/dashboard/DashboardClient.tsx`): removed entire POS Credentials card (form, status indicators, `CredentialsHelpModal`, `credLabels`, `handleSaveCredentials`, credential state); credentials are now managed exclusively via Manage → Locations in `ManageSection.tsx`; unused icons (`Lock`, `HelpCircle`, `Eye`, `EyeOff`) removed from imports
- **GDPR data export**: new `GET /api/export/route.ts` (session-authenticated proxy to Railway); "Export my data" button added to DataPrivacyCard in `DashboardClient.tsx`; downloads full JSON of client data
- **Admin health panel** (`src/app/admin/AdminClient.tsx`): Operations section displays live 7-check health status from Railway `/health` with coloured indicators; auto-refreshes every 60 s
- **Price change admin modal** (`src/app/admin/AdminClient.tsx`, `/api/admin/price-change/route.ts`): admin can send a branded price-change notification email to all active paying subscribers from the Operations section

### Session 5 (2026-04-07)
- **Founder admin dashboard** (`/admin`) — full rewrite of `src/app/admin/page.tsx` + `AdminClient.tsx`:
  - **Hero row**: MRR and ARR as large green/dark cards
  - **Customer Metrics**: 8 stat cards (total signups, this month, active trials, expiring soon, paid subscribers, conversion rate, churn, ghost signups) + plan breakdown bar + subscriber counts
  - **Trial Health**: table of trials expiring in 7 days with POS-connected flag, color-coded days remaining, one-click Extend Trial per row
  - **Revenue**: MRR-by-plan horizontal bars, subscriber distribution chart, MRR/ARR summary
  - **Usage & Engagement**: placeholder section (message tracking not yet enabled — requires `message_log` table in Railway)
  - **Operations**: live Railway status ping via `/api/admin/railway-stats` (client-side fetch, graceful offline), active clients/numbers/trials from Railway DB
  - **Marketing**: signups-per-day bar chart (last 30 days), UTM source breakdown horizontal bars
  - **POS Breakdown**: client count by POS type with percentage distribution
  - **All Clients**: searchable table with status filter tabs (all/trial/paid/expired/inactive), UTM column, extend/deactivate actions
  - Section nav in sticky header, auto-refresh every 5 minutes, toast notifications
- **UTM source tracking**:
  - `supabase/migrations/003_utm_source.sql` adds `utm_source` column to profiles — **must push: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db push`**
  - `signup/page.tsx` reads `?utm_source=` query param and passes to `/api/signup`
  - `/api/signup/route.ts` saves `utm_source` to profiles on insert
- **Railway admin endpoint** — new `admin_stats.py` Blueprint + registered in `main.py`:
  - `GET /api/admin/overview` — returns active/total clients, by-plan counts, active numbers, on-trial count
  - Secured with `X-Onboarding-Key` (same as all other Railway endpoints)
  - New Next.js proxy: `src/app/api/admin/railway-stats/route.ts` (admin-only, 6 s timeout)
- **PWA support** added to tilltalk.ie:
  - `public/manifest.json` — TillTalk name, green theme, standalone display, shortcuts to /dashboard
  - `public/sw.js` — service worker: network-only for /api/, cache-first for static assets, network-first with offline fallback for pages
  - `public/icon.svg` — green rounded-square "T" logo
  - `src/components/PwaInit.tsx` — registers SW on all pages; shows "Add to Home Screen" banner after 30 s on /dashboard only (sessionStorage dismissed flag)
  - `src/app/layout.tsx` — added `<PwaInit />`, manifest link via `metadata.manifest`, `theme-color` meta, `apple-touch-icon` link
  - **Note**: PNG icons (192×192 and 512×512) not yet generated — needed for full iOS PWA support. Add `icon-192.png` and `icon-512.png` to `/public/`.

---

## Roadmap

Items agreed or noted for future development. Not yet started unless marked.

### WhatsApp flag system + auto Claude Opus diagnosis
- User can flag a bad bot response directly in WhatsApp (e.g., reply "flag" or "that's wrong")
- Flagged message + surrounding context stored in a `flags` DB table (Railway)
- A daily or on-demand admin trigger re-runs the flagged query through `claude-opus-4-6` with a diagnostic system prompt to identify what went wrong
- Admin dashboard shows flagged responses + Opus diagnosis in a new "Quality" section
- Goal: systematic quality feedback loop without manual log-digging

### Staging environment
- Mirror of production on Railway (separate service, same GitHub repo, different env vars)
- Separate Vercel preview environment pointing at the staging Railway URL
- Goal: test onboarding flow, email delivery, and WhatsApp responses end-to-end before merging to main
