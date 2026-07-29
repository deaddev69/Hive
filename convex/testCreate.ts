import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { normalizePhoneNumber } from "./boutiques";

export const testCreateNewPartner = internalMutation({
  args: { email: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const emailNormalized = args.email.trim().toLowerCase();
    const normalizedPhone = normalizePhoneNumber(args.phone);

    let existingUser = await ctx.db
      .query("users")
      .withIndex("by_normalizedEmail", (q) => q.eq("normalizedEmail", emailNormalized))
      .unique();
      
    let ownerUserId = existingUser?._id;

    if (!existingUser) {
      ownerUserId = await ctx.db.insert("users", {
        email: args.email,
        originalEmail: args.email,
        normalizedEmail: emailNormalized,
        phone: normalizedPhone,
        role: "boutique_owner",
        isActive: true,
        isPhoneVerified: false,
        createdAt: now,
        updatedAt: now,
      });
      
      await ctx.db.insert("customerProfiles", {
        userId: ownerUserId,
        displayName: "Test Owner",
        hiveScore: 100,
        totalOrders: 0,
        totalClaimsSubmitted: 0,
        updatedAt: now,
      });
    }

    return ownerUserId;
  }
});
