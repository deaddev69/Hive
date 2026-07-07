import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getLatestBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("legalDocuments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    return doc;
  },
});

export const seedLegalDocuments = internalMutation({
  args: {
    slug: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("legalDocuments")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: Date.now(),
      });
      return { success: true, action: "updated" };
    } else {
      await ctx.db.insert("legalDocuments", {
        slug: args.slug,
        content: args.content,
        updatedAt: Date.now(),
      });
      return { success: true, action: "inserted" };
    }
  },
});
