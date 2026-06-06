// convex/auth.config.ts
// Clerk + Convex Auth integration
// Docs: https://docs.convex.dev/auth/clerk
//
// IMPORTANT: For Convex auth to work, you MUST:
// 1. Create a JWT Template named "convex" in Clerk Dashboard → JWT Templates
//    (use the default settings — Convex knows the template name)
// 2. Set CLERK_JWT_ISSUER_DOMAIN in Convex Dashboard → Settings → Environment Variables
//    Value: https://helpful-walrus-13.clerk.accounts.dev

export default {
  providers: [
    {
      // Clerk instance issuer URL — matches Clerk Dashboard domain
      // Convex fetches {domain}/.well-known/openid-configuration to validate JWTs
      domain:        process.env.CLERK_JWT_ISSUER_DOMAIN ?? "https://helpful-walrus-13.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
