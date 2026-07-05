import { query } from "../_generated/server";

export const run = query({
  args: {},
  handler: async (ctx) => {
    let latestCorruptProduct = 0;
    let latestCorruptOrder = 0;

    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      if (product.price > 500000) {
        latestCorruptProduct = Math.max(latestCorruptProduct, product.updatedAt || product._creationTime);
      }
    }

    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      if (!order.orderSnapshot || !order.deliveryAddress || !order.orderSnapshot.addressSnapshot) {
        latestCorruptOrder = Math.max(latestCorruptOrder, order.updatedAt || order.createdAt || order._creationTime);
      }
    }

    return {
      latestCorruptProduct: new Date(latestCorruptProduct).toISOString(),
      latestCorruptOrder: new Date(latestCorruptOrder).toISOString(),
    };
  }
});
