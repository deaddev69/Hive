// convex/lib/boutiqueCounters.ts
// O(1) order capacity count increment/decrement helpers with automatic local IST day boundary resets.

import { internal } from "../_generated/api";

export async function incrementBoutiqueOrderCount(ctx: any, boutiqueId: any, now: number) {
  const boutique = await ctx.db.get(boutiqueId);
  if (!boutique) return;
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(now + istOffset);
  const dateStr = nowIst.toISOString().split("T")[0]; // YYYY-MM-DD

  if (boutique.activeOrdersDate === dateStr) {
    await ctx.db.patch(boutiqueId, {
      activeOrdersToday: (boutique.activeOrdersToday ?? 0) + 1,
    });
  } else {
    await ctx.db.patch(boutiqueId, {
      activeOrdersDate: dateStr,
      activeOrdersToday: 1,
    });
  }

  // Send welcome WhatsApp sequence #3 on the first order ever received
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", boutiqueId))
    .collect();

  if (orders.length === 1) {
    const firstOrder = orders[0];
    await ctx.scheduler.runAfter(0, internal.whatsapp.sendTemplateMessage, {
      recipient: boutique.phone,
      templateName: "first_order_arrived",
      parameters: [firstOrder.orderNumber],
    });
  }
}

export async function decrementBoutiqueOrderCount(ctx: any, boutiqueId: any, order: any) {
  const boutique = await ctx.db.get(boutiqueId);
  if (!boutique) return;
  const istOffset = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + istOffset);
  const todayStr = nowIst.toISOString().split("T")[0];

  const orderIst = new Date(order.createdAt + istOffset);
  const orderDateStr = orderIst.toISOString().split("T")[0];

  // Only decrement if the cancelled order was created on the active counting date
  if (boutique.activeOrdersDate === todayStr && orderDateStr === todayStr) {
    const currentCount = boutique.activeOrdersToday ?? 0;
    await ctx.db.patch(boutiqueId, {
      activeOrdersToday: Math.max(0, currentCount - 1),
    });
  }
}
