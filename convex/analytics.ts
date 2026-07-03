// convex/analytics.ts
// Lightweight analytics logging mutations.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserOrNull } from "./lib/auth";

/**
 * Log a lightweight frontend analytics/funnel event.
 */
export const logFunnelEvent = mutation({
  args: {
    eventType: v.union(
      v.literal("pdp_view"),
      v.literal("cart_add"),
      v.literal("checkout_start"),
      v.literal("purchase_complete"),
      v.literal("cross_boutique_modal_shown"),
      v.literal("cross_boutique_replace_selected"),
      v.literal("cross_boutique_wishlist_selected"),
      v.literal("cross_boutique_dismissed")
    ),
    sessionId: v.optional(v.string()),
    boutiqueId: v.optional(v.id("boutiques")),
    productId: v.optional(v.id("products")),
    metadata: v.optional(v.string()), // Optional JSON metadata string
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx);
    const userId = user ? user._id : undefined;

    // Package boutiqueId, productId, and client metadata inside the properties field
    const propertiesObj: Record<string, any> = {};
    if (args.boutiqueId) propertiesObj.boutiqueId = args.boutiqueId;
    if (args.productId) propertiesObj.productId = args.productId;
    if (args.metadata) {
      try {
        propertiesObj.metadata = JSON.parse(args.metadata);
      } catch {
        propertiesObj.metadata = args.metadata;
      }
    }

    await ctx.db.insert("analyticsEvents", {
      eventName: args.eventType,
      userId,
      sessionId: args.sessionId || "anonymous_session",
      properties: Object.keys(propertiesObj).length > 0 ? JSON.stringify(propertiesObj) : undefined,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});
