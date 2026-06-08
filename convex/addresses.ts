// convex/addresses.ts
// Address CRUD for the HIVE customer app.
// All operations are scoped to the authenticated user — no cross-user access possible.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";

/**
 * List all non-deleted addresses for the current user.
 * Returns [] for unauthenticated users — the frontend handles the redirect.
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const addresses = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    return addresses.filter((a) => !a.isDeleted);
  },
});

/**
 * Add a new address for the current user.
 * If isDefault=true, clears default flag on all other addresses first.
 */
export const add = mutation({
  args: {
    label:            v.string(),
    line1:            v.optional(v.string()),       // legacy field — optional for new map-based addresses
    line2:            v.optional(v.string()),
    city:             v.string(),
    state:            v.string(),
    pincode:          v.string(),
    lat:              v.optional(v.number()),       // map coordinates
    lng:              v.optional(v.number()),
    formattedAddress: v.optional(v.string()),       // full reverse-geocoded string
    houseNumber:      v.optional(v.string()),       // user's door/flat number
    landmark:         v.optional(v.string()),       // nearby landmark
    isDefault:        v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const now = Date.now();

    if (args.isDefault) {
      // Unset all other defaults
      const existing = await ctx.db
        .query("addresses")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .take(50);
      for (const addr of existing) {
        if (addr.isDefault && !addr.isDeleted) {
          await ctx.db.patch(addr._id, { isDefault: false });
        }
      }
    }

    return await ctx.db.insert("addresses", {
      userId:           user._id,
      label:            args.label,
      line1:            args.line1,
      line2:            args.line2,
      city:             args.city,
      state:            args.state,
      pincode:          args.pincode,
      lat:              args.lat ?? 0,
      lng:              args.lng ?? 0,
      formattedAddress: args.formattedAddress,
      houseNumber:      args.houseNumber,
      landmark:         args.landmark,
      isDefault:        args.isDefault,
      isDeleted:        false,
      createdAt:        now,
    });
  },
});

/**
 * Update an address. Only the owner can update their own address.
 */
export const update = mutation({
  args: {
    addressId:        v.id("addresses"),
    label:            v.optional(v.string()),
    line1:            v.optional(v.string()),
    line2:            v.optional(v.string()),
    city:             v.optional(v.string()),
    state:            v.optional(v.string()),
    pincode:          v.optional(v.string()),
    lat:              v.optional(v.number()),
    lng:              v.optional(v.number()),
    formattedAddress: v.optional(v.string()),
    houseNumber:      v.optional(v.string()),
    landmark:         v.optional(v.string()),
    isDefault:        v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const addr = await ctx.db.get(args.addressId);
    if (!addr || addr.userId !== user._id) throw new Error("Address not found");

    if (args.isDefault) {
      const all = await ctx.db
        .query("addresses")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .take(50);
      for (const a of all) {
        if (a._id !== args.addressId && a.isDefault && !a.isDeleted) {
          await ctx.db.patch(a._id, { isDefault: false });
        }
      }
    }

    const { addressId, ...fields } = args;
    await ctx.db.patch(addressId, fields);
  },
});

/**
 * Soft-delete an address. Only the owner can delete their address.
 */
export const remove = mutation({
  args: { addressId: v.id("addresses") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const addr = await ctx.db.get(args.addressId);
    if (!addr || addr.userId !== user._id) throw new Error("Address not found");
    await ctx.db.patch(args.addressId, { isDeleted: true, isDefault: false });
  },
});

/**
 * Set an address as the default, clearing all others.
 */
export const setDefault = mutation({
  args: { addressId: v.id("addresses") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const addr = await ctx.db.get(args.addressId);
    if (!addr || addr.userId !== user._id) throw new Error("Address not found");

    const all = await ctx.db
      .query("addresses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .take(50);

    for (const a of all) {
      if (!a.isDeleted) {
        await ctx.db.patch(a._id, { isDefault: a._id === args.addressId });
      }
    }
  },
});
