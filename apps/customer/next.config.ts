import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  dynamicStartUrl: false,
  cacheStartUrl: false,
  workboxOptions: {
    cacheId: "hive-v2",
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        urlPattern: /\/_next\/image\?url=.+$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-image-v2",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /^https:\/\/(?:cdn\.hivenow\.in|.*\.convex\.cloud|images\.unsplash\.com)\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "external-media-v2",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, // 24 hours
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "static-image-assets-v2",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /^https:\/\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "cross-origin-v2",
          networkTimeoutSeconds: 3,
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  // Enable React strict mode for development quality
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  devIndicators: false,

  // Transpile shared workspace packages
  transpilePackages: ["@hive/types", "@hive/ui", "@hive/utils"],

  // Image optimization — allow Unsplash and Convex CDNs
  images: {
    unoptimized: true,
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
    ],
  },

  // Experimental: Server Actions are stable in Next.js 15
  // Enable partial pre-rendering when ready
  experimental: {
  },

  // Security headers
  async headers() {
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://*.hivenow.in https://hivenow.in https://*.convex.cloud https://maps.googleapis.com https://*.googleapis.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com",
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.hivenow.in https://hivenow.in wss://*.hivenow.in https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://maps.googleapis.com https://*.googleapis.com https://api.fontshare.com https://cdn.fontshare.com https://*.fontshare.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.cloudflareinsights.com",
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com https://cdn.fontshare.com https://*.fontshare.com https://*.hivenow.in",
      "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com https://*.fontshare.com data: https://*.hivenow.in",
      "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.hivenow.in https://hivenow.in",
      "worker-src 'self' blob:",
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
