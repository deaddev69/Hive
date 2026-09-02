import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import { withSentryConfig } from "@sentry/nextjs";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  customWorkerSrc: "worker",
  dynamicStartUrl: false,
  cacheStartUrl: false,
  workboxOptions: {
    cacheId: "hive-v3",
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
  },
  reloadOnOnline: true,
});

const nextConfig: NextConfig = {
  // Enable React strict mode for development quality
  reactStrictMode: true,

  // `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` were both
  // removed here. They meant a type error or a lint error could not fail a
  // production build — and with no error monitoring in place either, such a
  // fault reached real users silently. The build now fails on both, and CI
  // checks them on every pull request (.github/workflows/ci.yml).

  devIndicators: false,

  // Transpile shared workspace packages
  transpilePackages: ["@hive/types", "@hive/ui", "@hive/utils"],

  // Image optimization — Vercel resizes/re-encodes (WebP/AVIF) on the fly instead of every
  // product photo, banner, and drawer asset being served at its raw uploaded size. This was
  // previously switched off site-wide (unoptimized: true) — almost certainly to avoid Vercel's
  // usage-based image-optimization billing — but it meant literally no image on the customer
  // site was ever resized or re-encoded, which is the single largest contributor to the slow
  // "first product image visible" timing found in the 2026-08-31 performance investigation.
  // Requires a Vercel plan with image optimization included (Pro or above).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.convex.cloud",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pub-09a817ec6f384c4997feafc5e8387286.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.hivenow.in",
        pathname: "/**",
      },
    ],
  },

  // Experimental: Server Actions are stable in Next.js 15
  // Enable partial pre-rendering when ready
  experimental: {
  },

  // Redirects for legacy links, typos, and retired pages
  async redirects() {
    return [
      {
        source: "/collections",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/collections/:slug*",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/category/ethnic-wer",
        destination: "/products?category=womens-ethnic",
        permanent: true,
      },
      {
        source: "/category/ethnic-wear",
        destination: "/products?category=womens-ethnic",
        permanent: true,
      },
      {
        source: "/category/:slug*",
        destination: "/products?category=:slug*",
        permanent: true,
      },
    ];
  },

  // Security headers
  async headers() {
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://*.hivenow.in https://hivenow.in https://accounts.hivenow.in https://challenges.cloudflare.com https://*.convex.cloud https://maps.googleapis.com https://*.googleapis.com https://apis.google.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://*.razorpay.com",
      "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://*.hivenow.in https://hivenow.in https://accounts.hivenow.in https://challenges.cloudflare.com https://*.convex.cloud https://maps.googleapis.com https://*.googleapis.com https://apis.google.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://*.razorpay.com",
      // Added for this phase: `*.ingest.sentry.io` so error reports can be sent,
      // and `vitals.vercel-insights.com` for Speed Insights beacons. Without
      // these the browser silently blocks both and the dashboards stay empty.
      "connect-src 'self' data: https://*.clerk.com https://*.clerk.accounts.dev https://*.hivenow.in https://hivenow.in wss://*.hivenow.in https://accounts.hivenow.in wss://accounts.hivenow.in https://challenges.cloudflare.com https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://maps.googleapis.com https://*.googleapis.com https://apis.google.com https://images.unsplash.com https://*.r2.dev https://cdn.hivenow.in https://api.fontshare.com https://cdn.fontshare.com https://*.fontshare.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.cloudflareinsights.com https://www.google.com https://www.gstatic.com https://maps.gstatic.com https://*.gstatic.com https://*.razorpay.com https://*.r2.cloudflarestorage.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io https://vitals.vercel-insights.com",
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com https://cdn.fontshare.com https://*.fontshare.com https://*.hivenow.in",
      "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com https://*.fontshare.com data: https://*.hivenow.in",
      "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.hivenow.in https://hivenow.in https://accounts.hivenow.in https://challenges.cloudflare.com https://*.firebaseapp.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/ https://www.google.com/ https://*.razorpay.com",
      "worker-src 'self' blob: https://*.clerk.com https://*.clerk.accounts.dev https://accounts.hivenow.in",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(self)" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  // Resolve @convex/* alias to the monorepo convex/_generated directory
  webpack(config) {
    const path = require("path");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@convex": path.resolve(__dirname, "../../convex/_generated"),
    };
    return config;
  },
};

/**
 * Sentry wraps the config last so it can upload source maps at build time and
 * instrument the server runtime.
 *
 * Every option below is chosen so that a build with no Sentry environment
 * variables behaves exactly as it did before: `withSentryConfig` is a
 * pass-through when SENTRY_AUTH_TOKEN is absent, and the runtime configs
 * themselves no-op without a DSN.
 */
export default withSentryConfig(withPWA(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Quiet unless something goes wrong; the build log is already long.
  silent: !process.env.CI,

  // Upload source maps so production stack traces are readable, then delete
  // them from the deployed output so the original source is not publicly
  // downloadable.
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  // Routes Sentry's own browser requests through the app's origin, so ad
  // blockers and strict network policies do not silently drop error reports.
  tunnelRoute: "/monitoring",

  // Smaller client bundle — strips Sentry's internal debug logging.
  disableLogger: true,

  // Do not fail a production deploy because source-map upload had a bad day.
  errorHandler: (err) => {
    console.warn("[sentry] source map upload failed (build continues):", err?.message ?? err);
  },
});
