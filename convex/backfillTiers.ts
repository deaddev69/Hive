import { mutation } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { DEFAULT_TIER_SLABS } from "./pricingService";

/**
 * One-shot migration to backfill pricingTier on existing boutiques
 * and initialize tier1/tier2/tier3 pricing configs on platformSettings.
 *
 * Safe to run multiple times (idempotent).
 * Does NOT recalculate product prices — use "Sync & Recalculate All Prices" for that.
 */
export const backfillPricingTiers = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const now = Date.now();
    let boutiquesUpdated = 0;
    let settingsUpdated = false;

    // ─── 1. Backfill boutiques.pricingTier ───────────────────────────
    const boutiques = await ctx.db.query("boutiques").collect();
    for (const b of boutiques) {
      if (!(b as any).pricingTier) {
        await ctx.db.patch(b._id, { pricingTier: "tier1" } as any);
        boutiquesUpdated++;
      }
    }

    // ─── 2. Initialize tier configs on platformSettings ──────────────
    const settings = await ctx.db.query("platformSettings").first();
    if (settings) {
      const patch: any = {};

      // Use existing markupTiers (global slabs) as tier1 basis so
      // existing sellers do not get unexpected price changes
      const existingSlabs = (settings as any).markupTiers ?? DEFAULT_TIER_SLABS;

      if (!(settings as any).tier1) {
        patch.tier1 = { name: "Bronze", slabs: existingSlabs };
      }
      if (!(settings as any).tier2) {
        patch.tier2 = { name: "Silver", slabs: [...DEFAULT_TIER_SLABS] };
      }
      if (!(settings as any).tier3) {
        patch.tier3 = { name: "Gold", slabs: [...DEFAULT_TIER_SLABS] };
      }

      if (Object.keys(patch).length > 0) {
        patch.updatedAt = now;
        await ctx.db.patch(settings._id, patch);
        settingsUpdated = true;
      }
    } else {
      // No platformSettings record exists — create one with all tiers
      await ctx.db.insert("platformSettings", {
        markupRate: 0.15,
        platformFeeRate: 0.02,
        markupType: "tiered",
        markupTiers: DEFAULT_TIER_SLABS,
        tier1: { name: "Bronze", slabs: [...DEFAULT_TIER_SLABS] },
        tier2: { name: "Silver", slabs: [...DEFAULT_TIER_SLABS] },
        tier3: { name: "Gold", slabs: [...DEFAULT_TIER_SLABS] },
        updatedAt: now,
      } as any);
      settingsUpdated = true;
    }

    return {
      boutiquesUpdated,
      settingsUpdated,
      message: `Backfill complete. ${boutiquesUpdated} boutiques updated. Settings ${settingsUpdated ? "updated" : "already configured"}.`,
    };
  },
});
