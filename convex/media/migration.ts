// @ts-nocheck
import { action, internalQuery, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "./client";
import { mediaLogger } from "./logger";
import { internal } from "../_generated/api";

/**
 * Batched, resumable migration script to move legacy Convex Storage boutique logos to R2.
 * Can be triggered repeatedly until all boutiques are migrated.
 */
export const migrateLegacyMediaBatched = action({
  args: {},
  handler: async (ctx) => {
    mediaLogger.info("Starting batch migration for legacy boutique media...");

    // 1. Fetch batch of up to 50 boutiques that still have a string logoUrl
    const batch = await ctx.runQuery(internal.media.migration.getLegacyBoutiquesBatch, { limit: 50 });

    if (batch.length === 0) {
      mediaLogger.info("Migration complete: No legacy boutiques found.");
      return "Migration complete!";
    }

    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME || "hive-media";

    for (const boutique of batch) {
      try {
        let newLogoAsset = undefined;
        let newBannerAsset = undefined;

        // Process Logo
        if (typeof boutique.logoUrl === "string") {
          newLogoAsset = await migrateFile(ctx, client, bucket, boutique, boutique.logoUrl, "boutique_logo");
        }

        // Process Banner
        if (typeof boutique.bannerUrl === "string") {
          newBannerAsset = await migrateFile(ctx, client, bucket, boutique, boutique.bannerUrl, "boutique_banner");
        }

        // Update DB
        if (newLogoAsset || newBannerAsset) {
          await ctx.runMutation(internal.media.migration.updateBoutiqueLegacyAssets, {
            id: boutique._id,
            logoAsset: newLogoAsset,
            bannerAsset: newBannerAsset,
          });
          mediaLogger.info(`Migrated boutique ${boutique._id}`);
        }
      } catch (err: any) {
        mediaLogger.error(`Failed to migrate boutique ${boutique._id}`, err);
        // Continue to next boutique so one failure doesn't block the entire batch
      }
    }

    return `Processed ${batch.length} boutiques. Please re-run to process next batch.`;
  },
});

async function migrateFile(ctx: any, client: any, bucket: string, boutique: any, storageId: string, assetType: string) {
  // 1. Get URL for legacy storage
  const legacyUrl = await ctx.storage.getUrl(storageId);
  if (!legacyUrl) throw new Error(`Could not resolve URL for storageId: ${storageId}`);

  // 2. Fetch the actual file bytes
  const response = await fetch(legacyUrl);
  if (!response.ok) throw new Error(`Failed to fetch file from Convex Storage: ${response.statusText}`);
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);
  
  const mimeType = response.headers.get("content-type") || "application/octet-stream";
  const fileSize = buffer.byteLength;

  // 3. Generate new R2 objectKey
  const uuid = crypto.randomUUID();
  const extension = mimeType.split("/")[1] || "bin";
  const objectKey = `${assetType}s/${uuid}/v1/original.${extension}`;

  // 4. Upload to R2
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    Body: buffer,
    ContentType: mimeType,
    ContentLength: fileSize,
  });

  const uploadResult = await client.send(putCommand);
  const contentHash = uploadResult.ETag ? uploadResult.ETag.replace(/"/g, "") : undefined;

  // 5. Construct ImageAsset
  return {
    assetId: uuid,
    ownerType: "boutique",
    ownerId: boutique._id,
    storageProvider: "cloudflare-r2",
    bucket,
    objectKey,
    mime: mimeType,
    size: fileSize,
    contentHash,
    status: "ready",
    displayOrder: 0,
    width: 0,
    height: 0,
    uploadedAt: Date.now(),
  };
}

export const getLegacyBoutiquesBatch = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    // Note: In a true large-scale migration, we'd use a cursor.
    // Since this is a pilot with a small number of boutiques, scanning and filtering is fine.
    const boutiques = await ctx.db.query("boutiques").order("asc").collect();
    
    // Find ones where logoUrl or bannerUrl is a string (legacy)
    const legacy = boutiques.filter((b) => 
      (b.logoUrl && typeof b.logoUrl === "string") || 
      (b.bannerUrl && typeof b.bannerUrl === "string")
    );

    return legacy.slice(0, args.limit);
  },
});

export const updateBoutiqueLegacyAssets = internalMutation({
  args: {
    id: v.id("boutiques"),
    logoAsset: v.optional(v.any()),
    bannerAsset: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const patch: any = {};
    if (args.logoAsset) patch.logoUrl = args.logoAsset;
    if (args.bannerAsset) patch.bannerUrl = args.bannerAsset;
    await ctx.db.patch(args.id, patch);
  },
});

export const migrateLegacyProductsBatched = action({
  args: {},
  handler: async (ctx) => {
    mediaLogger.info("Starting batch migration for legacy product media...");

    const batch = await ctx.runQuery(internal.media.migration.getLegacyProductsBatch, { limit: 20 });

    if (batch.length === 0) {
      mediaLogger.info("Migration complete: No legacy products found.");
      return "Migration complete!";
    }

    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME || "hive-media";

    // Simple concurrency limiter (max 5 in-flight uploads globally for the batch)
    const MAX_CONCURRENCY = 5;
    let activePromises = 0;
    
    const waitSlot = async () => {
      while (activePromises >= MAX_CONCURRENCY) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      activePromises++;
    };

    for (const product of batch) {
      try {
        const newImages = [...product.images];
        const promises = product.images.map(async (img: any, index: number) => {
          if (typeof img === "string" && img.startsWith("kg")) { // Basic check for Convex Storage ID
            await waitSlot();
            try {
              const asset = await migrateFile(ctx, client, bucket, product, img, "product");
              if (index === 0) asset.imageRole = "PRIMARY";
              else asset.imageRole = "OTHER";
              asset.displayOrder = index;
              newImages[index] = asset;
            } finally {
              activePromises--;
            }
          }
        });

        await Promise.all(promises);

        await ctx.runMutation(internal.media.migration.updateProductLegacyAssets, {
          id: product._id,
          images: newImages,
        });
        mediaLogger.info(`Migrated product ${product._id}`);
      } catch (err: any) {
        mediaLogger.error(`Failed to migrate product ${product._id}`, err);
      }
    }

    return `Processed ${batch.length} products. Please re-run to process next batch.`;
  },
});

export const getLegacyProductsBatch = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const products = await ctx.db.query("products").order("asc").collect();
    
    const legacy = products.filter((p) => 
      p.images.some(img => typeof img === "string" && img.startsWith("kg"))
    );

    return legacy.slice(0, args.limit);
  },
});

export const updateProductLegacyAssets = internalMutation({
  args: {
    id: v.id("products"),
    images: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { images: args.images });
  },
});
