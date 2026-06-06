// convex/debug.ts
// Temporary debug endpoint — safe to remove once auth is verified working.

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns the current Clerk identity as seen by Convex.
 * If null → auth token is not reaching Convex (wrong issuer domain or
 * missing ConvexProviderWithClerk on the client).
 */
export const whoAmI = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { authenticated: false, identity: null };
    }
    return {
      authenticated: true,
      identity: {
        subject:         identity.subject,
        tokenIdentifier: identity.tokenIdentifier,
        issuer:          identity.issuer,
        email:           identity.email,
        name:            identity.name,
      },
    };
  },
});
