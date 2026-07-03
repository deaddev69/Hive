import { action, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

export const setupDummyOrder = internalMutation({
  args: {},
  handler: async (ctx): Promise<any> => {
    // 1. Create a dummy customer
    const customerId = await (ctx.db.insert as any)("users", {
      email: "test@example.com",
      phone: "9999999999",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      role: "customer",
      isActive: true,
      isPhoneVerified: false
    });

    const boutiqueId = await (ctx.db.insert as any)("boutiques", {
      boutiqueName: "TEST BOUTIQUE",
      email: "testboutique@example.com",
      phone: "9999999999",
      ownerName: "Test Owner",
      address: "Test Boutique Address",
      latitude: 0,
      longitude: 0,
    });

    // 2. Create dummy order
    const orderId = await (ctx.db.insert as any)("orders", {
      orderNumber: "TEST-SR-" + Math.floor(Math.random() * 100000),
      customerId,
      boutiqueId,
      status: "packed", // Packed so it can be dispatched
      paymentStatus: "paid",
      paymentMethod: "prepaid",
      pricing: {
        subtotal: 1000,
        deliveryFee: 0,
        platformFee: 0,
        total: 1000,
      },
      deliveryAddress: {
        label: "Home",
        line1: "Test Address, DO NOT SHIP",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        lat: 0,
        lng: 0,
        phone: "9999999999",
        name: "Test DO NOT SHIP"
      },
      pickupAddress: {
        boutiqueName: "TEST BOUTIQUE",
        address: "Test Boutique Address",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400050",
        phone: "9999999999",
        email: "test@example.com",
        ownerName: "Test",
        latitude: 0,
        longitude: 0
      },
      snapshot: {
        deliveryAddress: {
          name: "TEST DO NOT SHIP",
          phone: "9999999999",
          line1: "Test Address, DO NOT SHIP",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
        }
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // 3. Add dummy order item
    await (ctx.db.insert as any)("orderItems", {
      orderId,
      productId: customerId, // dummy
      boutiqueId: boutiqueId, // dummy
      sku: "TEST-01",
      quantity: 1,
      priceAtPurchase: 1000,
      size: "M",
      imageUrl: "test.png",
      snapshot: {
        productName: "TEST DUMMY PRODUCT",
        sku: "TEST-01",
        quantity: 1,
        priceAtPurchase: 1000,
        size: "M"
      },
      status: "confirmed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return orderId;
  }
});

export const runTest = action({
  args: {},
  handler: async (ctx): Promise<any> => {
    console.log("Starting Shiprocket E2E Dispatch Test...");
    
    // Check if token exists
    const token = await ctx.runAction(internal.lib.shiprocket.getValidTokenAction);
    console.log("1. Token acquired from DB (or refreshed). Prefix:", token.substring(0, 10));

    // Setup order
    const orderId = await ctx.runMutation(internal.tests.shiprocketTest.setupDummyOrder);
    console.log("2. Created dummy TEST order:", orderId);

    // Dispatch
    console.log("3. Triggering dispatch workflow...");
    const shipmentId = await ctx.runMutation(internal.adminLogistics.prepareShiprocketShipmentInternal, { orderId });
    const dispatchResult = await ctx.runAction(internal.lib.shiprocket.dispatchOrder, { orderId, shipmentId });
    
    console.log("4. Dispatch Result:");
    console.log(JSON.stringify(dispatchResult, null, 2));

    // Attempt Cancellation
    console.log("5. Canceling shipment...");
    const cancelResult = await ctx.runAction(internal.lib.shiprocket.cancelShipment, { awbNumbers: [dispatchResult.awbNumber] });
    console.log("6. Cancellation Result:");
    console.log(JSON.stringify(cancelResult, null, 2));

    return { dispatchResult, cancelResult, webhookUrl: "https://benevolent-seahorse-336.convex.site/webhooks/logistics" };
  }
});
