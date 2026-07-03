// convex/tests/boutiqueAudit.ts
// Integration tests verifying manual inventory adjustments, price bounds, 
// stock reversal on cancelled orders after schema changes, and restock approval queue gating.

import { action, mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api } from "../_generated/api";

export const getProductForTest = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.productId);
  }
});

export const deleteProductSize = mutation({
  args: { 
    productId: v.id("products"), 
    sizes: v.array(v.string()), 
    stockBySize: v.record(v.string(), v.number()) 
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, {
      sizes: args.sizes,
      stockBySize: args.stockBySize,
      updatedAt: Date.now(),
    });
  }
});

export const setupBoutiqueAudit = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // 1. Setup Test Merchant User
    const merchantUserId = await ctx.db.insert("users", {
      email: "chaos_merchant@hive.com",
      role: "boutique_owner",
      isActive: true,
      isPhoneVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    const merchantToken = `mock_user_${merchantUserId}`;

    // 2. Setup Test Customer User
    const customerUserId = await ctx.db.insert("users", {
      email: "chaos_customer@hive.com",
      role: "customer",
      isActive: true,
      isPhoneVerified: true,
      createdAt: now,
      updatedAt: now,
    });
    const customerToken = `mock_user_${customerUserId}`;

    // 3. Setup Approved Bronze Boutique (for moderation testing)
    const testBoutiqueId = await ctx.db.insert("boutiques", {
      boutiqueName: "Audit Test Boutique",
      ownerName: "Audit Owner",
      email: "chaos_merchant@hive.com",
      phone: "+919999999999",
      address: "123 Audit Lane",
      latitude: 17.385,
      longitude: 78.486,
      deliveryRadiusKm: 10,
      description: "Audit testing store",
      status: "APPROVED",
      isAcceptingOrders: true,
      merchantTier: "Bronze",
      ownerEmail: "chaos_merchant@hive.com",
      ownerUserId: merchantUserId,
      createdAt: now,
    });

    const firstCategory = await ctx.db.query("categories").first();
    if (!firstCategory) {
      throw new Error("No categories found. Please seed the database first.");
    }
    const testCategoryId = firstCategory._id;

    // 4. Setup Test Address
    const testAddressId = await ctx.db.insert("addresses", {
      userId: customerUserId,
      label: "Audit Home",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500001",
      lat: 17.385,
      lng: 78.486,
      formattedAddress: "123 Audit Lane",
      houseNumber: "Flat 101",
      phone: "+919999999999",
      isDefault: true,
      addressStatus: "verified",
      isDeleted: false,
      createdAt: now,
    });

    // Create product 1 (for Test 1 Concurrency)
    const product1Slug = "audit-concurrency-dress-" + now;
    const product1Id = await ctx.db.insert("products", {
      boutiqueId: testBoutiqueId,
      name: "Audit Concurrency Dress",
      slug: product1Slug,
      description: "Concurrency test item",
      categoryId: testCategoryId,
      price: 1000,
      images: ["image_ref"],
      sizes: ["M"],
      stockBySize: { M: 1 },
      sameDayEligible: true,
      featured: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create product 2 (for Test 2 Reversal Math)
    const product2Slug = "audit-schema-change-dress-" + now;
    const product2Id = await ctx.db.insert("products", {
      boutiqueId: testBoutiqueId,
      name: "Audit Schema Change Dress",
      slug: product2Slug,
      description: "Schema change test item",
      categoryId: testCategoryId,
      price: 1500,
      images: ["image_ref"],
      sizes: ["S", "M"],
      stockBySize: { S: 5, M: 1 },
      sameDayEligible: true,
      featured: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // Create product 4 (for Test 4 Restock)
    const product4Slug = "audit-restock-dress-" + now;
    const product4Id = await ctx.db.insert("products", {
      boutiqueId: testBoutiqueId,
      name: "Audit Restock Dress",
      slug: product4Slug,
      description: "Restock test item",
      categoryId: testCategoryId,
      price: 2000,
      images: ["image_ref"],
      sizes: ["S"],
      stockBySize: { S: 0 },
      sameDayEligible: true,
      featured: false,
      active: false,
      autoDeactivatedBecauseOutOfStock: true,
      approvalStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return {
      merchantUserId,
      merchantToken,
      customerUserId,
      customerToken,
      testBoutiqueId,
      testCategoryId,
      testAddressId,
      product1Id,
      product1Slug,
      product2Id,
      product2Slug,
      product4Id,
      product4Slug,
    };
  }
});

export const cleanupBoutiqueAudit = mutation({
  args: {
    merchantUserId: v.id("users"),
    customerUserId: v.id("users"),
    testBoutiqueId: v.id("boutiques"),
    testAddressId: v.id("addresses"),
    product1Id: v.id("products"),
    product2Id: v.id("products"),
    product4Id: v.id("products"),
    order1Id: v.optional(v.id("orders")),
    order2Id: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.merchantUserId);
    await ctx.db.delete(args.customerUserId);
    await ctx.db.delete(args.testBoutiqueId);
    await ctx.db.delete(args.testAddressId);
    await ctx.db.delete(args.product1Id);
    await ctx.db.delete(args.product2Id);
    await ctx.db.delete(args.product4Id);

    if (args.order1Id) {
      await ctx.db.delete(args.order1Id);
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.order1Id!))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
    }
    if (args.order2Id) {
      await ctx.db.delete(args.order2Id);
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_orderId", (q) => q.eq("orderId", args.order2Id!))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
    }
  }
});

export const runBoutiqueAuditTests = action({
  args: {},
  handler: async (ctx) => {
    console.log("=== STARTING BOUTIQUE TRANSACTION & SAFETY AUDIT TESTS ===");
    
    // Call setup mutation to bootstrap state
    const testState = await ctx.runMutation(api.tests.boutiqueAudit.setupBoutiqueAudit);

    let order1Id: Id<"orders"> | undefined = undefined;
    let order2Id: Id<"orders"> | undefined = undefined;

    try {
      // =========================================================================
      // TEST 1: Concurrency Validation (Serialization check)
      // =========================================================================
      console.log("\n--- TEST 1: Concurrency (Serialization Check) ---");
      console.log("Firing manual stock recount to 0 AND placeOrder checkout concurrently...");

      // Fire both mutations in parallel to overlapping transactions
      const [resRecount, resCheckout] = await Promise.allSettled([
        ctx.runMutation(api.products.updateInventory, {
          productId: testState.product1Id,
          stockBySize: { M: 0 },
          token: testState.merchantToken,
        }),
        ctx.runMutation(api.orders.placeOrder, {
          addressId: testState.testAddressId,
          deliveryDate: "2026-07-15",
          deliverySlot: "10:00 - 12:00",
          paymentMethod: "cod",
          items: [
            {
              productId: testState.product1Slug,
              name: "Audit Concurrency Dress",
              price: 1000,
              imageUrl: "",
              boutiqueName: "Audit Test Boutique",
              size: "M",
              quantity: 1,
            }
          ],
          subtotal: 1000,
          deliveryFee: 39,
          discount: 0,
          total: 1039,
          reservationId: "res_" + Math.random().toString(36),
          token: testState.customerToken,
        })
      ]);

      // Check results
      let checkoutFailed = false;
      let checkoutSucceeded = false;

      if (resCheckout.status === "rejected") {
        checkoutFailed = true;
        console.log("PASSED: Concurrent checkout transaction aborted/rejected successfully:", resCheckout.reason.message);
      } else {
        checkoutSucceeded = true;
        order1Id = resCheckout.value.orderId;
        console.log("CONCURRENT RESULT: Checkout transaction committed first and created order:", order1Id);
      }

      if (resRecount.status === "rejected") {
        console.log("CONCURRENT WARNING: Manual recount mutation was rejected:", resRecount.reason.message);
      } else {
        console.log("CONCURRENT RESULT: Manual recount transaction committed successfully.");
      }

      // Verify DB state: stock must NEVER be negative under any execution path
      const product1 = await ctx.runQuery(api.tests.boutiqueAudit.getProductForTest, { 
        productId: testState.product1Id 
      });
      const stockVal = product1?.stockBySize["M"] ?? 0;
      console.log("Final Stock Level for size M:", stockVal);

      if (stockVal < 0) {
        throw new Error(`FAIL: Concurrency validation allowed negative stock: ${stockVal}`);
      }
      console.log("PASSED: Database serializability successfully preserved stock bounds.");

      // =========================================================================
      // TEST 2: Reversal Math after Schema Changes
      // =========================================================================
      console.log("\n--- TEST 2: Reversal Math after Schema Changes ---");

      // Place order for size M
      order2Id = await ctx.runMutation(api.orders.placeOrder, {
        addressId: testState.testAddressId,
        deliveryDate: "2026-07-15",
        deliverySlot: "10:00 - 12:00",
        paymentMethod: "cod",
        items: [
          {
            productId: testState.product2Slug,
            name: "Audit Schema Change Dress",
            price: 1500,
            imageUrl: "",
            boutiqueName: "Audit Test Boutique",
            size: "M",
            quantity: 1,
          }
        ],
        subtotal: 1500,
        deliveryFee: 19.5,
        discount: 0,
        total: 1519.5,
        reservationId: "res_" + Math.random().toString(36),
        token: testState.customerToken,
      }).then((res: any) => res.orderId);

      // Verify stock is now 0
      const midProd = await ctx.runQuery(api.tests.boutiqueAudit.getProductForTest, { 
        productId: testState.product2Id 
      });
      if (midProd?.stockBySize["M"] !== 0) {
        throw new Error("FAIL: Order placement did not deduct stock.");
      }

      // Simulating schema change: Merchant deletes size "M"
      console.log("Merchant deletes size M from product variant structure...");
      await ctx.runMutation(api.tests.boutiqueAudit.deleteProductSize, {
        productId: testState.product2Id,
        sizes: ["S"],
        stockBySize: { S: 5 },
      });

      // Cancel the order via updateBoutiqueOrderStatus
      console.log("Cancelling order with deleted size variant M...");
      await ctx.runMutation(api.orders.updateBoutiqueOrderStatus, {
        orderId: order2Id!,
        status: "cancelled",
        token: testState.merchantToken,
      });

      const postCancelProd = await ctx.runQuery(api.tests.boutiqueAudit.getProductForTest, { 
        productId: testState.product2Id 
      });
      console.log("Post-cancellation stock map:", postCancelProd?.stockBySize);
      console.log("Post-cancellation active sizes:", postCancelProd?.sizes);

      // Assert that size "M" was NOT re-added to sizes catalog (respecting deletion), but stock is restored
      if (!postCancelProd?.sizes.includes("M") && postCancelProd?.stockBySize["M"] === 1) {
        console.log("PASSED: size M stock was restored to database, but did NOT resurrect into active catalog list!");
      } else {
        throw new Error("FAIL: Sizing resurrection logic did not respect merchant catalog deletion.");
      }

      // =========================================================================
      // TEST 3: Server-Side Price Bounds Check
      // =========================================================================
      console.log("\n--- TEST 3: Server-Side Price Bounds Check ---");
      
      const mockArgsNegativePrice = {
        name: "Negative Price Item",
        active: true,
        featured: false,
        sameDayEligible: true,
        images: ["image_ref"],
        description: "Test description",
        price: -50,
        categoryId: testState.testCategoryId,
        sizes: ["S"],
        stockBySize: { S: 10 },
      };

      let caughtNegativePriceError = false;
      try {
        await ctx.runMutation(api.products.createProduct, { ...mockArgsNegativePrice, token: testState.merchantToken });
      } catch (err: any) {
        caughtNegativePriceError = true;
        console.log("PASSED: Caught negative price error:", err.message);
      }

      const mockArgsInvalidDiscount = {
        name: "Invalid Discount Item",
        active: true,
        featured: false,
        sameDayEligible: true,
        images: ["image_ref"],
        description: "Test description",
        price: 100,
        discountPrice: 150,
        categoryId: testState.testCategoryId,
        sizes: ["S"],
        stockBySize: { S: 10 },
      };

      let caughtInvalidDiscountError = false;
      try {
        await ctx.runMutation(api.products.createProduct, { ...mockArgsInvalidDiscount, token: testState.merchantToken });
      } catch (err: any) {
        caughtInvalidDiscountError = true;
        console.log("PASSED: Caught invalid discount error:", err.message);
      }

      if (!caughtNegativePriceError || !caughtInvalidDiscountError) {
        throw new Error("FAIL: Server failed to validate price bounds.");
      }

      // =========================================================================
      // TEST 4: Restock While Pending/Rejected Approval
      // =========================================================================
      console.log("\n--- TEST 4: Restock While Pending/Rejected Approval ---");

      // Simulate restock via updateInventory mutation: set stock to 5
      console.log("Restocking pending product via updateInventory mutation...");
      await ctx.runMutation(api.products.updateInventory, {
        productId: testState.product4Id,
        stockBySize: { S: 5 },
        token: testState.merchantToken,
      });

      const updatedP4 = await ctx.runQuery(api.tests.boutiqueAudit.getProductForTest, { 
        productId: testState.product4Id 
      });
      console.log("Post-restock active status:", updatedP4?.active);
      console.log("Post-restock approval status:", updatedP4?.approvalStatus);

      if (updatedP4?.active) {
        throw new Error("FAIL: Security Bug confirmed! A pending product was auto-activated on restock!");
      } else {
        console.log("PASSED: Restocked pending product remained inactive.");
      }

      console.log("=== COMPLETED BOUTIQUE AUDIT TESTS ===");

    } finally {
      // Execute cleanup mutation
      console.log("\nCleaning up chaos testing records...");
      await ctx.runMutation(api.tests.boutiqueAudit.cleanupBoutiqueAudit, {
        merchantUserId: testState.merchantUserId,
        customerUserId: testState.customerUserId,
        testBoutiqueId: testState.testBoutiqueId,
        testAddressId: testState.testAddressId,
        product1Id: testState.product1Id,
        product2Id: testState.product2Id,
        product4Id: testState.product4Id,
        order1Id,
        order2Id,
      });
    }

    return { success: true };
  }
});
