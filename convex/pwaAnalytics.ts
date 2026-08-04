import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Record a PWA install event idempotently by unique deviceId.
 */
export const recordPWAInstall = mutation({
  args: {
    deviceId: v.string(),
    platform: v.string(),
    userAgent: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pwaInstalls")
      .withIndex("by_deviceId", (q) => q.eq("deviceId", args.deviceId))
      .first();

    if (!existing) {
      const identity = await ctx.auth.getUserIdentity();
      let userId: Id<"users"> | undefined = undefined;
      if (identity) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
          .first();
        if (user) userId = user._id;
      }

      await ctx.db.insert("pwaInstalls", {
        userId,
        deviceId: args.deviceId,
        platform: args.platform,
        userAgent: args.userAgent,
        installedAt: Date.now(),
      });
      return { recorded: true };
    }
    return { recorded: false, existing: true };
  },
});

/**
 * Get total PWA installation metrics and platform breakdown for admin dashboard.
 */
export const getPWAStats = query({
  handler: async (ctx) => {
    const installs = await ctx.db.query("pwaInstalls").collect();

    const totalInstalls = installs.length;
    const androidCount = installs.filter((i) => i.platform === "android").length;
    const iosCount = installs.filter((i) => i.platform === "ios").length;
    const desktopCount = installs.filter((i) => i.platform === "desktop").length;

    return {
      totalInstalls,
      breakdown: {
        android: androidCount,
        ios: iosCount,
        desktop: desktopCount,
      },
    };
  },
});
