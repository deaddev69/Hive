import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

const SLUG_ALIASES: Record<string, string> = {
  privacy: "privacy-policy",
  "privacy-policy": "privacy-policy",
  terms: "terms-and-conditions",
  "terms-and-conditions": "terms-and-conditions",
  "terms-of-service": "terms-and-conditions",
  returns: "return-policy",
  "return-policy": "return-policy",
  refund: "return-policy",
  partner: "partner-agreement",
  "partner-agreement": "partner-agreement",
};

export const getLatestBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const targetSlug = SLUG_ALIASES[args.slug] || args.slug;
    const doc = await ctx.db
      .query("legalDocuments")
      .withIndex("by_slug", (q) => q.eq("slug", targetSlug))
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
