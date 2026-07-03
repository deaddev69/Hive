// convex/seed.ts
// Dev script to seed categories, boutique stores, and mock products.

import { action } from "./_generated/server";

/**
 * Main seed action. Fetches real images for categories from Unsplash
 * and triggers the data insertion mutation.
 */
export const seedAll = action({
  args: {},
  handler: async (ctx) => {
    if (process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Seeding mock database is disabled in this environment.");
    }
    // 1. Download real images for categories from Unsplash
    const categoriesWithUrls = [
      { slug: "sarees", url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=300" },
      { slug: "lehengas", url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&q=80&w=300" },
      { slug: "kurtis", url: "https://images.unsplash.com/photo-1608748010899-18f300247112?auto=format&fit=crop&q=80&w=300" },
      { slug: "salwar-sets", url: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=300" },
      { slug: "jewellery", url: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=300" },
      { slug: "home", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=300" }
    ];

    const categoryImageIds: Record<string, string> = {};
    for (const cat of categoriesWithUrls) {
      try {
        const response = await fetch(cat.url);
        if (!response.ok) throw new Error("Fetch failed");
        const arrayBuffer = await response.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: "image/jpeg" });
        const storageId = await ctx.storage.store(blob);
        categoryImageIds[cat.slug] = storageId;
      } catch (err) {
        console.error(`Failed to fetch image for ${cat.slug}, using fallback`, err);
        const fallback = new Blob(["fallback-image-data"], { type: "image/png" });
        const storageId = await ctx.storage.store(fallback);
        categoryImageIds[cat.slug] = storageId;
      }
    }

    // 2. Call the mutation to populate categories, boutiques, and products.
    // Use string-based function reference to avoid circular typescript imports.
    const result = await ctx.runMutation("seedMutations:insertMockData" as any, { categoryImageIds });
    return result as { success: boolean; seededBoutiques: number; seededProducts: number };
  },
});
