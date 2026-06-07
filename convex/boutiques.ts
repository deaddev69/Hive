// convex/boutiques.ts
// Queries and mutations to manage boutiques in the marketplace registry.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, getMyBoutique } from "./lib/auth";

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

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

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
      
      ownerEmail:       args.email,
      ownerUserId:      user ? user._id : undefined,

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

    const boutique = await ctx.db.get(args.id);
    if (!boutique) throw new Error("Boutique not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", boutique.email))
      .unique();

    const patches: any = { status: "APPROVED" };
    if (user) {
      patches.userId = user._id; // legacy
      patches.ownerUserId = user._id;
      await ctx.db.patch(user._id, { role: "boutique_owner", updatedAt: Date.now() });
    }

    await ctx.db.patch(args.id, patches);
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

/**
 * Fetch all approved boutiques.
 * Public query.
 */
export const getApprovedBoutiques = query({
  args: {},
  handler: async (ctx) => {
    const boutiques = await ctx.db
      .query("boutiques")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .collect();

    return Promise.all(
      boutiques.map(async (b) => {
        let logoUrl = b.logoUrl;
        if (logoUrl && !logoUrl.startsWith("http")) {
          logoUrl = (await ctx.storage.getUrl(logoUrl)) || logoUrl;
        }
        let bannerUrl = b.bannerUrl;
        if (bannerUrl && !bannerUrl.startsWith("http")) {
          bannerUrl = (await ctx.storage.getUrl(bannerUrl)) || bannerUrl;
        }
        return {
          ...b,
          logoUrl,
          bannerUrl,
        };
      })
    );
  },
});

/**
 * Update boutique details by the owner.
 * Boutique-only mutation.
 */
export const updateBoutiqueProfile = mutation({
  args: {
    phone: v.string(),
    description: v.string(),
    logoUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    boutiqueName: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    deliveryRadiusKm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    await ctx.db.patch(boutique._id, {
      phone: args.phone,
      description: args.description,
      logoUrl: args.logoUrl,
      bannerUrl: args.bannerUrl,
      phoneNumber: args.phone, // compatibility field
      
      boutiqueName: args.boutiqueName ?? boutique.boutiqueName,
      ownerName: args.ownerName ?? boutique.ownerName,
      address: args.address ?? boutique.address,
      latitude: args.latitude ?? boutique.latitude,
      longitude: args.longitude ?? boutique.longitude,
      deliveryRadiusKm: args.deliveryRadiusKm ?? boutique.deliveryRadiusKm,
      
      name: args.boutiqueName ?? boutique.name,
    });
    return boutique._id;
  },
});

export const getMyBoutiqueDetails = query({
  args: {},
  handler: async (ctx) => {
    const boutique = await getMyBoutique(ctx);
    let logoUrl = boutique.logoUrl;
    if (logoUrl && !logoUrl.startsWith("http")) {
      logoUrl = (await ctx.storage.getUrl(logoUrl)) || logoUrl;
    }
    let bannerUrl = boutique.bannerUrl;
    if (bannerUrl && !bannerUrl.startsWith("http")) {
      bannerUrl = (await ctx.storage.getUrl(bannerUrl)) || bannerUrl;
    }
    return {
      ...boutique,
      logoUrl,
      bannerUrl,
    };
  },
});

export const getMyBoutiqueSafe = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { exists: false, error: "Unauthenticated" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return { exists: false, error: "User not found" };

    if (user.role !== "boutique" && user.role !== "boutique_owner") {
      return { exists: false, error: "Not a boutique user" };
    }

    const boutique = await ctx.db
      .query("boutiques")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .unique();

    if (!boutique) {
      return { exists: false, error: "Boutique not linked" };
    }

    return { exists: true, boutique };
  },
});
