import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

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
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

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

  // Redirects for legacy links and typos
  async redirects() {
    return [
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
      "connect-src 'self' data: https://*.clerk.com https://*.clerk.accounts.dev https://*.hivenow.in https://hivenow.in wss://*.hivenow.in https://accounts.hivenow.in wss://accounts.hivenow.in https://challenges.cloudflare.com https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://maps.googleapis.com https://*.googleapis.com https://apis.google.com https://images.unsplash.com https://*.r2.dev https://api.fontshare.com https://cdn.fontshare.com https://*.fontshare.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.cloudflareinsights.com https://www.google.com https://www.gstatic.com https://maps.gstatic.com https://*.gstatic.com https://*.razorpay.com https://*.r2.cloudflarestorage.com",
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

export default withPWA(nextConfig);
