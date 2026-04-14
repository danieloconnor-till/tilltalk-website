import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 20% of transactions for performance monitoring
  tracesSampleRate: 0.2,

  // Capture 10% of sessions for session replays (errors always captured)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Only initialise when a DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  integrations: [
    Sentry.replayIntegration(),
  ],
})
