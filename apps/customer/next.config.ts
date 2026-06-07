import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for development quality
  reactStrictMode: true,

  // Transpile shared workspace packages
  transpilePackages: ["@hive/types", "@hive/ui", "@hive/utils"],

  // Image optimization — allow Cloudinary and Unsplash CDNs
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname:  "res.cloudinary.com",
        pathname:  "/**",
      },
      {
        protocol: "https",
        hostname:  "images.unsplash.com",
        pathname:  "/**",
      },
    ],
  },

  // Experimental: Server Actions are stable in Next.js 15
  // Enable partial pre-rendering when ready
  experimental: {
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options",        value: "DENY" },
          { key: "X-Content-Type-Options",  value: "nosniff" },
          { key: "Referrer-Policy",         value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",      value: "geolocation=(self)" },
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

export default nextConfig;
