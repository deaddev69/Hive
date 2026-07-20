import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
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
    ],
  },
  async headers() {
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.accounts.dev https://*.convex.cloud https://maps.googleapis.com https://*.googleapis.com",
      "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://maps.googleapis.com",
      "img-src 'self' data: blob: https:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
      "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com data:",
      "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev",
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
