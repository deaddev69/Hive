// convex/boutiques.ts
// Queries and mutations to manage boutiques in the marketplace registry.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

/**
 * Fetch all boutiques.
 * Admin-only query.
 */
export const getBoutiques = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return await ctx.db.query("boutiques").collect();
  },
});

/**
 * Fetch a single boutique by its ID.
 * Admin or authorized query.
 */
export const getBoutiqueById = query({
  args: { id: v.id("boutiques") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    return await ctx.db.get(args.id);
  },
});

/**
 * Create a new boutique registry.
 * Admin-only mutation.
 */
export const createBoutique = mutation({
  args: {
    boutiqueName:     v.string(),
    ownerName:        v.string(),
    email:            v.string(),
    phone:            v.string(),
    address:          v.string(),
    latitude:         v.number(),
    longitude:        v.number(),
    deliveryRadiusKm: v.number(),
    description:      v.string(),
    status:           v.string(), // PENDING, APPROVED, REJECTED, SUSPENDED
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const boutiqueId = await ctx.db.insert("boutiques", {
      boutiqueName:     args.boutiqueName,
      ownerName:        args.ownerName,
      email:            args.email,
      phone:            args.phone,
      address:          args.address,
      latitude:         args.latitude,
      longitude:        args.longitude,
      deliveryRadiusKm: args.deliveryRadiusKm,
      description:      args.description,
      status:           args.status,
      createdAt:        Date.now(),
      
      // Seed backward-compatibility properties if needed
      name:             args.boutiqueName,
      slug:             args.boutiqueName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      phoneNumber:      args.phone,
      addressDetails: {
        line1:          args.address,
        city:           "Hyderabad", // default
        state:          "Telangana", // default
        pincode:        "500001",
        lat:            args.latitude,
        lng:            args.longitude,
      },
    });

    return boutiqueId;
  },
});

/**
 * Update boutique details.
 * Admin-only mutation.
 */
export const updateBoutique = mutation({
  args: {
    id:               v.id("boutiques"),
    boutiqueName:     v.string(),
    ownerName:        v.string(),
    email:            v.string(),
    phone:            v.string(),
    address:          v.string(),
    latitude:         v.number(),
    longitude:        v.number(),
    deliveryRadiusKm: v.number(),
    description:      v.string(),
    status:           v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    await ctx.db.patch(args.id, {
      boutiqueName:     args.boutiqueName,
      ownerName:        args.ownerName,
      email:            args.email,
      phone:            args.phone,
      address:          args.address,
      latitude:         args.latitude,
      longitude:        args.longitude,
      deliveryRadiusKm: args.deliveryRadiusKm,
      description:      args.description,
      status:           args.status,
      
      // Update compatibility fields
      name:             args.boutiqueName,
      phoneNumber:      args.phone,
    });

    return args.id;
  },
});

/**
 * Approve a boutique.
 * Admin-only mutation.
 */
export const approveBoutique = mutation({
  args: { id: v.id("boutiques") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.patch(args.id, {
      status: "APPROVED",
    });
    return args.id;
  },
});

/**
 * Reject a boutique.
 * Admin-only mutation.
 */
export const rejectBoutique = mutation({
  args: { id: v.id("boutiques") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.patch(args.id, {
      status: "REJECTED",
    });
    return args.id;
  },
});

/**
 * Suspend a boutique.
 * Admin-only mutation.
 */
export const suspendBoutique = mutation({
  args: { id: v.id("boutiques") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.patch(args.id, {
      status: "SUSPENDED",
    });
    return args.id;
  },
});
