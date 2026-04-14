import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Sentry org/project — can also be set via SENTRY_ORG / SENTRY_PROJECT env vars
  // org: "your-sentry-org",
  // project: "tilltalk-website",

  // Suppress build output unless debugging
  silent: true,

  // Skip source map upload when SENTRY_AUTH_TOKEN is not configured.
  // Set SENTRY_AUTH_TOKEN in Vercel env vars to enable upload for readable stack traces.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
