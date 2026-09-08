import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { VerticalTypeValidator } from "./schema";
import { getPlatformMarkupRate } from "./pricingHelpers";
import { calculateProductPricing, DEFAULT_TIER_SLABS, getPlatformConfig, calculateAllInclusivePricePaise } from "./pricingService";



/**
 * Migration to backfill the productPerformance table for all historical orders and claims.
 * Keeps convex queries strictly read-only and aggregates all stats safely in O(1) fields.
 */
export const backfillProductPerformance = mutation({
  args: {},
  handler: async (ctx) => {
    // If run from client, enforce admin check. Bypassed for Convex CLI run command.
    const identity = await ctx.auth.getUserIdentity();
    if (identity !== null) {
      await requireRole(ctx, "admin");
    }

    const products = await ctx.db.query("products").collect();
    const allClaims = await ctx.db.query("claims").collect();
    
    // Group claims by orderItemId for efficient O(N) access
    const claimsByOrderItemId = new Map<string, any[]>();
    for (const claim of allClaims) {
      const list = claimsByOrderItemId.get(claim.orderItemId) || [];
      list.push(claim);
      claimsByOrderItemId.set(claim.orderItemId, list);
    }

    let backfilledCount = 0;
    for (const product of products) {
      const orderItems = await ctx.db
        .query("orderItems")
        .withIndex("by_productId", (q) => q.eq("productId", product._id))
        .collect();

      let salesRevenue = 0;
      let orderCount = 0;
      let claimCount = 0;
      let approvedClaimCount = 0;
      let lastSoldAt: number | undefined = undefined;

      for (const item of orderItems) {
        const order = await ctx.db.get(item.orderId);
        if (!order) continue;

        let shipmentDelivered = false;
        if (order.shipmentId) {
          const shipment = await ctx.db.get(order.shipmentId);
          if (shipment && shipment.status === "delivered") {
            shipmentDelivered = true;
          }
        }

        const isDelivered = order.status === "delivered" || shipmentDelivered;

        if (isDelivered) {
          salesRevenue += item.subtotal || (item.priceAtPurchase * item.quantity);
          orderCount += item.quantity;
          
          const soldTime = order.deliveredAt || order.updatedAt || order.createdAt;
          if (lastSoldAt === undefined || soldTime > lastSoldAt) {
            lastSoldAt = soldTime;
          }
        }

        const itemClaims = claimsByOrderItemId.get(item._id) || [];
        for (const claim of itemClaims) {
          claimCount++;
          if (claim.status === "refund_approved" || claim.status === "refunded") {
            approvedClaimCount++;
          }
        }
      }

      const existing = await ctx.db
        .query("productPerformance")
        .withIndex("by_productId", (q) => q.eq("productId", product._id))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          salesRevenue,
          orderCount,
          claimCount,
          approvedClaimCount,
          lastSoldAt,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("productPerformance", {
          productId: product._id,
          boutiqueId: product.boutiqueId,
          salesRevenue,
          orderCount,
          claimCount,
          approvedClaimCount,
          lastSoldAt,
          updatedAt: Date.now(),
        });
      }
      backfilledCount++;
    }

    return { success: true, backfilledCount };
  },
});

/**
 * Migration to backfill merchantTier to 'Bronze' and approvalStatus to 'approved' for legacy records.
 */
export const backfillListingApprovalFields = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity !== null) {
      await requireRole(ctx, "admin");
    }

    const boutiques = await ctx.db.query("boutiques").collect();
    let boutiqueCount = 0;
    for (const b of boutiques) {
      if (!b.merchantTier) {
        await ctx.db.patch(b._id, {
          merchantTier: "Bronze",
        });
        boutiqueCount++;
      }
    }

    const products = await ctx.db.query("products").collect();
    let productCount = 0;
    for (const p of products) {
      if (!p.approvalStatus) {
        await ctx.db.patch(p._id, {
          approvalStatus: "approved",
        });
        productCount++;
      }
    }

    return { success: true, boutiqueCount, productCount };
  }
});

/**
 * Migration to backfill the slug field for all approved boutiques that lack one.
 * Uses a basic slugify function based on the boutiqueName.
 */
export const backfillBoutiqueSlugs = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity !== null) {
      await requireRole(ctx, "admin");
    }

    const boutiques = await ctx.db.query("boutiques").collect();
    let backfilledCount = 0;

    for (const b of boutiques) {
      if (!b.slug) {
        // Basic slugify
        let baseSlug = b.boutiqueName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        if (!baseSlug) {
          baseSlug = `shop-${b._id.slice(-6)}`;
        }

        // Handle collisions (just in case)
        let uniqueSlug = baseSlug;
        let counter = 1;
        while (true) {
          const existing = await ctx.db
            .query("boutiques")
            .filter((q) => q.eq(q.field("slug"), uniqueSlug))
            .first();
          if (!existing) break;
          uniqueSlug = `${baseSlug}-${counter}`;
          counter++;
        }

        await ctx.db.patch(b._id, { slug: uniqueSlug });
        backfilledCount++;
      }
    }

    return `Backfilled slugs for ${backfilledCount} boutiques.`;
  }
});

/**
 * Phase 1 Migration: Set basePrice and bump customer price by 15%
 */
export const migrateProductPricesPhase1 = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity !== null) {
      await requireRole(ctx, "admin");
    }

    // 1. Migrate Products
    const products = await ctx.db.query("products").collect();
    let updatedProducts = 0;
    
    for (const product of products) {
      if (product.basePrice === undefined) {
        const basePrice = product.price; // Treat current price as basePrice
        const newCustomerPrice = Math.floor(basePrice * 1.15); // Add 15% markup
        
        await ctx.db.patch(product._id, {
          basePrice: basePrice,
          price: newCustomerPrice,
        });
        updatedProducts++;
      }
    }

    // 2. Migrate Product Variants
    const variants = await ctx.db.query("productVariants").collect();
    let updatedVariants = 0;
    
    for (const variant of variants) {
      if (variant.basePrice === undefined) {
        const basePrice = variant.price;
        const newCustomerPrice = Math.floor(basePrice * 1.15);
        
        await ctx.db.patch(variant._id, {
          basePrice: basePrice,
          price: newCustomerPrice,
        });
        updatedVariants++;
      }
    }

    return `Successfully migrated ${updatedProducts} products and ${updatedVariants} variants to the new pricing model.`;
  },
});

/**
 * Migration to seed/backfill platformSettings with the default tiered slabs.
 */
export const migratePlatformSettingsToTiered = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity !== null) {
      await requireRole(ctx, "admin");
    }

    const settings = await ctx.db.query("platformSettings").first();
    if (settings) {
      await ctx.db.patch(settings._id, {
        markupType: "tiered",
        markupTiers: DEFAULT_TIER_SLABS,
        updatedAt: Date.now()
      });
      return "Successfully updated existing platform settings with tiered slabs.";
    } else {
      await ctx.db.insert("platformSettings", {
        markupRate: 0.15,
        platformFeeRate: 0.02,
        markupType: "tiered",
        markupTiers: DEFAULT_TIER_SLABS,
        updatedAt: Date.now()
      });
      return "Successfully seeded new platform settings with default tiered slabs.";
    }
  }
});

/**
 * Migration to recalculate all product prices according to all-inclusive upfront pricing.
 * Sets storefront price = Base Price + Handling Fee + Platform Fee + GST.
 */
export const recalculateAllProductPrices = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity !== null) {
      await requireRole(ctx, "admin");
    }

    const config = await getPlatformConfig(ctx);
    const products = await ctx.db.query("products").collect();
    let updatedCount = 0;
    const now = Date.now();

    // Preload all boutiques to resolve pricing tiers in O(1)
    const boutiques = await ctx.db.query("boutiques").collect();
    const boutiqueTierMap = new Map<string, string>();
    for (const b of boutiques) {
      boutiqueTierMap.set(b._id, (b as any).pricingTier || "bronze");
    }

    for (const product of products) {
      let basePrice = product.basePrice ?? product.price;
      let baseDiscountPrice = product.baseDiscountPrice ?? product.discountPrice;

      if (!basePrice || basePrice <= 0) {
        basePrice = product.price;
        baseDiscountPrice = product.discountPrice;
      }

      // Sanitize basePrice to clean integer paise (e.g. 90000 paise for ₹900)
      if (basePrice % 100 !== 0) {
        if (Math.abs((basePrice - 57.82) % 100) < 1) {
          basePrice = Math.round(basePrice - 57.82);
        } else {
          basePrice = Math.round(basePrice / 100) * 100;
        }
      }
      if (baseDiscountPrice && baseDiscountPrice % 100 !== 0) {
        if (Math.abs((baseDiscountPrice - 57.82) % 100) < 1) {
          baseDiscountPrice = Math.round(baseDiscountPrice - 57.82);
        } else {
          baseDiscountPrice = Math.round(baseDiscountPrice / 100) * 100;
        }
      }

      const tierKey = boutiqueTierMap.get(product.boutiqueId) || "bronze";
      const targetPrice = calculateAllInclusivePricePaise(basePrice, tierKey, config);
      const targetDiscountPrice = baseDiscountPrice ? calculateAllInclusivePricePaise(baseDiscountPrice, tierKey, config) : undefined;

      await ctx.db.patch(product._id, {
        basePrice,
        baseDiscountPrice,
        price: targetPrice,
        discountPrice: targetDiscountPrice,
        updatedAt: now,
      });
      updatedCount++;
    }


    return `Successfully recalculated and updated prices for ${updatedCount} products to all-inclusive upfront pricing.`;
  },
});




/**
 * Backfills `sameDayEligible: true` across the catalogue.
 *
 * This was never a real seller choice: both boutique product forms held it as dead state
 * initialised to `false` with no UI attached, so every product was written false by default and
 * no seller could ever change it. Hive fulfils every order through Porter under one platform-wide
 * 90-minute promise, so the flag is a platform constant rather than per-product metadata. The
 * forms no longer send it and both write paths now set true; this aligns the existing rows.
 */
export const backfillSameDayEligible = mutation({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();
    let updated = 0;
    for (const p of products) {
      if (p.sameDayEligible !== true) {
        await ctx.db.patch(p._id, { sameDayEligible: true });
        updated++;
      }
    }
    return { total: products.length, updated };
  },
});

/**
 * One-time: give the flat category list a hierarchy.
 *
 * Every category in production is currently top-level, which is why the seller
 * picker is a flat wall and the storefront cannot group anything. This creates
 * the three parents that do not exist yet and files the existing categories
 * under them.
 *
 * It touches the `categories` table only. No product is read, moved or
 * re-categorised: a product keeps its categoryId, and getCatalogPage reaches it
 * from the new parent by walking parentId. Nothing about pricing, payouts or
 * serviceability depends on the category tree.
 *
 * Declared as an internalMutation: it is not reachable from any client, only
 * from the CLI and from other server functions. The other migrations in this
 * file gate on `if (identity !== null) requireRole(...)`, which lets an
 * unauthenticated caller through — worth revisiting, but out of scope here.
 *
 * Runs as a dry run by default and reports exactly what it would do. Pass
 * `{ apply: true }` to write.
 *
 *   npx convex run --prod migrations:buildCategoryHierarchy
 *   npx convex run --prod migrations:buildCategoryHierarchy '{"apply":true}'
 *
 * Reversal: clear parentId on the children and delete the three created
 * parents. Both are ordinary admin operations on the categories screen.
 */
export const buildCategoryHierarchy = internalMutation({
  args: { apply: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const apply = args.apply === true;

    // Parents to create, keyed by the marker used in the mapping below.
    const PARENTS = [
      { marker: "WOMEN", name: "Women's Fashion", slug: "womens-fashion", sortOrder: 1, verticalType: "apparel" as const },
      { marker: "MEN",   name: "Men's Fashion",   slug: "mens-fashion",   sortOrder: 2, verticalType: "apparel" as const },
      { marker: "ACC",   name: "Accessories",     slug: "accessories",    sortOrder: 3, verticalType: "handbag" as const },
    ];

    // Existing category slug -> parent marker.
    // Deliberately absent: t-shirts, pinteresty, frok. Each is ambiguous and
    // stays top-level until someone decides where it belongs.
    const MAPPING: Record<string, string> = {
      "sarees":         "WOMEN",
      "kurtis":         "WOMEN",
      "lehengas":       "WOMEN",
      "anarkalis":      "WOMEN",
      "gowns":          "WOMEN",
      "indo-western":   "WOMEN",
      "blouses":        "WOMEN",
      "dupattas":       "WOMEN",
      "co-ord-sets":    "WOMEN",
      "fusion-wear":    "WOMEN",
      "tops":           "WOMEN",
      "maternity-wear": "WOMEN",
      "night-wear":     "WOMEN",
      "korean-wear":    "WOMEN",
      "ethnic-wer":     "MEN",
      "handbags":       "ACC",
    };

    // Slugs and names that disagree today. Old slugs keep working through the
    // redirects added in apps/customer/next.config.ts.
    const RENAMES: Record<string, { name?: string; slug?: string }> = {
      "ethnic-wer": { name: "Men's Ethnic Wear", slug: "mens-ethnic-wear" },
      "handbags":   { name: "Handbags",          slug: "handbags" },
    };

    // Categories that sell in one size only.
    const FREE_SIZE_SLUGS = new Set(["sarees", "dupattas"]);

    const existing = await ctx.db.query("categories").collect();
    const bySlug = new Map(existing.map((c) => [c.slug, c]));

    const plan: string[] = [];
    const warnings: string[] = [];
    const parentIds = new Map<string, any>();

    // 1. Parents
    for (const parent of PARENTS) {
      const found = bySlug.get(parent.slug);
      if (found) {
        parentIds.set(parent.marker, found._id);
        plan.push(`reuse parent "${found.name}" (/${found.slug})`);
        continue;
      }
      plan.push(`CREATE parent "${parent.name}" (/${parent.slug}, ${parent.verticalType})`);
      if (apply) {
        const id = await ctx.db.insert("categories", {
          name:           parent.name,
          slug:           parent.slug,
          active:         true,
          sortOrder:      parent.sortOrder,
          showOnHomepage: true,
          verticalType:   parent.verticalType,
          createdAt:      Date.now(),
        });
        parentIds.set(parent.marker, id);
      }
    }

    // 2. Children
    for (const [slug, marker] of Object.entries(MAPPING)) {
      const category = bySlug.get(slug);
      if (!category) {
        warnings.push(`no category with slug "${slug}" — skipped`);
        continue;
      }
      if (category.parentId) {
        warnings.push(`"${category.name}" already has a parent — left alone`);
        continue;
      }

      const rename = RENAMES[slug];
      const patch: Record<string, unknown> = { parentId: parentIds.get(marker) };
      let note = `"${category.name}" (/${slug}) -> ${marker}`;

      if (rename?.name && rename.name !== category.name) {
        patch.name = rename.name;
        note += `, rename to "${rename.name}"`;
      }
      if (rename?.slug && rename.slug !== category.slug) {
        patch.slug = rename.slug;
        note += `, reslug to /${rename.slug}`;
      }
      if (!category.verticalType) {
        patch.verticalType = marker === "ACC" ? "handbag" : "apparel";
        note += `, vertical = ${patch.verticalType}`;
      }
      if (FREE_SIZE_SLUGS.has(slug) && category.isFreeSize !== true) {
        patch.isFreeSize = true;
        note += ", one size only";
      }

      plan.push(note);
      if (apply) await ctx.db.patch(category._id, patch);
    }

    // 3. Anything left top-level, so nothing is silently forgotten.
    for (const category of existing) {
      if (MAPPING[category.slug]) continue;
      if (PARENTS.some((p) => p.slug === category.slug)) continue;
      warnings.push(`"${category.name}" (/${category.slug}) stays top-level — not in the mapping`);
    }

    return {
      applied: apply,
      plan,
      warnings,
      note: apply
        ? "Categories updated. No product was read or modified."
        : "Dry run. Re-run with {\"apply\":true} to write.",
    };
  },
});

/**
 * Corrects a single category's `verticalType`.
 *
 * `buildCategoryHierarchy` only filled in a vertical where one was missing, so
 * a row that already carried the wrong value kept it. `handbags` is the live
 * case: it sits under the `accessories` parent (handbag) while still declaring
 * `apparel`, and `resolveVerticalTypeForCategory` reads the category directly
 * rather than walking parentId, so new products filed there would be stamped
 * apparel and validated against apparel spec keys.
 *
 * Only the one field is patched. Existing products are deliberately left alone:
 * a product snapshots its vertical once at creation and is never recomputed, so
 * changing the category cannot retroactively alter how an existing product's
 * specs validate. The dry run reports which products would have been affected
 * had that not been the rule, so the blast radius is visible before writing.
 *
 *   npx convex run --prod migrations:setCategoryVerticalType '{"slug":"handbags","verticalType":"handbag"}'
 *   npx convex run --prod migrations:setCategoryVerticalType '{"slug":"handbags","verticalType":"handbag","apply":true}'
 *
 * Reversal: run it again with the previous value.
 */
export const setCategoryVerticalType = internalMutation({
  args: {
    slug: v.string(),
    verticalType: VerticalTypeValidator,
    apply: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apply = args.apply === true;

    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!category) throw new Error(`No category with slug "${args.slug}"`);

    const parent = category.parentId ? await ctx.db.get(category.parentId) : null;

    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
      .collect();

    const stamped = products.reduce<Record<string, number>>((acc, p) => {
      const key = (p as { verticalType?: string }).verticalType ?? "(unset)";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    if (category.verticalType === args.verticalType) {
      return {
        applied: false,
        note: `"${category.name}" is already ${args.verticalType}. Nothing to do.`,
      };
    }

    const change = `"${category.name}" (/${category.slug}): ${category.verticalType ?? "(unset)"} -> ${args.verticalType}`;

    if (apply) await ctx.db.patch(category._id, { verticalType: args.verticalType });

    return {
      applied: apply,
      change,
      parent: parent ? `${parent.name} (${parent.verticalType ?? "(unset)"})` : "(top-level)",
      existingProducts: products.length,
      existingProductVerticals: stamped,
      note: apply
        ? "Category updated. Existing products keep the vertical they were stamped with at creation; only products created from now on pick up the new value."
        : "Dry run. Re-run with \"apply\":true to write.",
    };
  },
});

/**
 * Read-only census of the catalogue by category.
 *
 * Phase 0 of the taxonomy rework: every decision about what to keep, merge,
 * rename or delete depends on knowing where the products actually are, and
 * nothing in the admin UI shows that. Reports per category the number of
 * products, how many are active, and which verticals those products were
 * stamped with at creation — the last one matters because re-parenting a
 * category never restamps its existing products.
 *
 * Also reports products whose categoryId points at a category that no longer
 * exists, which would otherwise be invisible.
 *
 * Writes nothing.
 *
 *   npx convex run --prod migrations:categoryProductCensus
 */
export const categoryProductCensus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db.query("categories").collect();
    const byId = new Map(categories.map((c) => [c._id as string, c]));

    const rows = await Promise.all(
      categories.map(async (category) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
          .collect();

        const verticals = products.reduce<Record<string, number>>((acc, p) => {
          const key = (p as { verticalType?: string }).verticalType ?? "(unset)";
          acc[key] = (acc[key] ?? 0) + 1;
          return acc;
        }, {});

        const parent = category.parentId ? byId.get(category.parentId as string) : undefined;

        return {
          name:        category.name,
          slug:        category.slug,
          parent:      parent ? parent.slug : null,
          active:      category.active,
          vertical:    category.verticalType ?? "(unset)",
          products:    products.length,
          activeProducts: products.filter((p) => p.active === true).length,
          productVerticals: verticals,
        };
      })
    );

    // Products pointing at a category that has since been deleted.
    const allProducts = await ctx.db.query("products").collect();
    const orphaned = allProducts.filter(
      (p) => p.categoryId && !byId.has(p.categoryId as string)
    ).length;
    const uncategorised = allProducts.filter((p) => !p.categoryId).length;

    return {
      totalProducts: allProducts.length,
      totalCategories: categories.length,
      orphanedProducts: orphaned,
      uncategorisedProducts: uncategorised,
      rows: rows.sort((a, b) => b.products - a.products),
    };
  },
});

/**
 * Re-files a category under a different parent, or detaches it to top level.
 *
 * The admin screen can already do this, but doing it there is what detached
 * three categories by accident: `updateCategory` replaces the whole row, so a
 * parent left unset in the form is written as undefined. This touches
 * `parentId` and nothing else, reports the move before making it, and refuses
 * the two structurally invalid cases rather than writing a broken tree.
 *
 * Products are not read or moved: they keep their categoryId, and the storefront
 * reaches them from the new parent by walking parentId in selectCatalogProducts.
 *
 *   npx convex run --prod migrations:setCategoryParent '{"slug":"pinteresty","parentSlug":"womens-fashion"}'
 *   npx convex run --prod migrations:setCategoryParent '{"slug":"pinteresty","parentSlug":"womens-fashion","apply":true}'
 *
 * Reversal: run it again with the previous parent, or with parentSlug omitted
 * to return the category to top level.
 */
export const setCategoryParent = internalMutation({
  args: {
    slug: v.string(),
    parentSlug: v.optional(v.string()),
    apply: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apply = args.apply === true;

    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!category) throw new Error(`No category with slug "${args.slug}"`);

    // A category with children of its own cannot become someone's child:
    // nesting is capped at two levels by MAX_CATEGORY_DEPTH.
    const ownChildren = await ctx.db
      .query("categories")
      .withIndex("by_parentId", (q) => q.eq("parentId", category._id))
      .collect();
    if (args.parentSlug && ownChildren.length > 0) {
      throw new Error(
        `"${category.name}" has ${ownChildren.length} subcategories of its own, so it cannot become a subcategory. Move them first.`
      );
    }

    let parent = null;
    if (args.parentSlug) {
      parent = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", args.parentSlug!))
        .first();
      if (!parent) throw new Error(`No category with slug "${args.parentSlug}"`);
      if (parent._id === category._id) throw new Error("A category cannot be its own parent.");
      if (parent.parentId) {
        throw new Error(`"${parent.name}" is itself a subcategory. Nesting is two levels deep.`);
      }
    }

    const currentParent = category.parentId ? await ctx.db.get(category.parentId) : null;
    const from = currentParent ? `/${currentParent.slug}` : "(top-level)";
    const to = parent ? `/${parent.slug}` : "(top-level)";

    if (from === to) {
      return { applied: false, note: `"${category.name}" is already under ${to}. Nothing to do.` };
    }

    const products = await ctx.db
      .query("products")
      .withIndex("by_categoryId", (q) => q.eq("categoryId", category._id))
      .collect();

    if (apply) {
      await ctx.db.patch(category._id, {
        parentId: parent ? parent._id : undefined,
      });
    }

    return {
      applied: apply,
      change: `"${category.name}" (/${category.slug}): ${from} -> ${to}`,
      productsInCategory: products.length,
      note: apply
        ? "Category re-filed. No product was read or modified."
        : "Dry run. Re-run with \"apply\":true to write.",
    };
  },
});

/**
 * Edits a category's display fields without disturbing the rest of the row.
 *
 * `updateCategory` is a full replace: every field the admin form does not send
 * is written as undefined, which is how three categories silently lost their
 * parent. This patches only the fields actually passed, so changing a name
 * cannot detach a category or clear its image.
 *
 * Reports the before and after of each field before writing.
 *
 *   npx convex run --prod migrations:setCategoryFields '{"slug":"mens-fashion","active":true}'
 *   npx convex run --prod migrations:setCategoryFields '{"slug":"mens-fashion","active":true,"apply":true}'
 *
 * Reversal: run it again with the previous values, which the dry run prints.
 */
export const setCategoryFields = internalMutation({
  args: {
    slug: v.string(),
    name: v.optional(v.string()),
    active: v.optional(v.boolean()),
    showOnHomepage: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    apply: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apply = args.apply === true;

    const category = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    if (!category) throw new Error(`No category with slug "${args.slug}"`);

    const patch: Record<string, unknown> = {};
    const changes: string[] = [];

    const consider = <T,>(field: string, next: T | undefined, current: T) => {
      if (next === undefined || next === current) return;
      patch[field] = next;
      changes.push(`${field}: ${JSON.stringify(current)} -> ${JSON.stringify(next)}`);
    };

    consider("name", args.name, category.name);
    consider("active", args.active, category.active);
    consider("showOnHomepage", args.showOnHomepage, category.showOnHomepage);
    consider("sortOrder", args.sortOrder, category.sortOrder);

    if (changes.length === 0) {
      return { applied: false, note: `"${category.name}" already matches. Nothing to do.` };
    }

    if (apply) await ctx.db.patch(category._id, patch);

    return {
      applied: apply,
      category: `${category.name} (/${category.slug})`,
      changes,
      note: apply ? "Category updated. Parent, image and every other field untouched." : "Dry run. Re-run with \"apply\":true to write.",
    };
  },
});
