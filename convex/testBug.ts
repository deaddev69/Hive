import { query } from "./_generated/server";

export const run = query({
  handler: async (ctx) => {
    // Get boutiques
    const boutiques = await ctx.db.query("boutiques").collect();
    if (boutiques.length === 0) return { error: "No boutiques found" };
    
    // Just get the first one for testing
    const boutique = boutiques[0];
    if (!boutique) return { error: "No boutique found" };
    
    const reservations1 = await ctx.db.query("reservations").withIndex("by_boutiqueId_status", (q) => q.eq("boutiqueId", boutique._id).eq("status", "reservation_active")).collect();
    const reservations2 = await ctx.db.query("reservations").withIndex("by_boutiqueId_status", (q) => q.eq("boutiqueId", boutique._id).eq("status", "awaiting_store_confirmation")).collect();
    const reservations3 = await ctx.db.query("reservations").withIndex("by_boutiqueId_status", (q) => q.eq("boutiqueId", boutique._id).eq("status", "awaiting_payment")).collect();
    
    const allLockedReservations = [...reservations1, ...reservations2, ...reservations3];
    
    // Build locked stock map: productId -> size -> count
    const lockedStockMap: Record<string, Record<string, number>> = {};
    for (const res of allLockedReservations) {
      if (!res.productId || !res.size) continue;
      if (!lockedStockMap[res.productId]) lockedStockMap[res.productId] = {};
      const prodMap = lockedStockMap[res.productId]!;
      prodMap[res.size] = (prodMap[res.size] || 0) + (res.quantity || 1);
    }
    
    return {
      boutiqueId: boutique._id,
      allLockedReservations,
      lockedStockMap
    };
  }
});
