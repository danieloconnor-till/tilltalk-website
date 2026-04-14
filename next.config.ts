import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Sentry org and project — set these once you've created the project at sentry.io
  // org: "your-sentry-org",
  // project: "tilltalk-website",

  // Suppress verbose build output
  silent: !process.env.CI,

  // Upload source maps to Sentry for readable stack traces in production
  // Requires SENTRY_AUTH_TOKEN env var — add via `npx vercel env add SENTRY_AUTH_TOKEN`
  // Leave widenClientFileUpload false until auth token is configured
  widenClientFileUpload: false,

  // Hides the Sentry SDK from browser bundle to avoid ad-blockers stripping it
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements in production
  disableLogger: true,

  // Disable automatic instrumentation of Vercel Cron Monitors (not used)
  automaticVercelMonitors: false,
});
