// convex/auth.config.ts
// Clerk + Convex Auth integration
// Docs: https://docs.convex.dev/auth/clerk

const authConfig = {
  providers: [
    {
      // This matches the JWT issuer URL from your Clerk dashboard
      // Dashboard → JWT Templates → Convex template
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
