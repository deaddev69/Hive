// convex/auth.config.ts
// Clerk + Convex Auth integration
// Docs: https://docs.convex.dev/auth/clerk
//
// IMPORTANT: For Convex auth to work, you MUST:
// 1. Create a JWT Template named "convex" in Clerk Dashboard → JWT Templates
//    (use the default settings — Convex knows the template name)
// 2. Set CLERK_JWT_ISSUER_DOMAIN in Convex Dashboard → Settings → Environment Variables
//    Value: <your Clerk JWT Issuer Domain from Clerk Dashboard>

export default {
  providers: [
    {
      domain: "https://clerk.hivenow.in",
      applicationID: "convex",
    },
    {
      domain: "https://artistic-tiger-76.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

