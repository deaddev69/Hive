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
      domain: (() => {
        const domain = process.env.CLERK_JWT_ISSUER_DOMAIN;
        if (!domain) {
          throw new Error(
            "CLERK_JWT_ISSUER_DOMAIN is not set. " +
            "Add it in Convex Dashboard → Settings → Environment Variables. " +
            "Find the value in Clerk Dashboard → JWT Templates → convex."
          );
        }
        return domain;
      })(),
      applicationID: "convex",
    },
  ],
};

