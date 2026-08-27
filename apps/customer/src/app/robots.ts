import type { MetadataRoute } from "next";

const SITE_URL = "https://www.hivenow.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account/",
          "/cart/",
          "/checkout/",
          "/orders/",
          "/sign-in/",
          "/sign-up/",
          "/wishlist/",
          "/search/",
          "/waitlist/",
          "/not-serviceable/",
          "/order/success/",
          "/claims/",
        ],
      },
      // Explicitly allow AI answer-engine crawlers (GEO) — Google's own
      // Google-Extended controls Gemini/AI Overviews training use separately
      // from regular Googlebot indexing, so this doesn't affect normal SEO.
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "anthropic-ai", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
      { userAgent: "meta-externalagent", allow: "/" },
      // Block crawlers that primarily scrape for third-party model
      // training with no citation/answer-engine benefit back to Hive
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Bytespider", disallow: "/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
