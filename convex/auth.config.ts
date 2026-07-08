// convex/auth.config.ts
// Clerk + Convex Auth integration
// Docs: https://docs.convex.dev/auth/clerk
//
// IMPORTANT: For Convex auth to work, you MUST:
// 1. Create a JWT Template named "convex" in Clerk Dashboard → JWT Templates
//    (use the default settings — Convex knows the template name)
// 2. Set CLERK_JWT_ISSUER_DOMAIN in Convex Dashboard → Settings → Environment Variables
//    Value: <your Clerk JWT Issuer Domain from Clerk Dashboard>

const isProd = process.env.NODE_ENV === "production" || process.env.CONVEX_ENV === "production";

const providers = [
  // Firebase Auth (Customer Storefront)
  {
    domain: `https://securetoken.google.com/${process.env.FIREBASE_PROJECT_ID || "hive-fashion"}`,
    applicationID: process.env.FIREBASE_PROJECT_ID || "hive-fashion",
  },
  // Clerk Auth (Boutique Seller & Admin Portals - Production)
  {
    domain: "https://hivenow.in",
    applicationID: "convex",
  },
  {
    domain: "https://accounts.hivenow.in",
    applicationID: "convex",
  },
  {
    domain: "https://clerk.hivenow.in",
    applicationID: "convex",
  },
];

if (!isProd) {
  // Clerk Auth (Dev instance fallback - excluded in production)
  providers.push({
    domain: "https://artistic-tiger-76.clerk.accounts.dev",
    applicationID: "convex",
  });
}

export default { providers };

