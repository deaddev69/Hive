import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { enforceAdmin } from "./homepageAdminShared";

// A block edit must never mutate a row currently in `status: "published"` — that row is exactly
// what ExperienceService serves to customers, so patching it directly would go live the instant
// an admin hits save, with no relation to the Publish button. If the target block is already
// draft or archived, editing it in place is safe (customers never see either status) and this
// just returns its own id unchanged. Only when the target is the live row does this fork a draft
// copy first, leaving the original published row — and what customers see — untouched until the
// next real Publish clones the draft forward.
async function ensureDraftBlock(ctx: any, blockId: any) {
  const block = await ctx.db.get(blockId);
  if (!block) throw new Error("Block not found");
  if (block.status !== "published") return blockId;
  const { _id, _creationTime, ...blockData } = block;
  return await ctx.db.insert("experienceBlocks", { ...blockData, status: "draft" });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCES ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const getExperiences = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("experiences").collect();
  },
});

export const createExperience = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("published"), v.literal("archived")),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("experiences", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateExperience = mutation({
  args: {
    id: v.id("experiences"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("archived"))),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const archiveExperience = mutation({
  args: { id: v.id("experiences") },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    await ctx.db.patch(args.id, {
      status: "archived",
      updatedAt: Date.now(),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCE BLOCKS ADMIN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const getExperienceBlocks = query({
  args: {
    experienceId: v.id("experiences"),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"), v.literal("all")))
  },
  handler: async (ctx, args) => {
    const targetStatus = args.status ?? "draft";

    if (targetStatus === "all") {
      const draft = await ctx.db
        .query("experienceBlocks")
        .withIndex("by_experience_status_sort", (q) =>
          q.eq("experienceId", args.experienceId).eq("status", "draft")
        )
        .collect();

      const archived = await ctx.db
        .query("experienceBlocks")
        .withIndex("by_experience_status_sort", (q) =>
          q.eq("experienceId", args.experienceId).eq("status", "archived")
        )
        .collect();
      const published = await ctx.db
        .query("experienceBlocks")
        .withIndex("by_experience_status_sort", (q) =>
          q.eq("experienceId", args.experienceId).eq("status", "published")
        )
        .collect();

      const allBlocks = [...draft, ...published, ...archived];

      // Deduplicate by blockKey, preferring draft > published > archived
      const deduplicatedMap = new Map();
      for (const block of allBlocks) {
        if (!deduplicatedMap.has(block.blockKey)) {
          deduplicatedMap.set(block.blockKey, block);
        } else {
          const existing = deduplicatedMap.get(block.blockKey);
          if (existing.status === "archived" && (block.status === "draft" || block.status === "published")) {
            deduplicatedMap.set(block.blockKey, block);
          } else if (existing.status === "published" && block.status === "draft") {
            deduplicatedMap.set(block.blockKey, block);
          }
        }
      }

      return Array.from(deduplicatedMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
    }

    return await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) =>
        q.eq("experienceId", args.experienceId).eq("status", targetStatus)
      )
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SEED STARTER HOMEPAGE DATA
// ─────────────────────────────────────────────────────────────────────────────

export const seedDefaultHomepageData = mutation({
  args: {},
  handler: async (ctx) => {
    await enforceAdmin(ctx);
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    // 2. Seed Collections if empty
    const existingCols = await ctx.db.query("collections").collect();
    const colIdMap: Record<string, string> = {};
    if (existingCols.length === 0) {
      const defaultCols = [
        { name: "Today's Edit", description: "Hand-picked daily editorial picks", slug: "todays-edit", coverImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80" },
        { name: "Fresh on Hive", description: "New arrivals in the last 14 days", slug: "fresh-on-hive", coverImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80" },
        { name: "Trending in Kochi", description: "Popular styles across Panampilly Nagar & Edappally", slug: "trending-in-kochi", coverImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80" },
        { name: "Going Out Today", description: "Evening co-ords & party wear", slug: "going-out-today", coverImage: "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=800&q=80" },
        { name: "Wedding Season", description: "Festive sarees, bridal lehengas & sherwanis", slug: "wedding-season", coverImage: "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=800&q=80" },
        { name: "Quiet Luxury", description: "Minimalist linen, silks & structured cuts", slug: "quiet-luxury", coverImage: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80" },
        { name: "Linen Love", description: "100% pure Kerala handloom linens", slug: "linen-love", coverImage: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80" },
        { name: "Under ₹999", description: "Affordable boutique finds", slug: "under-999", coverImage: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=800&q=80" },
      ];

      for (const col of defaultCols) {
        const id = await ctx.db.insert("collections", {
          name: col.name,
          description: col.description,
          slug: col.slug,
          coverImage: col.coverImage,
          sourceMode: "MANUAL",
          status: "published",
          createdAt: now,
          updatedAt: now,
        });
        colIdMap[col.slug] = id.toString();
      }
    } else {
      for (const col of existingCols) {
        colIdMap[col.slug] = col._id.toString();
      }
    }

    // 3. Seed Homepage Experience
    const existingExperiences = await ctx.db.query("experiences").collect();
    let homepageExpId: any = null;

    if (existingExperiences.length === 0) {
      homepageExpId = await ctx.db.insert("experiences", {
        name: "Homepage",
        slug: "homepage",
        seoTitle: "Hive - Women's Fashion Destination",
        seoDescription: "Discover curated fashion from the best local boutiques.",
        status: "published",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      homepageExpId = existingExperiences.find(e => e.slug === "homepage")?._id;
    }

    // 4. Seed Default Blocks if empty
    const existingBlocks = await ctx.db.query("experienceBlocks").collect();
    if (existingBlocks.length === 0 && homepageExpId) {
      const defaultBlocks = [
        { blockKey: "hero_main", title: "Hero Carousel", blockType: "hero" as const, renderer: "productCarousel" as const, sortOrder: 1, config: {} },
        { blockKey: "categories_strip", title: "Shop By Category", blockType: "category" as const, renderer: "largeCards" as const, sortOrder: 2, config: {} },
        { blockKey: "trending_kochi", title: "Trending in Kochi", subtitle: "Most requested styles across Panampilly Nagar, Edappally & Kakkanad.", blockType: "collection" as const, renderer: "productCarousel" as const, sortOrder: 3, config: { collectionId: colIdMap["trending-in-kochi"] } },
        { blockKey: "fresh_arrivals", title: "Fresh on Hive", subtitle: "New styles added today by verified boutique partners.", blockType: "collection" as const, renderer: "productCarousel" as const, sortOrder: 4, config: { collectionId: colIdMap["fresh-on-hive"] } },
        { blockKey: "going_out", title: "Going Out Today?", subtitle: "Evening co-ords, statement mini dresses & luxury accessories.", blockType: "collection" as const, renderer: "productCarousel" as const, sortOrder: 5, config: { collectionId: colIdMap["going-out-today"] } },
        { blockKey: "seasonal_highlight", title: "Wedding & Festive Curation '26", subtitle: "Handcrafted Zari sarees, bridal organzas & designer sherwanis.", blockType: "collection" as const, renderer: "editorialGrid" as const, sortOrder: 6, config: { collectionId: colIdMap["wedding-season"] } },
        { blockKey: "recently_viewed", title: "Recently Viewed & Recommended", blockType: "recentlyViewed" as const, renderer: "productCarousel" as const, sortOrder: 7, config: {} },
        { blockKey: "trust_strip", title: "Why Shop on Hive", blockType: "trust" as const, renderer: "largeCards" as const, sortOrder: 8, config: {} },
      ];

      for (const b of defaultBlocks) {
        await ctx.db.insert("experienceBlocks", {
          experienceId: homepageExpId,
          blockKey: b.blockKey,
          title: b.title,
          subtitle: b.subtitle,
          blockType: b.blockType,
          renderer: b.renderer,
          config: b.config,
          sortOrder: b.sortOrder,
          status: "published",
        });

        await ctx.db.insert("experienceBlocks", {
          experienceId: homepageExpId,
          blockKey: b.blockKey,
          title: b.title,
          subtitle: b.subtitle,
          blockType: b.blockType,
          renderer: b.renderer,
          config: b.config,
          sortOrder: b.sortOrder,
          status: "draft",
        });
      }
    }

    return true;
  },
});

export const deduplicateHomepageBlocks = mutation({
  args: {},
  handler: async (ctx) => {
    await enforceAdmin(ctx);
    const allBlocks = await ctx.db.query("experienceBlocks").collect();

    // Group blocks by experienceId + status + normalized title to detect duplicates
    const seen = new Map<string, any>();
    const toDelete: any[] = [];

    // Sort blocks descending by _creationTime so the newest edited version is retained
    allBlocks.sort((a, b) => b._creationTime - a._creationTime);

    for (const b of allBlocks) {
      const normTitle = (b.title || b.blockKey || "").trim().toLowerCase();
      const groupKey = `${b.experienceId}_${b.status}_${normTitle}`;

      if (seen.has(groupKey)) {
        toDelete.push(b);
      } else {
        seen.set(groupKey, b);
      }
    }

    for (const d of toDelete) {
      await ctx.db.delete(d._id);
    }

    return {
      totalFound: allBlocks.length,
      deletedCount: toDelete.length,
      remainingCount: allBlocks.length - toDelete.length,
      deletedBlocks: toDelete.map((d) => ({ id: d._id, title: d.title, status: d.status })),
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EXPERIENCE STUDIO MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const duplicateExperience = mutation({
  args: { id: v.id("experiences"), newName: v.string(), newSlug: v.string() },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    const experience = await ctx.db.get(args.id);
    if (!experience) throw new Error("Experience not found");

    const now = Date.now();
    const newExpId = await ctx.db.insert("experiences", {
      name: args.newName,
      slug: args.newSlug,
      seoTitle: experience.seoTitle,
      seoDescription: experience.seoDescription,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    // Duplicate all published blocks
    const blocks = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) =>
        q.eq("experienceId", args.id).eq("status", "published")
      )
      .collect();

    for (const b of blocks) {
      await ctx.db.insert("experienceBlocks", {
        experienceId: newExpId,
        blockKey: b.blockKey,
        title: b.title,
        subtitle: b.subtitle,
        blockType: b.blockType,
        renderer: b.renderer,
        config: b.config,
        sortOrder: b.sortOrder,
        status: "draft",
      });
    }

    return newExpId;
  },
});

export const addBlockToExperience = mutation({
  args: {
    experienceId: v.id("experiences"),
    blockKey: v.string(),
    blockType: v.union(
      v.literal("collection"),
      v.literal("category"),
      v.literal("hero"),
      v.literal("banner"),
      v.literal("recentlyViewed"),
      v.literal("recommended"),
      v.literal("trust"),
      v.literal("vibeGrid"),
      v.literal("newArrivals"),
      v.literal("premiumCuration"),
      v.literal("smartRail")
    ),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    renderer: v.optional(v.union(
      v.literal("productCarousel"),
      v.literal("largeCards"),
      v.literal("moodGrid"),
      v.literal("occasionGrid"),
      v.literal("editorialGrid"),
      v.literal("twoProductGrid"),
      v.literal("vibeGrid"),
      v.literal("premiumGrid")
    )),
    config: v.optional(v.any()),
    sortOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    // Guard against creating a second row with the same blockKey + status
    // (this is how orphaned duplicate blocks have crept in before).
    const clash = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_blockKey", (q) => q.eq("blockKey", args.blockKey))
      .filter((q) => q.eq(q.field("status"), "draft"))
      .first();
    if (clash) {
      throw new Error(`A block with key "${args.blockKey}" already exists in draft status.`);
    }
    return await ctx.db.insert("experienceBlocks", {
      experienceId: args.experienceId,
      blockKey: args.blockKey,
      blockType: args.blockType,
      title: args.title,
      subtitle: args.subtitle,
      renderer: args.renderer,
      config: args.config,
      sortOrder: args.sortOrder,
      status: "draft",
    });
  },
});

export const removeBlockFromExperience = mutation({
  args: { id: v.id("experienceBlocks") },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

export const updateExperienceLayout = mutation({
  args: {
    blocks: v.array(v.object({
      id: v.id("experienceBlocks"),
      sortOrder: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    for (const b of args.blocks) {
      await ctx.db.patch(b.id, { sortOrder: b.sortOrder });
    }
  },
});

export const publishExperience = mutation({
  args: { experienceId: v.id("experiences") },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    let draftBlocks = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) =>
        q.eq("experienceId", args.experienceId).eq("status", "draft")
      )
      .collect();

    const publishedBlocks = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) =>
        q.eq("experienceId", args.experienceId).eq("status", "published")
      )
      .collect();

    // If there are no draft blocks but there are published blocks, keep published blocks intact
    if (draftBlocks.length === 0 && publishedBlocks.length > 0) {
      await ctx.db.patch(args.experienceId, {
        status: "published",
        updatedAt: Date.now(),
      });
      return;
    }

    // Delete current published blocks
    for (const pb of publishedBlocks) {
      await ctx.db.delete(pb._id);
    }

    // Clone draft blocks to published
    for (const db of draftBlocks) {
      const { _id, _creationTime, ...blockData } = db;
      await ctx.db.insert("experienceBlocks", {
        ...blockData,
        status: "published",
      });
    }

    await ctx.db.patch(args.experienceId, {
      status: "published",
      updatedAt: Date.now(),
    });
  },
});

export const updateBlockContent = mutation({
  args: {
    id: v.id("experienceBlocks"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    // Only the Personalized Rail card sends this, to switch between the recentlyViewed and
    // recommended sourcing strategies without forcing the operator to delete and re-add the
    // block. Still publish-gated: it goes through ensureDraftBlock like every other edit.
    blockType: v.optional(v.union(
      v.literal("recentlyViewed"),
      v.literal("recommended")
    )),
    config: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    const { id, ...updates } = args;
    const targetId = await ensureDraftBlock(ctx, id);
    await ctx.db.patch(targetId, updates);
  },
});

export const updateBlockLayout = mutation({
  args: {
    id: v.id("experienceBlocks"),
    renderer: v.optional(
      v.union(
        v.literal("productCarousel"),
        v.literal("largeCards"),
        v.literal("moodGrid"),
        v.literal("occasionGrid"),
        v.literal("editorialGrid"),
        v.literal("twoProductGrid"),
        v.literal("vibeGrid"),
        v.literal("premiumGrid")
      )
    ),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    const targetId = await ensureDraftBlock(ctx, args.id);
    await ctx.db.patch(targetId, { renderer: args.renderer });
  },
});

export const toggleBlockVisibility = mutation({
  args: {
    id: v.id("experienceBlocks"),
    isHidden: v.boolean(),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    const newStatus = args.isHidden ? "archived" : "draft";
    const targetId = await ensureDraftBlock(ctx, args.id);
    await ctx.db.patch(targetId, { status: newStatus });
  },
});

export const duplicateBlock = mutation({
  args: {
    id: v.id("experienceBlocks"),
  },
  handler: async (ctx, args) => {
    await enforceAdmin(ctx);
    const block = await ctx.db.get(args.id);
    if (!block) throw new Error("Block not found");

    const { _id, _creationTime, ...blockData } = block;

    const allBlocks = await ctx.db
      .query("experienceBlocks")
      .withIndex("by_experience_status_sort", (q) =>
        q.eq("experienceId", block.experienceId)
      )
      .collect();

    const maxSort = allBlocks.reduce((max, b) => Math.max(max, b.sortOrder), 0);

    return await ctx.db.insert("experienceBlocks", {
      ...blockData,
      blockKey: `${blockData.blockKey}_copy_${Date.now()}`,
      sortOrder: maxSort + 1,
      status: "draft", // Always duplicate as visible
    });
  },
});
