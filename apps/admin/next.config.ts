import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  devIndicators: false,
  transpilePackages: ["@hive/types", "@hive/ui", "@hive/utils"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // Canonical public image domain (R2 custom domain + Cloudflare transforms).
        protocol: "https",
        hostname: "cdn.hivenow.in",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "assets.hivenow.in",
        pathname: "/**",
      },
      {
        // Legacy development endpoint. Retained so image URLs already stored in
        // the database keep rendering; new URLs are never generated for it.
        protocol: "https",
        hostname: "pub-09a817ec6f384c4997feafc5e8387286.r2.dev",
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
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

export default nextConfig;
