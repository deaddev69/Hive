// convex/tests/retryPaymentSetup.ts
import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export const setupRetryTestEnvironment = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    const userId = await ctx.db.insert("users", {
      email: "chaos_retry_tester@hive.com",
      role: "customer",
      isActive: true,
      isPhoneVerified: true,
      createdAt: now,
      updatedAt: now,
    });

    const boutiqueId = await ctx.db.insert("boutiques", {
      boutiqueName: "Retry Test Boutique",
      ownerName: "Retry Owner",
      email: "retry@boutique.com",
      phone: "+919999999999",
      address: "123 Retry Lane",
      latitude: 17.385,
      longitude: 78.486,
      deliveryRadiusKm: 10,
      description: "Retry testing store",
      status: "APPROVED",
      isAcceptingOrders: true,
      ownerEmail: "retry@boutique.com",
      createdAt: now,
    });

    const firstCategory = await ctx.db.query("categories").first();
    const categoryId = firstCategory?._id || await ctx.db.insert("categories", { name: "Test Category", slug: "test-category", active: true, createdAt: now, sortOrder: 1 });

    const productId = await ctx.db.insert("products", {
      boutiqueId,
      name: "Retry Silk Dress",
      slug: "retry-silk-dress-" + now,
      description: "Retry test item with stock 1",
      categoryId,
      price: 1500,
      images: [],
      sizes: ["M"],
      stockBySize: { M: 1 },
      sameDayEligible: true,
      featured: false,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    const addressId = await ctx.db.insert("addresses", {
      userId,
      label: "Home",
      line1: "123 Test",
      city: "Test",
      state: "Test",
      pincode: "123456",
      lat: 0,
      lng: 0,
      houseNumber: "123",
      formattedAddress: "123 Test",
      phone: "9999999999",
      createdAt: now,
      isDefault: true,
      isDeleted: false,
    });

    const checkoutSessionId = await ctx.db.insert("checkoutSessions", {
      userId,
      addressId,
      addressSnapshot: {},
      deliveryDate: "2026-07-05",
      deliverySlot: "Morning",
      paymentMethod: "online",
      items: [{
        productId,
        name: "Retry Silk Dress",
        price: 1500,
        imageUrl: "",
        boutiqueName: "Retry Test Boutique",
        size: "M",
        quantity: 1,
      }],
      subtotal: 150000,
      deliveryFee: 0,
      discount: 0,
      total: 150000,
      razorpayOrderId: "order_mock_initial",
      status: "failed", // Failed state ready to be retried
      expiresAt: now - 1000, // Expired
      createdAt: now - 10000,
    });

    return { userId, productId, addressId, checkoutSessionId };
  }
});

export const checkProductStock = internalMutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    return product?.stockBySize["M"] ?? 0;
  }
});

export const setProductStock = internalMutation({
  args: { productId: v.id("products"), stock: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, {
      stockBySize: { M: args.stock },
      active: args.stock > 0,
    });
  }
});

export const createFailedSession = internalMutation({
  args: {
    userId: v.id("users"),
    addressId: v.id("addresses"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("checkoutSessions", {
      userId: args.userId,
      addressId: args.addressId,
      addressSnapshot: {},
      deliveryDate: "2026-07-05",
      deliverySlot: "Morning",
      paymentMethod: "online",
      items: [{
        productId: args.productId,
        name: "Retry Silk Dress",
        price: 1500,
        imageUrl: "",
        boutiqueName: "Retry Test Boutique",
        size: "M",
        quantity: 1,
      }],
      subtotal: 150000,
      deliveryFee: 0,
      discount: 0,
      total: 150000,
      razorpayOrderId: "order_mock_" + now,
      status: "failed",
      expiresAt: now - 1000,
      createdAt: now - 10000,
    });
  }
});
