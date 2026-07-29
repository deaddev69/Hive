import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getDebugUsers = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_normalizedEmail", (q) => q.eq("normalizedEmail", args.email.toLowerCase()))
      .collect();
  }
});
