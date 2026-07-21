import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  dynamicStartUrl: false,
  cacheStartUrl: false,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" 
      ? { exclude: ["error", "warn"] }
      : false,
  },
  transpilePackages: ["@hive/types", "@hive/ui", "@hive/utils"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://*.hivenow.in https://hivenow.in https://*.convex.cloud https://maps.googleapis.com https://*.googleapis.com https://*.cloudflareinsights.com https://static.cloudflareinsights.com",
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.hivenow.in https://hivenow.in wss://*.hivenow.in https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://maps.googleapis.com https://*.googleapis.com https://api.fontshare.com https://cdn.fontshare.com https://*.fontshare.com https://fonts.googleapis.com https://fonts.gstatic.com https://*.cloudflareinsights.com https://*.r2.dev https://images.unsplash.com",
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
