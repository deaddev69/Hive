// convex/merchantCatalog.ts
// Supply catalog acquisition and direct merchant cross-sell matching tools.

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getMyBoutique, requireBoutiqueOwnership } from "./lib/auth";
import { updateBoutiqueProductCount } from "./boutiques";

/**
 * Links complementary product items to a target product to form a "Complete the Look" bundle.
 */
export const linkMatchingProducts = mutation({
  args: {
    productId: v.id("products"),
    matchingIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product || product.boutiqueId !== boutique._id) {
      throw new Error("Unauthorized: Product does not belong to your boutique.");
    }

    if (args.matchingIds.length > 10) {
      throw new Error("Complete the Look is limited to a maximum of 10 items.");
    }

    await ctx.db.patch(args.productId, {
      matchingProductIds: args.matchingIds,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Checks a product for quality gate violations.
 */
async function getProductQualityIssues(
  ctx: any,
  item: {
    name: string;
    description: string;
    price: number;
    categoryId: any;
    sizes: string[];
    stockBySize: Record<string, number>;
    images: (string | any)[];
  },
  hasMeasurementMatrix: boolean
) {
  const issues: string[] = [];

  if (item.images.length < 3) {
    issues.push("Requires at least 3 photos");
  }
  if (item.description.trim().length <= 50) {
    issues.push("Description must be longer than 50 characters");
  }
  if (item.price <= 0) {
    issues.push("Price must be greater than 0");
  }

  const totalStock = Object.values(item.stockBySize).reduce((sum, val) => sum + val, 0);
  if (totalStock <= 0) {
    issues.push("Total stock must be greater than 0");
  }

  // Check if fashion category
  const category = await ctx.db.get(item.categoryId);
  if (category) {
    const categoryName = category.name.toLowerCase();
    const isFashion = ["sarees", "lehengas", "kurtis", "suits", "dresses", "clothing", "apparel", "wear", "shirts", "tops"].some(kw => categoryName.includes(kw));
    if (isFashion && !hasMeasurementMatrix) {
      issues.push("Missing size chart");
    }
  }

  return issues;
}

export const importProductsCsv = mutation({
  args: {
    boutiqueId: v.id("boutiques"),
    items: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        price: v.number(), // In Rupees
        categoryName: v.string(),
        size: v.string(),
        stock: v.number(),
        imageUrl: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Assert boutique ownership
    const { user, boutique } = await requireBoutiqueOwnership(ctx, args.boutiqueId);
    const userId = user._id;

    const now = Date.now();
    let createdCount = 0;
    let updatedCount = 0;
    let draftedCount = 0;
    const issues: Array<{ product: string; reason: string }> = [];

    // Resolve categories
    const categoriesList = await ctx.db.query("categories").collect();
    const resolveCategory = async (name: string) => {
      const canonical = name.trim().toLowerCase();
      let cat = categoriesList.find((c) => c.name.toLowerCase() === canonical);
      if (!cat) {
        cat = categoriesList[0];
        if (!cat) {
          throw new Error("No product categories configured. Create a category first.");
        }
      }
      return cat._id;
    };

    const generateSlug = (name: string) => {
      const base = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const rand = Math.random().toString(36).substring(2, 6);
      return `${base}-${rand}`;
    };

    // Group items by name to bundle sizes under a single product record
    const grouped: Record<
      string,
      {
        name: string;
        description: string;
        price: number;
        categoryName: string;
        imageUrl?: string;
        stockBySize: Record<string, number>;
      }
    > = {};

    for (const item of args.items) {
      const key = item.name.trim().toLowerCase();
      if (!grouped[key]) {
        grouped[key] = {
          name: item.name,
          description: item.description,
          price: item.price,
          categoryName: item.categoryName,
          imageUrl: item.imageUrl,
          stockBySize: {},
        };
      }
      grouped[key].stockBySize[item.size] = (grouped[key].stockBySize[item.size] || 0) + item.stock;
    }

    // Fetch existing products of the boutique to check for duplicates
    const existingProducts = await ctx.db
      .query("products")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId))
      .collect();

    for (const item of Object.values(grouped)) {
      const categoryId = await resolveCategory(item.categoryName);
      const pricePaise = Math.round(item.price * 100);

      // Check if product with exact case-insensitive name exists
      const existingProduct = existingProducts.find(
        (p) => p.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      );

      if (existingProduct) {
        // Update product sizing/details
        const mergedStock = { ...(existingProduct.stockBySize || {}) };
        
        for (const [size, newQty] of Object.entries(item.stockBySize)) {
          const oldQty = mergedStock[size] || 0;
          if (newQty !== oldQty) {
            mergedStock[size] = newQty;
            const diff = newQty - oldQty;
            await ctx.db.insert("inventoryMovements", {
              productId: existingProduct._id,
              boutiqueId: args.boutiqueId,
              size,
              beforeQty: oldQty,
              afterQty: newQty,
              adjustmentQty: diff,
              reason: "stock_recount",
              source: "bulk_import",
              createdBy: userId,
              createdAt: now,
            });
          }
        }

        const mergedSizes = Array.from(
          new Set([...existingProduct.sizes, ...Object.keys(item.stockBySize)])
        );
        const totalStock = Object.values(mergedStock).reduce((sum, val) => sum + val, 0);

        let mergedImages = existingProduct.images || [];
        if (item.imageUrl && !mergedImages.includes(item.imageUrl)) {
          mergedImages = [item.imageUrl, ...mergedImages].slice(0, 5);
        }

        // Quality Gate Check
        const hasSizeChart = !!existingProduct.measurementMatrix && existingProduct.measurementMatrix.length > 0;
        const validationErrors = await getProductQualityIssues(ctx, {
          name: item.name,
          description: item.description,
          price: pricePaise,
          categoryId,
          sizes: mergedSizes,
          stockBySize: mergedStock,
          images: mergedImages,
        }, hasSizeChart);

        let active = totalStock > 0;
        if (validationErrors.length > 0) {
          active = false;
          draftedCount++;
          issues.push({ product: item.name, reason: validationErrors.join(", ") });
        }

        const merchantTier = boutique.merchantTier || "Bronze";
        const approvalStatus = active
          ? (merchantTier === "Bronze" ? "pending" : "approved")
          : undefined;

        const patchData: any = {
          description: item.description,
          categoryId,
          price: pricePaise,
          sizes: mergedSizes,
          stockBySize: mergedStock,
          active,
          updatedAt: now,
          approvalStatus,
        };

        if (item.imageUrl && !existingProduct.images.includes(item.imageUrl)) {
          patchData.images = mergedImages;
        }

        await ctx.db.patch(existingProduct._id, patchData);
        updatedCount++;
      } else {
        // Create new product
        const slug = generateSlug(item.name);
        const images = item.imageUrl
          ? [item.imageUrl]
          : ["https://placehold.co/600x800/png?text=" + encodeURIComponent(item.name)];
        const sizes = Object.keys(item.stockBySize);
        const totalStock = Object.values(item.stockBySize).reduce((sum, val) => sum + val, 0);

        // Quality Gate Check (new product never has sizing chart populated initially from CSV)
        const validationErrors = await getProductQualityIssues(ctx, {
          name: item.name,
          description: item.description,
          price: pricePaise,
          categoryId,
          sizes,
          stockBySize: item.stockBySize,
          images,
        }, false);

        let active = totalStock > 0;
        if (validationErrors.length > 0) {
          active = false;
          draftedCount++;
          issues.push({ product: item.name, reason: validationErrors.join(", ") });
        }

        const merchantTier = boutique.merchantTier || "Bronze";
        const approvalStatus = active
          ? (merchantTier === "Bronze" ? "pending" : "approved")
          : undefined;

        const productId = await ctx.db.insert("products", {
          boutiqueId: args.boutiqueId,
          name: item.name,
          slug,
          description: item.description,
          categoryId,
          price: pricePaise,
          images,
          sizes,
          stockBySize: item.stockBySize,
          sameDayEligible: true,
          featured: false,
          active,
          createdAt: now,
          updatedAt: now,
          approvalStatus,
        });

        // Record initial stock inventory movements
        for (const [size, qty] of Object.entries(item.stockBySize)) {
          if (qty > 0) {
            await ctx.db.insert("inventoryMovements", {
              productId,
              boutiqueId: args.boutiqueId,
              size,
              beforeQty: 0,
              afterQty: qty,
              adjustmentQty: qty,
              reason: "initial_stock",
              source: "creation",
              createdBy: userId,
              createdAt: now,
            });
          }
        }

        createdCount++;
      }
    }

    await updateBoutiqueProductCount(ctx, args.boutiqueId);

    return { success: true, created: createdCount, updated: updatedCount, drafted: draftedCount, issues };
  },
});
