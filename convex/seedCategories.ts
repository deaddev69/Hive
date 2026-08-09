import { mutation } from "./_generated/server";

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const categoriesToSeed = [
      { name: "Anarkalis", slug: "anarkalis", image: "", sortOrder: 5 },
      { name: "Gowns", slug: "gowns", image: "", sortOrder: 6 },
      { name: "Indo-Western", slug: "indo-western", image: "", sortOrder: 7 },
      { name: "Blouses", slug: "blouses", image: "", sortOrder: 8 },
      { name: "Dupattas", slug: "dupattas", image: "", sortOrder: 9 },
      { name: "Co-ord Sets", slug: "co-ord-sets", image: "", sortOrder: 10 },
      { name: "Fusion Wear", slug: "fusion-wear", image: "", sortOrder: 11 },
      { name: "Tops", slug: "tops", image: "", sortOrder: 12 },
      { name: "Maternity Wear", slug: "maternity-wear", image: "", sortOrder: 13 },
      { name: "Night Wear", slug: "night-wear", image: "", sortOrder: 14 },
      { name: "Pinteresty", slug: "pinteresty", image: "", sortOrder: 15 },
      { name: "Korean Wear", slug: "korean-wear", image: "", sortOrder: 16 },
    ];

    let count = 0;
    for (const cat of categoriesToSeed) {
      // Check if it already exists
      const existing = await ctx.db
        .query("categories")
        .filter((q) => q.eq(q.field("slug"), cat.slug))
        .first();

      if (!existing) {
        await ctx.db.insert("categories", {
          name: cat.name,
          slug: cat.slug,
          image: cat.image,
          isActive: true,
          sortOrder: cat.sortOrder,
          showOnHomepage: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        count++;
      }
    }
    return `Seeded ${count} categories successfully.`;
  },
});
