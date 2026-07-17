import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const updateShipmentStatus = internalMutation({
  args: {
    orderId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      let orderToUpdate: any = null;

      // 1. Try finding by shipment awbNumber (since Porter CRN is saved there)
      const shipment = await ctx.db
        .query("shipments")
        .withIndex("by_awbNumber", (q) => q.eq("awbNumber", args.orderId))
        .first();

      if (shipment) {
        orderToUpdate = await ctx.db.get(shipment.orderId);
      } else {
        // 2. Fallback: try finding order by orderNumber
        const order = await ctx.db
          .query("orders")
          .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderId))
          .first();
        if (order) {
          orderToUpdate = order;
        }
      }

      if (!orderToUpdate) {
        console.warn(`[updateShipmentStatus] Order not found for ID: ${args.orderId}`);
        return;
      }

      // Map Porter status to our Order status
      let newStatus: any = undefined;
      switch (args.status) {
        case "accepted":
          newStatus = "pickup_scheduled";
          break;
        case "started":
          newStatus = "in_transit";
          break;
        case "completed":
          newStatus = "delivered";
          break;
        case "cancelled":
          newStatus = "cancelled";
          break;
        default:
          console.warn(`[updateShipmentStatus] Unmapped status: ${args.status}`);
          return;
      }

      await ctx.db.patch(orderToUpdate._id, {
        status: newStatus,
        updatedAt: Date.now(),
      });
      console.log(`[updateShipmentStatus] Successfully updated order ${orderToUpdate._id} to ${newStatus}`);
    } catch (err) {
      console.error(`[updateShipmentStatus] Error updating status:`, err);
    }
  },
});
