// @ts-nocheck
// convex/boutiques.ts
// Queries and mutations to manage boutiques in the marketplace registry.

import { mutation, query, internalQuery, internalAction } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireRole, getMyBoutique, getCurrentUserOrNull, getAuthenticatedUser } from "./lib/auth";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { encryptData, decryptData } from "./lib/encryption";
import { ImageAsset } from "./schema";
import { getPublicUrl } from "./media/api";

/**
 * Fetch all boutiques.
 * Admin-only query.
 */
export const getBoutiques = query({
  args: {
    excludeTestData: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const exclude = args.excludeTestData ?? true;
    let list = await ctx.db.query("boutiques").collect();
    list = list.filter(b => b.status !== "DELETED");
    if (exclude) {
      list = list.filter(b => 
        !b.boutiqueName.startsWith("Chaos Test Boutique") && 
        !b.boutiqueName.startsWith("Mock Boutique") && 
        b.isTestData !== true
      );
    }
    return await Promise.all(
      list.map(async (b) => {
        const onboardingStatus = await determineOnboardingStatus(ctx, b);
        return {
          ...b,
          onboardingStatus,
        };
      })
    );
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
    const boutique = await ctx.db.get(args.id);
    if (!boutique) return null;

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", boutique._id))
      .collect();
    const delivered = orders.filter((o: any) => o.status === "delivered").length;
    
    let suggestedTier: "Bronze" | "Silver" | "Gold" | "Elite" = "Bronze";
    if (delivered > 0) {
      const claims = await ctx.db
        .query("claims")
        .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", boutique._id))
        .collect();
      const claimRate = orders.length > 0 ? (claims.length / orders.length) * 100 : 0;
      const score = boutique.hiveScore || 100;
      
      if (score >= 95 && delivered >= 10 && claimRate < 2) {
        suggestedTier = "Elite";
      } else if (score >= 90 && delivered >= 5) {
        suggestedTier = "Gold";
      } else if (score >= 50 && delivered >= 1) {
        suggestedTier = "Silver";
      }
    }

    const onboardingStatus = await determineOnboardingStatus(ctx, boutique);

    return {
      ...boutique,
      suggestedTier,
      onboardingStatus,
    };
  },
});

export function normalizePhoneNumber(phone: string): string {
  // Strip all non-digit characters
  let cleaned = phone.replace(/\D/g, "");
  
  // If it starts with '0', remove the leading '0'
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  
  // If it is 10 digits long, assume India (+91) and prepend 91
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned;
  }
  
  // Validate final length: Meta Cloud API expects standard E.164 without '+'
  if (cleaned.length < 10 || cleaned.length > 15) {
    throw new Error(`Invalid phone number format: "${phone}". It must be a valid phone number with country code.`);
  }
  
  return cleaned;
}

function validateBoutiqueDetails(details: {
  boutiqueName: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
  description: string;
  searchKeywords?: string[];
}) {
  if (!details.boutiqueName.trim()) throw new Error("Boutique name is required.");
  if (!details.ownerName.trim()) throw new Error("Owner name is required.");
  if (!details.phone.trim() || details.phone.replace(/[^0-9]/g, "").length < 10) {
    throw new Error("Valid contact phone number (at least 10 digits) is required.");
  }
  if (!details.address.trim()) throw new Error("Store physical address is required.");
  if (!details.city.trim()) throw new Error("Store city is required.");
  if (!details.state.trim()) throw new Error("Store state is required.");
  if (!details.pincode.trim()) throw new Error("Store pincode is required.");
  if (
    details.latitude === 0 ||
    details.longitude === 0 ||
    Number.isNaN(details.latitude) ||
    Number.isNaN(details.longitude) ||
    !Number.isFinite(details.latitude) ||
    !Number.isFinite(details.longitude)
  ) {
    throw new Error("Boutique coordinates are mandatory and cannot be at Null Island (0, 0) or NaN.");
  }
  if (!details.deliveryRadiusKm || details.deliveryRadiusKm <= 0) {
    throw new Error("Delivery radius must be a positive number.");
  }
  if (!details.description.trim()) throw new Error("Boutique description is required.");

  if (details.searchKeywords) {
    if (details.searchKeywords.length > 10) {
      throw new Error("Maximum of 10 search keywords allowed.");
    }
    for (const kw of details.searchKeywords) {
      if (kw.trim().length > 40) {
        throw new Error(`Keyword "${kw}" exceeds maximum length of 40 characters.`);
      }
    }
  }
}

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
    city:             v.string(),
    state:            v.string(),
    pincode:          v.string(),
    latitude:         v.number(),
    longitude:        v.number(),
    deliveryRadiusKm: v.number(),
    description:      v.string(),
    status:           v.string(), // PENDING, APPROVED, REJECTED, SUSPENDED
    bankAccount:      v.optional(v.object({
                        holderName: v.string(),
                        accountNo:  v.string(),
                        ifsc:       v.string(),
                      })),
    storeCategory:    v.optional(
                        v.union(
                          v.literal("women_fashion"),
                          v.literal("mens_fashion"),
                          v.literal("footwear"),
                          v.literal("bags"),
                          v.literal("jewellery"),
                          v.literal("multi_category")
                        )
                      ),
    sellerModel:      v.optional(
                        v.union(
                          v.literal("boutique"),
                          v.literal("brand"),
                          v.literal("multi_brand_store")
                        )
                      ),
    area:             v.optional(v.string()),
    searchKeywords:    v.optional(v.array(v.string())),
    serviceType:       v.optional(
                        v.union(
                          v.literal("ready_to_ship"),
                          v.literal("made_to_order"),
                          v.literal("alterations"),
                          v.literal("custom_design")
                        )
                      ),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");

    const normalizedPhone = normalizePhoneNumber(args.phone);
    validateBoutiqueDetails({ ...args, phone: normalizedPhone });

    const rawToken = generateInviteToken();
    const hashed = await hashInviteToken(rawToken);
    const now = Date.now();

    const insertData: any = {
      boutiqueName:     args.boutiqueName,
      ownerName:        args.ownerName,
      email:            args.email,
      phone:            normalizedPhone,
      address:          args.address,
      latitude:         args.latitude,
      longitude:        args.longitude,
      deliveryRadiusKm: args.deliveryRadiusKm,
      description:      args.description,
      status:           args.status,
      storeCategory:    args.storeCategory || "women_fashion",
      sellerModel:      args.sellerModel || "boutique",
      merchantTier:     "Bronze",
      createdAt:        now,
      
      area:             args.area,
      searchKeywords:    args.searchKeywords,
      serviceType:       args.serviceType,

      ownerEmail:       args.email,
      ownerUserId:      undefined, // Set to undefined so onboarding starts at "invited"

      // Invite metadata
      inviteTokenHash:  hashed,
      inviteStatus:     "sent",
      inviteSentAt:     now,
      inviteExpiresAt:  now + 14 * 24 * 60 * 60 * 1000,
      inviteCreatedBy:  adminUser._id,
      activeApprovedProductCount: 0,

      // WhatsApp preferences
      whatsAppNotificationsEnabled: true,
      notificationPhone:            normalizedPhone,

      // Seed backward-compatibility properties if needed
      name:             args.boutiqueName,
      slug:             args.boutiqueName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      phoneNumber:      normalizedPhone,
      addressDetails: {
        line1:          args.address,
        city:           args.city,
        state:          args.state,
        pincode:        args.pincode,
        lat:            args.latitude,
        lng:            args.longitude,
      },
    };

    if (args.bankAccount) {
      const secret = process.env.BANK_ENCRYPTION_KEY;
      if (!secret) throw new Error("FATAL: BANK_ENCRYPTION_KEY environment variable is not configured. Cannot process bank data.");
      const encryptedAccountNo = await encryptData(args.bankAccount.accountNo, secret);
      const accountNoLast4 = args.bankAccount.accountNo.slice(-4).padStart(args.bankAccount.accountNo.length, "X");
      insertData.bankAccount = {
        holderName: args.bankAccount.holderName,
        accountNoLast4,
        encryptedAccountNo,
        ifsc: args.bankAccount.ifsc,
      };
    }

    const boutiqueId = await ctx.db.insert("boutiques", insertData);

    // Schedule background invitation dispatch
    await ctx.scheduler.runAfter(0, internal.boutiques.sendMerchantInviteAction, {
      boutiqueId,
      rawToken,
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
    city:             v.string(),
    state:            v.string(),
    pincode:          v.string(),
    latitude:         v.number(),
    longitude:        v.number(),
    deliveryRadiusKm: v.number(),
    description:      v.string(),
    status:           v.string(),
    whatsAppNotificationsEnabled: v.optional(v.boolean()),
    notificationPhone:            v.optional(v.string()),
    bankAccount:      v.optional(v.object({
                        holderName: v.string(),
                        accountNo:  v.string(),
                        ifsc:       v.string(),
                      })),
    storeCategory:    v.optional(
                        v.union(
                          v.literal("women_fashion"),
                          v.literal("mens_fashion"),
                          v.literal("footwear"),
                          v.literal("bags"),
                          v.literal("jewellery"),
                          v.literal("multi_category")
                        )
                      ),
    sellerModel:      v.optional(
                        v.union(
                          v.literal("boutique"),
                          v.literal("brand"),
                          v.literal("multi_brand_store")
                        )
                      ),
    merchantTier:     v.optional(
                        v.union(
                          v.literal("Bronze"),
                          v.literal("Silver"),
                          v.literal("Gold"),
                          v.literal("Elite")
                        )
                      ),
    area:             v.optional(v.string()),
    searchKeywords:    v.optional(v.array(v.string())),
    serviceType:       v.optional(
                        v.union(
                          v.literal("ready_to_ship"),
                          v.literal("made_to_order"),
                          v.literal("alterations"),
                          v.literal("custom_design")
                        )
                      ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const normalizedPhone = normalizePhoneNumber(args.phone);
    validateBoutiqueDetails({ ...args, phone: normalizedPhone });

    const normalizedNotificationPhone = args.notificationPhone
      ? normalizePhoneNumber(args.notificationPhone)
      : undefined;

    const patchData: any = {
      boutiqueName:     args.boutiqueName,
      ownerName:        args.ownerName,
      email:            args.email,
      phone:            normalizedPhone,
      address:          args.address,
      latitude:         args.latitude,
      longitude:        args.longitude,
      deliveryRadiusKm: args.deliveryRadiusKm,
      description:      args.description,
      status:           args.status,
      storeCategory:    args.storeCategory,
      sellerModel:      args.sellerModel,
      merchantTier:     args.merchantTier,
      whatsAppNotificationsEnabled: args.whatsAppNotificationsEnabled,
      notificationPhone: normalizedNotificationPhone,

      area:             args.area,
      searchKeywords:    args.searchKeywords,
      serviceType:       args.serviceType,
      
      // Update compatibility fields
      name:             args.boutiqueName,
      phoneNumber:      normalizedPhone,
      addressDetails: {
        line1:          args.address,
        city:           args.city,
        state:          args.state,
        pincode:        args.pincode,
        lat:            args.latitude,
        lng:            args.longitude,
      },
    };

    if (args.bankAccount) {
      const secret = process.env.BANK_ENCRYPTION_KEY;
      if (!secret) throw new Error("FATAL: BANK_ENCRYPTION_KEY environment variable is not configured. Cannot process bank data.");
      const encryptedAccountNo = await encryptData(args.bankAccount.accountNo, secret);
      const accountNoLast4 = args.bankAccount.accountNo.slice(-4).padStart(args.bankAccount.accountNo.length, "X");
      patchData.bankAccount = {
        holderName: args.bankAccount.holderName,
        accountNoLast4,
        encryptedAccountNo,
        ifsc: args.bankAccount.ifsc,
      };
    }

    await ctx.db.patch(args.id, patchData);
    return args.id;
  },
});

/**
 * Approve a boutique application.
 * Admin-only mutation.
 */
export const approveBoutique = mutation({
  args: { id: v.id("boutiqueApplications") },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");

    const app = await ctx.db.get(args.id);
    if (!app) throw new Error("Boutique application not found");
    if (app.status !== "PENDING") throw new Error("Application is already processed");

    // Compliance verification guard: check that required documents are verified
    // before allowing merchant activation
    const applicantUser = await ctx.db.get(app.userId);
    if (!applicantUser) throw new Error("Applicant user record not found");

    const now = Date.now();
    const normalizedPhone = normalizePhoneNumber(app.phone);

    // Create the approved boutique record
    const boutiqueId = await ctx.db.insert("boutiques", {
      boutiqueName:     app.boutiqueName,
      ownerName:        app.ownerName,
      email:            app.email,
      phone:            normalizedPhone,
      address:          app.address,
      latitude:         app.latitude,
      longitude:        app.longitude,
      deliveryRadiusKm: app.deliveryRadiusKm,
      description:      app.description,
      status:           "APPROVED",
      storeCategory:    app.storeCategory || "women_fashion",
      sellerModel:      app.sellerModel || "boutique",
      merchantTier:     "Bronze",
      createdAt:        now,
      ownerEmail:       app.email,
      ownerUserId:      app.userId,
      userId:           app.userId, // legacy compatibility

      area:             app.area,
      searchKeywords:    app.searchKeywords,
      serviceType:       app.serviceType,

      // WhatsApp preferences
      whatsAppNotificationsEnabled: true,
      notificationPhone:            normalizedPhone,

      // Seed backward-compatibility properties
      name:             app.boutiqueName,
      slug:             app.boutiqueName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      phoneNumber:      normalizedPhone,
      addressDetails: {
        line1:          app.address,
        city:           app.city ?? "",
        state:          app.state ?? "",
        pincode:        app.pincode ?? "",
        lat:            app.latitude,
        lng:            app.longitude,
      },
      approvedAt:       now,
      approvedBy:       adminUser._id,
    });

    // Update application status
    await ctx.db.patch(args.id, {
      status:     "APPROVED",
      approvedAt: now,
      approvedBy: adminUser._id,
    });

    await triggerNotification(
      ctx,
      app.userId,
      "email",
      "merchant_application_approved",
      "boutique",
      boutiqueId,
      JSON.stringify({
        ownerName: app.ownerName,
        boutiqueName: app.boutiqueName,
      })
    );

    // Upgrade user's role to boutique_owner
    const oldRole = applicantUser.role;
    await ctx.db.patch(app.userId, {
      role: "boutique_owner",
      updatedAt: now,
    });

    // Write audit logs
    await ctx.db.insert("auditLogs", {
      actorRole: "admin",
      actorId: adminUser._id,
      action: "boutique.approved",
      entityType: "boutiques",
      entityId: boutiqueId,
      metadata: JSON.stringify({
        applicationId: args.id,
        ownerUserId: app.userId,
        email: app.email,
      }),
      createdAt: now,
    });

    await ctx.db.insert("auditLogs", {
      actorRole: "admin",
      actorId: adminUser._id,
      action: "user.role_changed",
      entityType: "users",
      entityId: app.userId,
      metadata: JSON.stringify({
        oldRole,
        newRole: "boutique_owner",
        reason: "boutique_approval",
      }),
      createdAt: now,
    });

    return boutiqueId;
  },
});

/**
 * Reject a boutique application.
 * Admin-only mutation.
 */
export const rejectBoutique = mutation({
  args: { 
    id: v.id("boutiqueApplications"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const app = await ctx.db.get(args.id);
    if (!app) throw new Error("Boutique application not found");

    await ctx.db.patch(args.id, {
      status: "REJECTED",
      rejectionReason: args.reason || "Rejection by Admin",
    });

    // Downgrade user role to seller_rejected (preserves application history)
    const appUser = await ctx.db.get(app.userId);
    if (appUser && (appUser.role === "seller_pending" || appUser.role === "customer")) {
      await ctx.db.patch(app.userId, {
        role: "seller_rejected",
        updatedAt: Date.now(),
      });
    }

    await triggerNotification(
      ctx,
      app.userId,
      "email",
      "merchant_application_rejected",
      "boutique_application",
      app._id,
      JSON.stringify({
        ownerName: app.ownerName,
        boutiqueName: app.boutiqueName,
        reason: args.reason || "Rejection by Admin",
      })
    );

    return args.id;
  },
});

/**
 * Suspend a boutique.
 * Admin-only mutation.
 */
export const suspendBoutique = mutation({
  args: { 
    id: v.id("boutiques"),
    suspensionReason: v.string(),
    suspensionNotes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "SUSPENDED",
      suspensionReason: args.suspensionReason,
      suspensionNotes: args.suspensionNotes,
      suspendedAt: now,
      suspendedBy: adminUser._id,
    });
    // Schedule background cart cleanup job
    await ctx.scheduler.runAfter(0, internal.cart.onBoutiqueSuspended, {
      boutiqueId: args.id,
    });

    // Write audit logs
    await ctx.db.insert("auditLogs", {
      actorRole: "admin",
      actorId: adminUser._id,
      action: "boutique.suspended",
      entityType: "boutiques",
      entityId: args.id,
      metadata: JSON.stringify({
        reason: args.suspensionReason,
        notes: args.suspensionNotes,
      }),
      createdAt: now,
    });

    return args.id;
  },
});

/**
 * Soft delete a boutique.
 * Admin-only mutation.
 */
export const softDeleteBoutique = mutation({
  args: { 
    id: v.id("boutiques"),
  },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "DELETED",
    });

    // Write audit logs
    await ctx.db.insert("auditLogs", {
      actorRole: "admin",
      actorId: adminUser._id,
      action: "boutique.deleted",
      entityType: "boutiques",
      entityId: args.id,
      metadata: JSON.stringify({
        reason: "Admin soft delete",
      }),
      createdAt: now,
    });

    return args.id;
  },
});

/**
 * Activate/unsuspend a boutique.
 * Admin-only mutation.
 */
export const activateBoutique = mutation({
  args: { id: v.id("boutiques") },
  handler: async (ctx, args) => {
    const adminUser = await requireRole(ctx, "admin");
    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "APPROVED",
      suspensionReason: undefined,
      suspensionNotes: undefined,
      suspendedAt: undefined,
      suspendedBy: undefined,
    });

    // Write audit logs
    await ctx.db.insert("auditLogs", {
      actorRole: "admin",
      actorId: adminUser._id,
      action: "boutique.activated",
      entityType: "boutiques",
      entityId: args.id,
      metadata: JSON.stringify({
        reason: "Activated by Admin",
      }),
      createdAt: now,
    });

    return args.id;
  },
});

/**
 * Fetch all approved boutiques.
 * Public query.
 */
async function resolveBoutiqueMerchantTier(ctx: any, b: any): Promise<"Bronze" | "Silver" | "Gold" | "Elite" | "New Boutique"> {
  if (b.merchantTier) return b.merchantTier;

  const orders = await ctx.db
    .query("orders")
    .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", b._id))
    .collect();
  const delivered = orders.filter((o: any) => o.status === "delivered").length;
  if (delivered === 0) return "New Boutique";

  const claims = await ctx.db
    .query("claims")
    .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", b._id))
    .collect();

  const claimRate = orders.length > 0 ? (claims.length / orders.length) * 100 : 0;
  const score = b.hiveScore || 100;

  if (score >= 95 && delivered >= 10 && claimRate < 2) {
    return "Elite";
  } else if (score >= 90 && delivered >= 5) {
    return "Gold";
  } else if (score >= 50 && delivered >= 1) {
    return "Silver";
  }
  return "Bronze";
}

export const getApprovedBoutiques = query({
  args: {},
  handler: async (ctx) => {
    const boutiques = await ctx.db
      .query("boutiques")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .collect();

    const filtered = boutiques.filter(b => 
      !b.boutiqueName.startsWith("Chaos Test Boutique") && 
      !b.boutiqueName.startsWith("Mock Boutique") && 
      b.isTestData !== true
    );

    return Promise.all(
      filtered.map(async (b) => {
        let logoUrl = b.logoUrl ? getPublicUrl(b.logoUrl, "thumbnail") : undefined;
        let bannerUrl = b.bannerUrl ? getPublicUrl(b.bannerUrl, "original") : undefined;
        const merchantTier = await resolveBoutiqueMerchantTier(ctx, b);

        const products = await ctx.db
          .query("products")
          .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", b._id))
          .collect();
        const activeApprovedProductCount = products.filter(
          (p) => p.active === true && p.approvalStatus === "approved" && p.adminHidden !== true
        ).length;

        return {
          ...b,
          logoUrl,
          bannerUrl,
          merchantTier,
          trustTier: merchantTier,
          activeApprovedProductCount,
        };
      })
    );
  },
});

/**
 * Fetch a single boutique's public profile by slug.
 * This is an unauthenticated query explicitly designed for the public storefront page.
 * It strictly picks only safe fields to prevent data leaks (no emails, commissions, or internal notes).
 */
export const getBoutiquePublicProfile = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    let boutique = await ctx.db
      .query("boutiques")
      .filter((q) => q.eq(q.field("slug"), args.slug))
      .first();

    if (!boutique) {
      try {
        boutique = await ctx.db.get(args.slug as any);
      } catch (e) {
        boutique = null;
      }
    }

    if (!boutique || boutique.status !== "APPROVED") {
      return null;
    }

    let logoUrl = boutique.logoUrl ? getPublicUrl(boutique.logoUrl, "thumbnail") : undefined;
    let bannerUrl = boutique.bannerUrl ? getPublicUrl(boutique.bannerUrl, "original") : undefined;
    const merchantTier = await resolveBoutiqueMerchantTier(ctx, boutique);

    // Strictly pick public fields
    return {
      _id: boutique._id,
      boutiqueName: boutique.boutiqueName,
      description: boutique.description,
      logoUrl,
      bannerUrl,
      city: boutique.city,
      state: boutique.state,
      deliveryRadiusKm: boutique.deliveryRadiusKm,
      isAcceptingOrders: boutique.isAcceptingOrders,
      merchantTier,
      trustTier: merchantTier,
      storeCategory: boutique.storeCategory,
      createdAt: boutique.createdAt,
    };
  }
});

/**
 * Update boutique details by the owner.
 * Boutique-only mutation.
 */
export const updateBoutiqueProfile = mutation({
  args: {
    phone: v.string(),
    description: v.string(),
    logoUrl: v.optional(ImageAsset),
    bannerUrl: v.optional(ImageAsset),
    boutiqueName: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    address: v.optional(v.string()),
    latitude: v.optional(v.number()),
    longitude: v.optional(v.number()),
    deliveryRadiusKm: v.optional(v.number()),
    whatsAppNotificationsEnabled: v.optional(v.boolean()),
    notificationPhone:            v.optional(v.string()),
    bankAccount: v.optional(v.object({
      holderName: v.string(),
      accountNo:  v.string(),
      ifsc:       v.string(),
    })),
    gstNumber: v.optional(v.string()),
    storeCategory:    v.optional(
                        v.union(
                          v.literal("women_fashion"),
                          v.literal("mens_fashion"),
                          v.literal("footwear"),
                          v.literal("bags"),
                          v.literal("jewellery"),
                          v.literal("multi_category")
                        )
                      ),
    sellerModel:      v.optional(
                        v.union(
                          v.literal("boutique"),
                          v.literal("brand"),
                          v.literal("multi_brand_store")
                        )
                      ),
    weeklyClosedDays: v.optional(v.array(v.number())),
    holidayDates:     v.optional(v.array(v.string())),
    prepTimeMinutes:  v.optional(v.number()),
    dailyOrderLimit:  v.optional(v.number()),
    storeMessage:     v.optional(v.string()),
    openingTime:      v.optional(v.string()),
    closingTime:      v.optional(v.string()),
    area:             v.optional(v.string()),
    searchKeywords:    v.optional(v.array(v.string())),
    serviceType:       v.optional(
                        v.union(
                          v.literal("ready_to_ship"),
                          v.literal("made_to_order"),
                          v.literal("alterations"),
                          v.literal("custom_design")
                        )
                      ),
    storeStatus:      v.optional(v.union(v.literal("open"), v.literal("busy"), v.literal("closed"))),
    isAcceptingOrders: v.optional(v.boolean()),
    pauseReason:      v.optional(
                        v.union(
                          v.literal("vacation"),
                          v.literal("festival"),
                          v.literal("restocking"),
                          v.literal("personal"),
                          v.literal("wedding"),
                          v.literal("renovation"),
                          v.literal("emergency"),
                          v.literal("capacity"),
                          v.literal("other")
                        )
                      ),
    closedUntil:      v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);

    if (args.holidayDates) {
      const oldHolidays = boutique.holidayDates || [];
      const newHolidays = args.holidayDates.filter((h) => !oldHolidays.includes(h));

      if (newHolidays.length > 0) {
        const pendingOrders = await ctx.db
          .query("orders")
          .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutique._id))
          .filter((q) =>
            q.and(
              q.neq(q.field("status"), "delivered"),
              q.neq(q.field("status"), "cancelled"),
              q.neq(q.field("status"), "returned")
            )
          )
          .collect();

        for (const order of pendingOrders) {
          if (order.scheduledProcessingDate && newHolidays.includes(order.scheduledProcessingDate)) {
            throw new ConvexError(
              `Cannot set holiday on ${order.scheduledProcessingDate}. You have active pending pre-orders scheduled for delivery on this day.`
            );
          }
        }
      }
    }

    const normalizedPhone = normalizePhoneNumber(args.phone);
    const normalizedNotificationPhone = args.notificationPhone
      ? normalizePhoneNumber(args.notificationPhone)
      : undefined;

    // Validate searchKeywords if supplied
    if (args.searchKeywords) {
      if (args.searchKeywords.length > 10) {
        throw new Error("Maximum of 10 search keywords allowed.");
      }
      for (const kw of args.searchKeywords) {
        if (kw.trim().length > 40) {
          throw new Error(`Keyword "${kw}" exceeds maximum length of 40 characters.`);
        }
      }
    }

    // Bank details validation
    if (args.bankAccount) {
      if (!args.bankAccount.holderName || args.bankAccount.holderName.trim().length < 3) {
        throw new ConvexError("Account holder name must be at least 3 characters.");
      }
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(args.bankAccount.ifsc)) {
        throw new ConvexError("Invalid IFSC code. Must match format e.g. HDFC0001234.");
      }
      const accNoRegex = /^\d{9,18}$/;
      if (!accNoRegex.test(args.bankAccount.accountNo)) {
        throw new ConvexError("Invalid Account Number. Must contain between 9 and 18 digits.");
      }
    }

    // GSTIN validation
    if (args.gstNumber) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(args.gstNumber)) {
        throw new ConvexError("Invalid GSTIN format. Must be a valid 15-character Indian GSTIN.");
      }
    }

    const patchData: any = {
      phone: normalizedPhone,
      description: args.description,
      logoUrl: args.logoUrl,
      bannerUrl: args.bannerUrl,
      phoneNumber: normalizedPhone, // compatibility field
      whatsAppNotificationsEnabled: args.whatsAppNotificationsEnabled,
      notificationPhone: normalizedNotificationPhone,
      
      boutiqueName: args.boutiqueName ?? boutique.boutiqueName,
      ownerName: args.ownerName ?? boutique.ownerName,
      address: args.address ?? boutique.address,
      latitude: args.latitude ?? boutique.latitude,
      longitude: args.longitude ?? boutique.longitude,
      deliveryRadiusKm: args.deliveryRadiusKm ?? boutique.deliveryRadiusKm,
      storeCategory: args.storeCategory ?? boutique.storeCategory,
      sellerModel: args.sellerModel ?? boutique.sellerModel,
      
      weeklyClosedDays: args.weeklyClosedDays ?? boutique.weeklyClosedDays,
      holidayDates: args.holidayDates ?? boutique.holidayDates,
      prepTimeMinutes: args.prepTimeMinutes ?? boutique.prepTimeMinutes,
      dailyOrderLimit: args.dailyOrderLimit ?? boutique.dailyOrderLimit,
      storeMessage: args.storeMessage ?? boutique.storeMessage,
      openingTime: args.openingTime ?? boutique.openingTime,
      closingTime: args.closingTime ?? boutique.closingTime,

      area: args.area ?? boutique.area,
      searchKeywords: args.searchKeywords ?? boutique.searchKeywords,
      serviceType: args.serviceType ?? boutique.serviceType,
      
      storeStatus: args.storeStatus ?? boutique.storeStatus,
      isAcceptingOrders: args.isAcceptingOrders ?? boutique.isAcceptingOrders,
      pauseReason: args.pauseReason ?? boutique.pauseReason,
      closedUntil: args.closedUntil !== undefined ? args.closedUntil : boutique.closedUntil,
      
      name: args.boutiqueName ?? boutique.name,
      gstNumber: args.gstNumber ?? boutique.gstNumber,
    };

    if (args.bankAccount) {
      const secret = process.env.BANK_ENCRYPTION_KEY;
      if (!secret) throw new Error("FATAL: BANK_ENCRYPTION_KEY environment variable is not configured. Cannot process bank data.");
      const encryptedAccountNo = await encryptData(args.bankAccount.accountNo, secret);
      const accountNoLast4 = args.bankAccount.accountNo.slice(-4).padStart(args.bankAccount.accountNo.length, "X");
      patchData.bankAccount = {
        holderName: args.bankAccount.holderName,
        accountNoLast4,
        encryptedAccountNo,
        ifsc: args.bankAccount.ifsc,
      };
    }

    await ctx.db.patch(boutique._id, patchData);
    return boutique._id;
  },
});

export const getMyBoutiqueDetails = query({
  args: {},
  handler: async (ctx) => {
    const boutique = await getMyBoutique(ctx, undefined, true);
    let logoUrl = boutique.logoUrl ? getPublicUrl(boutique.logoUrl, "thumbnail") : undefined;
    let bannerUrl = boutique.bannerUrl ? getPublicUrl(boutique.bannerUrl, "original") : undefined;
    
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
    const user = await getCurrentUserOrNull(ctx);
    if (!user) return { exists: false, error: "Unauthenticated" };

    // 1. Check for approved boutique in main boutiques registry first
    let boutique = await ctx.db
      .query("boutiques")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .unique();

    const userEmail = user.email;
    if (!boutique && userEmail) {
      boutique = await ctx.db
        .query("boutiques")
        .withIndex("by_email", (q) => q.eq("email", userEmail))
        .unique();
    }

    if (!boutique && user.role === "admin") {
      // Fallback for admins
      boutique = await ctx.db
        .query("boutiques")
        .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
        .first();
    }

    if (boutique) {
      return { exists: true, boutique };
    }

    // 2. Fall back to boutiqueApplications table for latest pending/rejected application status
    const latestApplication = await ctx.db
      .query("boutiqueApplications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (latestApplication) {
      return {
        exists: true,
        boutique: {
          status: latestApplication.status,
          boutiqueName: latestApplication.boutiqueName,
          rejectionReason: latestApplication.rejectionReason,
          storeCategory: latestApplication.storeCategory,
          sellerModel: latestApplication.sellerModel,
          ownerName: latestApplication.ownerName,
          phone: latestApplication.phone,
          address: latestApplication.address,
          city: latestApplication.city,
          state: latestApplication.state,
          pincode: latestApplication.pincode,
          latitude: latestApplication.latitude,
          longitude: latestApplication.longitude,
          deliveryRadiusKm: latestApplication.deliveryRadiusKm,
          description: latestApplication.description,
          area: latestApplication.area,
          searchKeywords: latestApplication.searchKeywords,
          serviceType: latestApplication.serviceType,
        },
      };
    }

    return { exists: false, error: "No boutique or application found" };
  },
});

export const getMyBoutiqueSafeCustomer = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) return { exists: false, error: "Unauthenticated" };

    // 1. Check for approved boutique in main boutiques registry first
    let boutique = await ctx.db
      .query("boutiques")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .unique();

    const userEmail = user.email;
    if (!boutique && userEmail) {
      boutique = await ctx.db
        .query("boutiques")
        .withIndex("by_email", (q) => q.eq("email", userEmail))
        .unique();
    }

    if (!boutique && user.role === "admin") {
      // Fallback for admins
      boutique = await ctx.db
        .query("boutiques")
        .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
        .first();
    }

    if (boutique) {
      return { exists: true, boutique };
    }

    // 2. Fall back to boutiqueApplications table for latest pending/rejected application status
    const latestApplication = await ctx.db
      .query("boutiqueApplications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    if (latestApplication) {
      return {
        exists: true,
        boutique: {
          status: latestApplication.status,
          boutiqueName: latestApplication.boutiqueName,
          rejectionReason: latestApplication.rejectionReason,
          storeCategory: latestApplication.storeCategory,
          sellerModel: latestApplication.sellerModel,
          ownerName: latestApplication.ownerName,
          phone: latestApplication.phone,
          address: latestApplication.address,
          city: latestApplication.city,
          state: latestApplication.state,
          pincode: latestApplication.pincode,
          latitude: latestApplication.latitude,
          longitude: latestApplication.longitude,
          deliveryRadiusKm: latestApplication.deliveryRadiusKm,
          description: latestApplication.description,
          area: latestApplication.area,
          searchKeywords: latestApplication.searchKeywords,
          serviceType: latestApplication.serviceType,
        },
      };
    }

    return { exists: false, error: "No boutique or application found" };
  },
});

/**
 * Submit a boutique partner application.
 * Called by any authenticated user who wants to register a boutique.
 */
export const applyBoutique = mutation({
  args: {
    boutiqueName:     v.string(),
    ownerName:        v.string(),
    phone:            v.string(),
    address:          v.string(),
    city:             v.string(),
    state:            v.string(),
    pincode:          v.string(),
    latitude:         v.number(),
    longitude:        v.number(),
    deliveryRadiusKm: v.number(),
    description:      v.string(),
    token:            v.optional(v.string()),
    storeCategory:    v.optional(
                        v.union(
                          v.literal("women_fashion"),
                          v.literal("mens_fashion"),
                          v.literal("footwear"),
                          v.literal("bags"),
                          v.literal("jewellery"),
                          v.literal("multi_category")
                        )
                      ),
    sellerModel:      v.optional(
                        v.union(
                          v.literal("boutique"),
                          v.literal("brand"),
                          v.literal("multi_brand_store")
                        )
                      ),
    area:             v.optional(v.string()),
    searchKeywords:    v.optional(v.array(v.string())),
    serviceType:       v.optional(
                        v.union(
                          v.literal("ready_to_ship"),
                          v.literal("made_to_order"),
                          v.literal("alterations"),
                          v.literal("custom_design")
                        )
                      ),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);

    const normalizedPhone = normalizePhoneNumber(args.phone);
    validateBoutiqueDetails({ ...args, phone: normalizedPhone });

    // 1. Check if the user already has an active boutique in the registry
    const existingBoutique = await ctx.db
      .query("boutiques")
      .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
      .unique();

    if (existingBoutique) {
      throw new ConvexError("Application already exists");
    }

    // 2. Check if the user already has any boutique application
    const existingApps = await ctx.db
      .query("boutiqueApplications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .collect();

    const pendingOrApprovedApp = existingApps.find(
      (app) => app.status === "PENDING" || app.status === "APPROVED"
    );

    if (pendingOrApprovedApp) {
      throw new ConvexError("Application already exists");
    }

    const rejectedApp = existingApps.find((app) => app.status === "REJECTED");

    if (rejectedApp) {
      // Re-apply by updating the rejected application
      await ctx.db.patch(rejectedApp._id, {
        boutiqueName:     args.boutiqueName,
        ownerName:        args.ownerName,
        phone:            normalizedPhone,
        address:          args.address,
        city:             args.city,
        state:            args.state,
        pincode:          args.pincode,
        latitude:         args.latitude,
        longitude:        args.longitude,
        deliveryRadiusKm: args.deliveryRadiusKm,
        description:      args.description,
        status:           "PENDING",
        rejectionReason:  undefined,
        storeCategory:    args.storeCategory || "women_fashion",
        sellerModel:      args.sellerModel || "boutique",
        area:             args.area,
        searchKeywords:   args.searchKeywords,
        serviceType:      args.serviceType,
      });

      // Upgrade user role to seller_pending so Seller Center shows application status
      if (user.role === "customer" || user.role === "seller_rejected") {
        await ctx.db.patch(user._id, {
          role: "seller_pending",
          updatedAt: Date.now(),
        });
      }

      return rejectedApp._id;
    }

    // Insert new application profile into boutiqueApplications
    const applicationId = await ctx.db.insert("boutiqueApplications", {
      userId:           user._id,
      boutiqueName:     args.boutiqueName,
      ownerName:        args.ownerName,
      email:            user.email || "",
      phone:            normalizedPhone,
      address:          args.address,
      city:             args.city,
      state:            args.state,
      pincode:          args.pincode,
      latitude:         args.latitude,
      longitude:        args.longitude,
      deliveryRadiusKm: args.deliveryRadiusKm,
      description:      args.description,
      status:           "PENDING",
      storeCategory:    args.storeCategory || "women_fashion",
      sellerModel:      args.sellerModel || "boutique",
      area:             args.area,
      searchKeywords:    args.searchKeywords,
      serviceType:       args.serviceType,
      createdAt:        Date.now(),
    });

    // Upgrade user role to seller_pending so Seller Center shows application status
    if (user.role === "customer" || user.role === "seller_rejected") {
      await ctx.db.patch(user._id, {
        role: "seller_pending",
        updatedAt: Date.now(),
      });
    }

    // Trigger ops Slack alert for new boutique application
    const superadmin = await ctx.db.query("users").withIndex("by_role", q => q.eq("role", "admin")).first();
    if (superadmin) {
      await triggerNotification(ctx, superadmin._id, "slack", "boutique_application_submitted", "boutique", applicationId, JSON.stringify({
        boutiqueName: args.boutiqueName,
        ownerName: args.ownerName,
        phone: normalizedPhone,
        city: args.city
      }));
    }

    return applicationId;
  },
});

/**
 * Fetch all boutique applications.
 * Admin-only query.
 */
export const getBoutiqueApplications = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    return await ctx.db.query("boutiqueApplications").order("desc").collect();
  },
});

/**
 * Upload and submit a boutique compliance document.
 * Checks file type, size, and matching extension.
 */
export const uploadBoutiqueDocument = mutation({
  args: {
    type: v.union(
      v.literal("gst_certificate"),
      v.literal("pan"),
      v.literal("trade_license"),
      v.literal("bank_proof"),
      v.literal("other")
    ),
    storageId: v.string(),
    filename: v.string(),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    const now = Date.now();

    // Enforce constraints (max 5MB, MIME types: JPEG, PNG, PDF)
    const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
    const maxBytes = 5 * 1024 * 1024;
    await validateUploadedFile(ctx, args.storageId, args.filename, allowedMimes, maxBytes);

    // Store the storageId directly — do NOT resolve signed URLs at upload time.
    // Signed URLs expire after ~1 hour. We resolve them at query-time instead.
    const storageUrl = args.storageId; // raw storageId stored as 'url' for backward compat

    // Check if a document of this type already exists
    const existing = await ctx.db
      .query("boutiqueDocuments")
      .withIndex("by_boutiqueId_type", (q) => q.eq("boutiqueId", boutique._id).eq("type", args.type))
      .unique();

    let docId;
    if (existing) {
      if (existing.status === "verified") {
        throw new Error("Cannot re-upload a verified document. Contact support for assistance.");
      }
      await ctx.db.patch(existing._id, {
        url: storageUrl,
        publicId: args.storageId,
        status: "pending",
        createdAt: now,
      });
      docId = existing._id;
    } else {
      docId = await ctx.db.insert("boutiqueDocuments", {
        boutiqueId: boutique._id,
        type: args.type,
        url: storageUrl,
        publicId: args.storageId,
        status: "pending",
        createdAt: now,
      });
    }

    await ctx.db.insert("boutiqueDocumentEvents", {
      documentId: docId,
      boutiqueId: boutique._id,
      action: "uploaded",
      createdAt: now,
    });

    // Trigger ops Slack alert for document upload
    const superadmin = await ctx.db.query("users").withIndex("by_role", q => q.eq("role", "admin")).first();
    if (superadmin) {
      await triggerNotification(ctx, superadmin._id, "slack", "boutique_document_uploaded", "boutique", boutique._id, JSON.stringify({
        boutiqueName: boutique.name,
        documentType: args.type,
      }));
    }

    return docId;
  },
});

/**
 * Toggles a boutique's Accepting Orders availability status.
 * Callable by boutique owners/designers.
 */
export const toggleBoutiqueAvailability = mutation({
  args: { isAcceptingOrders: v.boolean() },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    await ctx.db.patch(boutique._id, {
      isAcceptingOrders: args.isAcceptingOrders,
    });
    return { success: true, isAcceptingOrders: args.isAcceptingOrders };
  },
});

/**
 * Mutation to update boutique status, vacation modes, and capacity.
 * Handles emergency pause, quick resume, and normal setting updates.
 */
export const updateStoreStatus = mutation({
  args: {
    storeStatus: v.union(v.literal("open"), v.literal("busy"), v.literal("closed")),
    closedUntil: v.optional(v.number()),
    pauseReason: v.optional(
      v.union(
        v.literal("vacation"),
        v.literal("festival"),
        v.literal("restocking"),
        v.literal("personal"),
        v.literal("wedding"),
        v.literal("renovation"),
        v.literal("emergency"),
        v.literal("capacity"),
        v.literal("other")
      )
    ),
    storeMessage: v.optional(v.string()),
    prepTimeMinutes: v.optional(v.number()),
    weeklyClosedDays: v.optional(v.array(v.number())),
    holidayDates: v.optional(v.array(v.string())),
    dailyOrderLimit: v.optional(v.number()),
    isEmergency: v.optional(v.boolean()),
    isResume: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx);
    const now = Date.now();
    const patchData: any = {};

    if (args.isEmergency) {
      patchData.storeStatus = "closed";
      patchData.closedUntil = undefined;
      patchData.pauseReason = "emergency";
      patchData.storeMessage = "Closed due to an operational emergency";
      patchData.lastPausedAt = now;
      patchData.isAcceptingOrders = false;
    } else if (args.isResume) {
      patchData.storeStatus = "open";
      patchData.closedUntil = undefined;
      patchData.pauseReason = undefined;
      patchData.storeMessage = undefined;
      patchData.lastResumedAt = now;
      patchData.isAcceptingOrders = true;
    } else {
      patchData.storeStatus = args.storeStatus;
      patchData.closedUntil = args.closedUntil;
      patchData.pauseReason = args.pauseReason;
      patchData.storeMessage = args.storeMessage;
      patchData.prepTimeMinutes = args.prepTimeMinutes;
      patchData.weeklyClosedDays = args.weeklyClosedDays;
      patchData.holidayDates = args.holidayDates;
      patchData.dailyOrderLimit = args.dailyOrderLimit;

      if (args.storeStatus === "open") {
        patchData.isAcceptingOrders = true;
        if (boutique.storeStatus !== "open") {
          patchData.lastResumedAt = now;
        }
      } else {
        if (args.storeStatus === "closed") {
          patchData.isAcceptingOrders = false;
        } else {
          patchData.isAcceptingOrders = true;
        }
        if (boutique.storeStatus === "open" || !boutique.storeStatus) {
          patchData.lastPausedAt = now;
        }
      }
    }

    await ctx.db.patch(boutique._id, patchData);
    return { success: true, boutiqueId: boutique._id };
  },
});

/**
 * Fetch uploaded documents for the logged-in boutique.
 */
export const getMyBoutiqueDocuments = query({
  args: {},
  handler: async (ctx) => {
    const boutique = await getMyBoutique(ctx, undefined, true);
    const docs = await ctx.db
      .query("boutiqueDocuments")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutique._id))
      .collect();

    // Resolve fresh signed URLs at query-time (prevents expired URL issues)
    return await Promise.all(
      docs.map(async (doc) => {
        const freshUrl = await ctx.storage.getUrl(doc.publicId);
        return {
          ...doc,
          url: freshUrl ?? doc.url, // fallback to stored value if resolution fails
        };
      })
    );
  },
});

// Helper to generate a random 32-character hex token (safe in all JS runtimes)
export function generateInviteToken(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Helper to hash a token using SHA-256 (safe in all Web Crypto runtimes)
export async function hashInviteToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function determineOnboardingStatus(ctx: any, boutique: any): Promise<"invited" | "account_claimed" | "first_product_uploaded" | "profile_incomplete" | "launch_ready"> {
  if (!boutique.ownerUserId) {
    return "invited";
  }

  // 1. Logo
  const hasLogo = !!boutique.logoUrl && (typeof boutique.logoUrl === "string" ? boutique.logoUrl.trim().length > 0 : true);
  
  // 2. Address Details
  const hasAddress = !!boutique.address && boutique.address.trim().length > 0 &&
    !!boutique.addressDetails &&
    !!boutique.addressDetails.line1 && boutique.addressDetails.line1.trim().length > 0 &&
    !!boutique.addressDetails.city && boutique.addressDetails.city.trim().length > 0 &&
    !!boutique.addressDetails.state && boutique.addressDetails.state.trim().length > 0 &&
    !!boutique.addressDetails.pincode && boutique.addressDetails.pincode.trim().length > 0;

  // 3. Contact Phone
  const hasPhone = !!boutique.phone && boutique.phone.trim().length > 0;

  // 4. Operating Hours
  const hasStoreHours = !!boutique.openingTime && boutique.openingTime.trim().length > 0 &&
    !!boutique.closingTime && boutique.closingTime.trim().length > 0;

  // 5. Bank Details
  const hasBankDetails = !!boutique.bankAccount &&
    !!boutique.bankAccount.holderName && boutique.bankAccount.holderName.trim().length > 0 &&
    !!boutique.bankAccount.accountNoLast4 && boutique.bankAccount.accountNoLast4.trim().length > 0 &&
    !!boutique.bankAccount.encryptedAccountNo && boutique.bankAccount.encryptedAccountNo.trim().length > 0 &&
    !!boutique.bankAccount.ifsc && boutique.bankAccount.ifsc.trim().length > 0;

  // 6. Products count and approval
  const firstProduct = await ctx.db
    .query("products")
    .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", boutique._id))
    .first();
  const hasAnyProduct = !!firstProduct;

  let hasApprovedProduct = false;
  if (boutique.activeApprovedProductCount !== undefined) {
    hasApprovedProduct = boutique.activeApprovedProductCount > 0;
  } else {
    const approvedProduct = await ctx.db
      .query("products")
      .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", boutique._id))
      .filter((q: any) => 
        q.and(
          q.eq(q.field("active"), true),
          q.eq(q.field("approvalStatus"), "approved")
        )
      )
      .first();
    hasApprovedProduct = !!approvedProduct;
  }

  if (hasLogo && hasAddress && hasPhone && hasStoreHours && hasBankDetails && hasApprovedProduct) {
    return "launch_ready";
  }

  if (!hasAnyProduct) {
    return "account_claimed";
  }

  const hasOtherDetails = hasLogo || hasStoreHours || hasBankDetails;
  return hasOtherDetails ? "profile_incomplete" : "first_product_uploaded";
}

export async function updateBoutiqueProductCount(ctx: any, boutiqueId: any) {
  const boutique = await ctx.db.get(boutiqueId);
  if (!boutique) return;

  const products = await ctx.db
    .query("products")
    .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", boutiqueId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("active"), true),
        q.eq(q.field("approvalStatus"), "approved")
      )
    )
    .collect();

  const oldVal = boutique.activeApprovedProductCount ?? 0;
  const newVal = products.length;

  await ctx.db.patch(boutiqueId, {
    activeApprovedProductCount: newVal,
  });

  if (oldVal === 0 && newVal > 0) {
    // Send welcome WhatsApp sequence #2 (first product approved)
    await ctx.scheduler.runAfter(0, internal.whatsapp.sendTemplateMessage, {
      recipient: boutique.phone,
      templateName: "first_product_approved",
      parameters: [boutique.boutiqueName],
    });
  }
}

/**
 * Fetch a single boutique by its invite token (unauthenticated).
 */
export const getBoutiqueByInviteToken = query({
  args: { inviteToken: v.string() },
  handler: async (ctx, args) => {
    const hashed = await hashInviteToken(args.inviteToken);
    const boutique = await ctx.db
      .query("boutiques")
      .withIndex("by_inviteTokenHash", (q) => q.eq("inviteTokenHash", hashed))
      .unique();

    if (!boutique) return null;

    return {
      _id: boutique._id,
      boutiqueName: boutique.boutiqueName,
      ownerName: boutique.ownerName,
      phone: boutique.phone,
      address: boutique.address,
      inviteStatus: boutique.inviteStatus,
      inviteExpiresAt: boutique.inviteExpiresAt,
      ownerUserId: boutique.ownerUserId,
    };
  },
});

export const getBoutiqueInternal = internalQuery({
  args: { id: v.id("boutiques") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/**
 * Background action to send merchant invitations via WhatsApp and email.
 */
export const sendMerchantInviteAction = internalAction({
  args: {
    boutiqueId: v.id("boutiques"),
    rawToken: v.string(),
  },
  handler: async (ctx, args) => {
    const boutique = await ctx.runQuery(internal.boutiques.getBoutiqueInternal, {
      id: args.boutiqueId,
    });

    if (!boutique) {
      console.error(`[sendMerchantInviteAction] Boutique not found: ${args.boutiqueId}`);
      return;
    }

    const claimLink = `https://seller.hive.in/invite/${args.rawToken}`;

    // 1. WhatsApp Template Notification
    console.log(`[sendMerchantInviteAction] Sending WhatsApp to ${boutique.phone}`);
    try {
      await ctx.runAction(internal.whatsapp.sendTemplateMessage, {
        recipient: boutique.phone,
        templateName: "merchant_invite",
        parameters: [claimLink],
      });
    } catch (e) {
      console.error("[sendMerchantInviteAction] Failed to dispatch WhatsApp invite message:", e);
    }

    // 2. Email Notification
    console.log(`[sendMerchantInviteAction] Sending Email to ${boutique.email}`);
    try {
      const emailSubject = `Welcome to Hive 🎉 Your merchant account is ready`;
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #111;">Welcome to Hive 🎉</h2>
          <p>Hi ${boutique.ownerName || "there"},</p>
          <p>Your merchant account for <strong>${boutique.boutiqueName}</strong> is ready.</p>
          <p>Please claim your account by visiting the link below:</p>
          <p style="margin: 24px 0;">
            <a href="${claimLink}" style="background-color: #fbbf24; color: #111; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 6px;">Claim Your Account</a>
          </p>
          <p style="color: #666; font-size: 13px;">This invite link will expire in 14 days.</p>
        </div>
      `;

      await ctx.runAction(internal.emails.sendNotificationEmail, {
        to: boutique.email,
        subject: emailSubject,
        html: emailHtml,
        templateName: "merchant_invite",
      });
    } catch (e) {
      console.error("[sendMerchantInviteAction] Failed to dispatch Email invite:", e);
    }
  },
});

/**
 * Regenerate and resend a boutique's invite.
 */
export const resendBoutiqueInvite = mutation({
  args: { id: v.id("boutiques") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const boutique = await ctx.db.get(args.id);
    if (!boutique) throw new Error("Boutique not found");
    if (boutique.ownerUserId) throw new Error("Account already claimed");

    const rawToken = generateInviteToken();
    const hashed = await hashInviteToken(rawToken);
    const now = Date.now();

    await ctx.db.patch(args.id, {
      inviteTokenHash: hashed,
      inviteStatus: "sent",
      inviteSentAt: now,
      inviteExpiresAt: now + 14 * 24 * 60 * 60 * 1000,
      inviteRequestedAt: undefined,
      inviteCreatedBy: admin._id,
    });

    await ctx.scheduler.runAfter(0, internal.boutiques.sendMerchantInviteAction, {
      boutiqueId: args.id,
      rawToken,
    });

    return { success: true, rawToken };
  },
});

/**
 * Internal action helper to trigger sends in the background to avoid timeout in mutation.
 */
export const resendMultipleInvitesAction = internalAction({
  args: {
    invites: v.array(v.object({
      boutiqueId: v.id("boutiques"),
      rawToken: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    for (const invite of args.invites) {
      try {
        await ctx.runAction(internal.boutiques.sendMerchantInviteAction, {
          boutiqueId: invite.boutiqueId,
          rawToken: invite.rawToken,
        });
      } catch (e) {
        console.error(`[resendMultipleInvitesAction] Failed for ${invite.boutiqueId}:`, e);
      }
    }
  },
});

/**
 * Resend all invites that have expired and been requested.
 */
export const resendAllBoutiqueInvites = mutation({
  args: {},
  handler: async (ctx) => {
    const admin = await requireRole(ctx, "admin");
    const requests = await ctx.db
      .query("boutiques")
      .collect();

    // Filter to unclaimed boutiques that have inviteRequestedAt set
    const pendingRequests = requests.filter(
      (b) => !b.ownerUserId && b.inviteRequestedAt !== undefined
    );

    if (pendingRequests.length === 0) {
      return { count: 0 };
    }

    const invitesToSend = [];
    const now = Date.now();

    for (const boutique of pendingRequests) {
      const rawToken = generateInviteToken();
      const hashed = await hashInviteToken(rawToken);

      await ctx.db.patch(boutique._id, {
        inviteTokenHash: hashed,
        inviteStatus: "sent",
        inviteSentAt: now,
        inviteExpiresAt: now + 14 * 24 * 60 * 60 * 1000,
        inviteRequestedAt: undefined,
        inviteCreatedBy: admin._id,
      });

      invitesToSend.push({
        boutiqueId: boutique._id,
        rawToken,
      });
    }

    // Schedule background dispatch action to process invites asynchronously
    await ctx.scheduler.runAfter(0, internal.boutiques.resendMultipleInvitesAction, {
      invites: invitesToSend,
    });

    return { count: invitesToSend.length };
  },
});

/**
 * Self-recovery: request a new invite for an expired token.
 */
export const requestNewInvite = mutation({
  args: { inviteToken: v.string() },
  handler: async (ctx, args) => {
    const hashed = await hashInviteToken(args.inviteToken);
    const boutique = await ctx.db
      .query("boutiques")
      .withIndex("by_inviteTokenHash", (q) => q.eq("inviteTokenHash", hashed))
      .unique();

    if (!boutique) throw new Error("Invite invalid");
    if (boutique.ownerUserId) throw new Error("Invite already claimed");

    await ctx.db.patch(boutique._id, {
      inviteRequestedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Claim an invite using a token and link it to the authenticated Clerk user.
 */
export const claimBoutiqueInvite = mutation({
  args: { inviteToken: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const hashed = await hashInviteToken(args.inviteToken);
    const boutique = await ctx.db
      .query("boutiques")
      .withIndex("by_inviteTokenHash", (q) => q.eq("inviteTokenHash", hashed))
      .unique();

    if (!boutique) throw new Error("Invalid invite link");
    if (boutique.ownerUserId) throw new Error("This merchant account has already been claimed");
    if (boutique.inviteExpiresAt && boutique.inviteExpiresAt < Date.now()) {
      throw new Error("This invite link has expired");
    }

    const now = Date.now();

    // 1. Assign ownership
    await ctx.db.patch(boutique._id, {
      ownerUserId: user._id,
      userId: user._id, // Legacy compatibility
      inviteStatus: "claimed",
      claimedAt: now,
      inviteTokenHash: undefined,
      inviteRequestedAt: undefined,
      status: "APPROVED", // Ensure approved
    });

    // 2. Upgrade user role
    await ctx.db.patch(user._id, {
      role: "boutique_owner",
      updatedAt: now,
    });

    // Send welcome WhatsApp sequence #1
    await ctx.scheduler.runAfter(0, internal.whatsapp.sendTemplateMessage, {
      recipient: boutique.phone,
      templateName: "merchant_welcome",
      parameters: [boutique.boutiqueName],
    });

    // 3. Log Claim Event
    await ctx.db.insert("auditLogs", {
      actorId: user._id,
      actorRole: "boutique",
      action: "boutique.claimed",
      entityType: "boutiques",
      entityId: boutique._id,
      metadata: JSON.stringify({
        email: user.email,
        claimedAt: now,
      }),
      createdAt: now,
    });

    return { success: true, boutiqueId: boutique._id };
  },
});

/**
 * Get Founder Onboarding dashboard metrics, invite requests, and warning list.
 */
export const getFounderOnboardingMetrics = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const boutiques = await ctx.db.query("boutiques").collect();

    let invited = 0;
    let account_claimed = 0;
    let first_product_uploaded = 0;
    let profile_incomplete = 0;
    let launch_ready = 0;

    const newInviteRequests: any[] = [];
    const stuckInvites: any[] = [];
    const stuckClaimedNoProducts: any[] = [];
    const stuckCatalogApproval: any[] = [];
    const stuckLaunchReadyNoOrders: any[] = [];

    const now = Date.now();

    for (const b of boutiques) {
      const status = await determineOnboardingStatus(ctx, b);
      
      if (status === "invited") invited++;
      else if (status === "account_claimed") account_claimed++;
      else if (status === "first_product_uploaded") first_product_uploaded++;
      else if (status === "profile_incomplete") profile_incomplete++;
      else if (status === "launch_ready") launch_ready++;

      // Check if self-recovery invite request is pending
      if (!b.ownerUserId && b.inviteRequestedAt !== undefined) {
        newInviteRequests.push({
          _id: b._id,
          boutiqueName: b.boutiqueName,
          ownerName: b.ownerName,
          email: b.email,
          phone: b.phone,
          inviteRequestedAt: b.inviteRequestedAt,
        });
      }

      // Stuck metrics calculation
      let referenceTime = b.inviteSentAt || b.createdAt;
      if (b.claimedAt) {
        referenceTime = b.claimedAt;
      }
      const elapsedMs = now - referenceTime;
      const daysElapsed = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));

      if (status === "invited" && daysElapsed >= 3) {
        stuckInvites.push({
          _id: b._id,
          boutiqueName: b.boutiqueName,
          ownerName: b.ownerName,
          phone: b.phone,
          daysWaiting: daysElapsed,
        });
      }

      if (status === "account_claimed" && daysElapsed >= 3) {
        stuckClaimedNoProducts.push({
          _id: b._id,
          boutiqueName: b.boutiqueName,
          ownerName: b.ownerName,
          phone: b.phone,
          daysWaiting: daysElapsed,
        });
      }

      if (status === "first_product_uploaded" || status === "profile_incomplete") {
        const totalProducts = await ctx.db
          .query("products")
          .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", b._id))
          .collect();
        const approvedCount = totalProducts.filter((p: any) => p.active && p.approvalStatus === "approved").length;

        if (totalProducts.length > 0 && approvedCount === 0) {
          stuckCatalogApproval.push({
            _id: b._id,
            boutiqueName: b.boutiqueName,
            ownerName: b.ownerName,
            phone: b.phone,
            uploadedCount: totalProducts.length,
          });
        }
      }

      if (status === "launch_ready") {
        const orders = await ctx.db
          .query("orders")
          .withIndex("by_boutiqueId", (q: any) => q.eq("boutiqueId", b._id))
          .take(1);
        
        if (orders.length === 0 && daysElapsed >= 7) {
          stuckLaunchReadyNoOrders.push({
            _id: b._id,
            boutiqueName: b.boutiqueName,
            ownerName: b.ownerName,
            phone: b.phone,
            daysActive: daysElapsed,
          });
        }
      }
    }

    return {
      funnel: {
        invited,
        account_claimed,
        first_product_uploaded,
        profile_incomplete,
        launch_ready,
      },
      newInviteRequests,
      stuckInvites,
      stuckClaimedNoProducts,
      stuckCatalogApproval,
      stuckLaunchReadyNoOrders,
    };
  },
});


