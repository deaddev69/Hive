import { normalizeEmail } from "./users";

// Shared admin-role gate used across the merchandising/experience-engine mutation files
// (homepageCollectionsAdmin.ts, homepageExperiencesAdmin.ts). Split out of the old single
// homepageAdmin.ts god-file so both halves can import one copy instead of each carrying their own.
export async function enforceAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated call");
  }

  // 1. Match by Clerk ID (canonical across Hive)
  let user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .unique();

  // 2. Match by tokenIdentifier fallback
  if (!user && identity.tokenIdentifier) {
    user = await ctx.db
      .query("users")
      .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
  }

  // 3. Match by normalized email fallback
  if (!user && identity.email) {
    const norm = normalizeEmail(identity.email);
    if (norm) {
      user = await ctx.db
        .query("users")
        .withIndex("by_normalizedEmail", (q: any) => q.eq("normalizedEmail", norm))
        .unique();
    }
  }

  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized access: admin privileges required");
  }
}
