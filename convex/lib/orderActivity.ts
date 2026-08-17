// convex/lib/orderActivity.ts
// Server-side helper for recording order activity with actor attribution.
// Actor identity is ALWAYS derived from the authenticated Clerk session — never from frontend args.

import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { getAuthenticatedUser } from "./auth";

type OrderAction = "confirmed";
type ActorRole = "owner" | "staff" | "admin" | "system";

/**
 * Records an order activity event with immutable actor snapshots.
 *
 * Must be called from within a Convex mutation (same transaction as the order patch).
 * Resolves actor identity server-side from ctx.auth — never accepts actor details from the client.
 *
 * @param ctx - Convex mutation context (carries authenticated identity)
 * @param args.orderId - The order being acted upon
 * @param args.boutiqueId - The boutique the order belongs to
 * @param args.action - The action being recorded (e.g. "confirmed")
 * @param args.createdAt - Timestamp to use (must match the order patch timestamp for consistency)
 */
export async function recordOrderActivity(
  ctx: MutationCtx,
  args: {
    orderId: Id<"orders">;
    boutiqueId: Id<"boutiques">;
    action: OrderAction;
    createdAt: number;
  }
) {
  const user = await getAuthenticatedUser(ctx);

  // Derive role from the database user record — never from frontend
  let actorRole: ActorRole;
  if (user.role === "boutique_owner") {
    actorRole = "owner";
  } else if (user.role === "boutique") {
    actorRole = "staff";
  } else if (user.role === "admin") {
    actorRole = "admin";
  } else {
    // Unexpected role calling an order action — default to staff, don't block order flow
    actorRole = "staff";
  }

  // Resolve display name from customerProfiles, fall back to email
  const profile = await ctx.db
    .query("customerProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .unique();

  const actorName = profile?.displayName || user.email || "Unknown";
  const actorEmail = user.email;

  await ctx.db.insert("orderActivity", {
    orderId: args.orderId,
    boutiqueId: args.boutiqueId,
    action: args.action,
    actorId: user._id,
    actorRole,
    actorName,
    actorEmail,
    createdAt: args.createdAt,
  });
}
