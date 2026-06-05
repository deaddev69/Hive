import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for development quality
  reactStrictMode: true,

  // Transpile shared workspace packages
  transpilePackages: ["@hive/types", "@hive/ui", "@hive/utils"],

  // Image optimization — allow Cloudinary CDN
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname:  "res.cloudinary.com",
        pathname:  "/**",
      },
    ],
  },

  // Experimental: Server Actions are stable in Next.js 15
  // Enable partial pre-rendering when ready
  experimental: {
    // ppr: true,  // enable when stable for your deployment
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
};

export default nextConfig;
