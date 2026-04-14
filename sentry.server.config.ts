import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.2,

  // Only initialise when a DSN is configured
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
