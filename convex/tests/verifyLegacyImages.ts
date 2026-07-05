import { action, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

export const getLegacyData = internalQuery({
  args: {},
  handler: async (ctx) => {
    return {
      products: await ctx.db.query("products").collect(),
      categories: await ctx.db.query("categories").collect(),
      banners: await ctx.db.query("banners").collect()
    };
  }
});

function verifyMagicBytes(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 4) return false;
  
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  }
  if (mime === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  }
  if (mime === "image/webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
           bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  if (mime === "image/avif") {
    return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70 &&
           bytes[8] === 0x61 && bytes[9] === 0x76 && bytes[10] === 0x69 && bytes[11] === 0x66;
  }
  return false;
}

export const run = action({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING LEGACY IMAGE VERIFICATION ===");
    
    const { products, categories, banners } = await ctx.runQuery(internal.tests.verifyLegacyImages.getLegacyData, {});
    let checked = 0;
    let failed = 0;
    let failures: any[] = [];
    
    const checkImage = async (image: string, context: string, id: string) => {
      if (typeof image !== "string" || image.startsWith("http")) return;
      try {
        const url = await ctx.storage.getUrl(image as any);
        if (!url) return;
        
        const res = await fetch(url, { headers: { Range: "bytes=0-11" } });
        if (!res.ok) return;
        
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const contentType = res.headers.get("content-type") || "image/jpeg";
        
        if (!verifyMagicBytes(bytes, contentType)) {
          console.log(`[FAILED] ${context} ${id} | Image ${image} | Declared: ${contentType}`);
          failed++;
          failures.push({ context, id, image, contentType });
        }
        checked++;
      } catch (err: any) {
        console.log(`Error checking ${context} image ${image}: ${err.message}`);
      }
    };

    // Products
    for (const product of products) {
      for (const image of product.images || []) {
        await checkImage(image as string, "Product", product._id);
      }
    }

    // Categories
    for (const category of categories) {
      if (category.imageStorageId) await checkImage(category.imageStorageId as string, "Category", category._id);
      if (category.homepageImage) await checkImage(category.homepageImage as string, "Category Homepage", category._id);
    }

    // Banners
    for (const banner of banners) {
      if (banner.desktopImageUrl) await checkImage(banner.desktopImageUrl as string, "Banner Desktop", banner._id);
      if (banner.mobileImageUrl) await checkImage(banner.mobileImageUrl as string, "Banner Mobile", banner._id);
    }
    
    console.log(`=== SCAN COMPLETE ===`);
    console.log(`Checked: ${checked} images`);
    console.log(`Failed: ${failed} images`);
    return { checked, failed, failures };
  }
});
