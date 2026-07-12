import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Strict CSP — 02 §11: no third-party scripts except Umami.
const umamiOrigin = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_UMAMI_SRC ?? "https://cloud.umami.is/script.js",
    ).origin;
  } catch {
    return "https://cloud.umami.is";
  }
})();

const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // dev: webpack runtime needs eval; never shipped in production builds
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${umamiOrigin}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://avatars.githubusercontent.com https://github.com",
  `connect-src 'self' ${umamiOrigin} https://api.github.com https://*.supabase.co wss://*.supabase.co https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io`,
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  // Source-map upload only runs when SENTRY_AUTH_TOKEN is present (CI/Vercel).
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  disableLogger: true,
});
