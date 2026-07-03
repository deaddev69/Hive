// convex/schema.ts
// Hive by TailorBee — Complete Convex Schema (21 tables)
// Generated from: HIVE_CONVEX_DATA_MODEL.md v1.0 · June 2026

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * ImageAsset: A reusable schema for all Cloudflare R2 media assets.
 * Replaces the legacy Convex `_storage` IDs.
 */
export const ImageAsset = v.object({
  assetId: v.string(),               // e.g., "01H..." (Unique identifier for global referencing)
  ownerType: v.string(),             // e.g., "boutique", "product"
  ownerId: v.string(),               // The ID of the owner entity
  storageProvider: v.string(),       // e.g., "cloudflare-r2"
  bucket: v.string(),                // e.g., "hive-media"
  objectKey: v.string(),             // e.g., "products/uuid_v1/front.webp"
  status: v.union(v.literal("pending"), v.literal("processing"), v.literal("ready"), v.literal("failed"), v.literal("deleted")),
  displayOrder: v.number(),          // For deterministic rendering order
  width: v.number(),
  height: v.number(),
  size: v.number(),                  // bytes
  mime: v.string(),                  // e.g., "image/webp"
  checksum: v.optional(v.string()),  // sha256 or etag
  contentHash: v.optional(v.string()), // Content hash for deduping
  alt: v.optional(v.string()),       // Accessibility text
  imageRole: v.optional(
    v.union(
      v.literal("PRIMARY"),
      v.literal("BACK"),
      v.literal("DETAIL"),
      v.literal("FABRIC"),
      v.literal("LIFESTYLE"),
      v.literal("OTHER")
    )
  ),
  variants: v.optional(v.object({
    thumbnail: v.optional(v.string()),
    card: v.optional(v.string()),
    pdp: v.optional(v.string()),
    zoom: v.optional(v.string()),
  })),
  uploadedAt: v.number(),            // timestamp
});

export default defineSchema({

  // ─── MEDIA UPLOAD SESSIONS ────────────────────────────────────────────────
  uploadSessions: defineTable({
    sessionId: v.string(),           // UUID matching the object key
    userId: v.id("users"),
    ownerType: v.string(),           // e.g., "boutique"
    ownerId: v.string(),             // e.g., boutiqueId
    assetType: v.string(),           // e.g., "boutique_logo"
    objectKey: v.string(),           // Path in R2
    provider: v.string(),            // "cloudflare-r2"
    bucket: v.string(),              // "hive-media"
    mime: v.string(),
    size: v.number(),
    contentHash: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("committed"), v.literal("failed")),
    expiresAt: v.number(),           // Timeout for the presigned URL
    createdAt: v.number(),
    committedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_status", ["status"]),

  // ─── IDENTITY & AUTH ──────────────────────────────────────────────────────
  users: defineTable({
    clerkId:         v.optional(v.string()),       // optional for custom auth compatibility
    passwordHash:    v.optional(v.string()),       // for custom email/password auth
    googleId:        v.optional(v.string()),       // for custom Google OAuth
    email:           v.optional(v.string()),
    originalEmail:   v.optional(v.string()),       // original email string from auth provider
    normalizedEmail: v.optional(v.string()),       // canonical normalized email for deduplication
    phone:           v.optional(v.string()),       // E.164 format e.g. +919876543210
    role:            v.union(
                       v.literal("customer"),
                       v.literal("seller_pending"),
                       v.literal("seller_rejected"),
                       v.literal("boutique"),
                       v.literal("boutique_owner"),
                       v.literal("admin")
                     ),
    isActive:        v.boolean(),
    isPhoneVerified: v.boolean(),
    isMerged:        v.optional(v.boolean()),      // for soft merging duplicate users
    mergedIntoUserId: v.optional(v.id("users")),   // tracks target user after link
    authProvider:    v.optional(v.union(v.literal("legacy"), v.literal("clerk"), v.literal("guest"))),
    lastLoginAt:     v.optional(v.number()),
    pushEnabled:     v.optional(v.boolean()),      // for future push notifications activation
    fcmToken:        v.optional(v.string()),       // Firebase Cloud Messaging token for mobile push
    createdAt:       v.number(),                   // epoch ms
    updatedAt:       v.number(),
  })
    .index("by_clerkId",  ["clerkId"])
    .index("by_phone",    ["phone"])
    .index("by_email",    ["email"])
    .index("by_normalizedEmail", ["normalizedEmail"])
    .index("by_role",     ["role"])
    .index("by_isMerged", ["isMerged"]),



  // ─── CUSTOMER PROFILE ─────────────────────────────────────────────────────
  customerProfiles: defineTable({
    userId:               v.id("users"),
    displayName:          v.string(),
    avatarUrl:            v.optional(v.string()),
    defaultAddressId:     v.optional(v.id("addresses")),
    regionId:             v.optional(v.id("regions")),
    hiveScore:            v.number(),              // 0–100, recomputed async
    totalOrders:          v.number(),
    totalClaimsSubmitted: v.number(),
    updatedAt:            v.number(),
  })
    .index("by_userId", ["userId"]),

  // ─── ADDRESSES ────────────────────────────────────────────────────────────
  addresses: defineTable({
    userId:           v.id("users"),
    label:            v.string(),                          // "Home" | "Work" | custom
    line1:            v.optional(v.string()),              // legacy manual entry (optional for new map-based)
    line2:            v.optional(v.string()),
    city:             v.string(),
    state:            v.string(),
    pincode:          v.string(),
    lat:              v.number(),
    lng:              v.number(),
    formattedAddress: v.optional(v.string()),              // full reverse-geocoded address string
    houseNumber:      v.optional(v.string()),              // flat/house/door number (user input)
    landmark:         v.optional(v.string()),              // nearby landmark (user input)
    phone:            v.optional(v.string()),              // E.164 phone number
    regionId:         v.optional(v.id("regions")),         // resolved at save time; null = not serviceable
    isDefault:        v.boolean(),
    isDeleted:        v.boolean(),                         // soft delete
    addressStatus:    v.optional(v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected"))),
    locality:         v.optional(v.string()),
    verifiedAt:       v.optional(v.number()),
    verificationSource: v.optional(v.union(v.literal("nominatim"), v.literal("google"))),
    placeId:          v.optional(v.string()),
    createdAt:        v.number(),
  })
    .index("by_userId",         ["userId"])
    .index("by_userId_default", ["userId", "isDefault"]),

  // ─── REGIONS ──────────────────────────────────────────────────────────────
  regions: defineTable({
    name:           v.string(),                     // "Banjara Hills"
    city:           v.string(),                     // "Hyderabad"
    pincodes:       v.array(v.string()),
    polygonGeoJson: v.optional(v.string()),         // GeoJSON boundary string
    isActive:       v.boolean(),
    createdAt:      v.number(),
    updatedAt:      v.number(),
  })
    .index("by_city",     ["city"])
    .index("by_isActive", ["isActive"]),

  // ─── BOUTIQUES ────────────────────────────────────────────────────────────
  boutiques: defineTable({
    boutiqueName:     v.string(),
    ownerName:        v.string(),
    email:            v.string(),
    phone:            v.string(),
    address:          v.string(),
    latitude:         v.number(),
    longitude:        v.number(),
    city:             v.optional(v.string()),
    state:            v.optional(v.string()),
    pincode:          v.optional(v.string()),
    deliveryRadiusKm: v.number(),
    description:      v.string(),
    status:           v.string(), // PENDING, APPROVED, REJECTED, SUSPENDED
    createdAt:        v.number(),
    isAcceptingOrders: v.optional(v.boolean()),
    whatsAppNotificationsEnabled: v.optional(v.boolean()),
    notificationPhone:            v.optional(v.string()),
    isTestData:        v.optional(v.boolean()),
    isSandbox:         v.optional(v.boolean()),
    averagePrepTime:   v.optional(v.number()), // average prep time in minutes
    merchantType:      v.optional(
                         v.union(
                           v.literal("women_fashion"),
                           v.literal("mens_fashion"),
                           v.literal("footwear"),
                           v.literal("handbags"),
                           v.literal("fragrance"),
                           v.literal("jewellery"),
                           v.literal("multi_brand")
                         )
                       ),
    storeCategory:     v.optional(
                         v.union(
                           v.literal("women_fashion"),
                           v.literal("mens_fashion"),
                           v.literal("footwear"),
                           v.literal("bags"),
                           v.literal("jewellery"),
                           v.literal("multi_category")
                         )
                       ),
    sellerModel:       v.optional(
                         v.union(
                           v.literal("boutique"),
                           v.literal("brand"),
                           v.literal("multi_brand_store")
                         )
                       ),
    area:              v.optional(v.string()),
    searchKeywords:    v.optional(v.array(v.string())),
    serviceType:       v.optional(
                         v.union(
                           v.literal("ready_to_ship"),
                           v.literal("made_to_order"),
                           v.literal("alterations"),
                           v.literal("custom_design")
                         )
                       ),


    bankAccount:      v.optional(v.object({
                        holderName:          v.string(),
                        accountNoLast4:      v.string(),
                        encryptedAccountNo:  v.string(),
                        ifsc:                v.string(),
                      })),

    deliveryFee:           v.optional(v.number()),
    freeDeliveryThreshold: v.optional(v.number()),

    ownerUserId:      v.optional(v.id("users")),
    ownerEmail:       v.string(),
    openingTime:      v.optional(v.string()),
    closingTime:      v.optional(v.string()),
    operatingDays:    v.optional(v.array(v.number())),
    dailyOrderLimit:  v.optional(v.number()),
    isOrderable:      v.optional(v.boolean()),
    acceptingOrdersReason: v.optional(v.string()),

    // Legacy fields (made optional to prevent compilation failures in existing code)
    userId:           v.optional(v.id("users")),
    name:             v.optional(v.string()),
    slug:             v.optional(v.string()),
    logoUrl:          v.optional(v.union(v.string(), ImageAsset)),
    bannerUrl:        v.optional(v.union(v.string(), ImageAsset)),
    phoneNumber:      v.optional(v.string()),
    addressDetails:   v.optional(v.object({
      line1:          v.string(),
      line2:          v.optional(v.string()),
      city:           v.string(),
      state:          v.string(),
      pincode:        v.string(),
      lat:            v.number(),
      lng:            v.number(),
    })),
    regionIds:        v.optional(v.array(v.id("regions"))),
    commissionRate:   v.optional(v.number()),
    commissionStartDate: v.optional(v.number()),
    commissionEndDate:   v.optional(v.number()),
    agreementVersion:    v.optional(v.string()),
    agreementSignedAt:   v.optional(v.number()),
    gstNumber:        v.optional(v.string()),
    hiveScore:        v.optional(v.number()),
    totalSales:       v.optional(v.number()),
    totalOrders:      v.optional(v.number()),
    approvedAt:       v.optional(v.number()),
    approvedBy:       v.optional(v.id("users")),
    rejectionReason:  v.optional(v.string()),
    updatedAt:        v.optional(v.number()),
    suspensionReason: v.optional(v.string()),
    suspensionNotes:  v.optional(v.string()),
    suspendedAt:      v.optional(v.number()),
    suspendedBy:      v.optional(v.id("users")),
    merchantTier:     v.optional(
                        v.union(
                          v.literal("Bronze"),
                          v.literal("Silver"),
                          v.literal("Gold"),
                          v.literal("Elite")
                        )
                      ),
    storeStatus:      v.optional(v.union(v.literal("open"), v.literal("busy"), v.literal("closed"))),
    closedUntil:      v.optional(v.number()),
    storeMessage:     v.optional(v.string()),
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
    prepTimeMinutes:  v.optional(v.number()),
    weeklyClosedDays: v.optional(v.array(v.number())),
    holidayDates:     v.optional(v.array(v.string())),
    activeOrdersToday: v.optional(v.number()),
    activeOrdersDate:  v.optional(v.string()),
    lastPausedAt:     v.optional(v.number()),
    lastResumedAt:    v.optional(v.number()),

    // Onboarding & Invite Fields
    activeApprovedProductCount: v.optional(v.number()),
    inviteTokenHash:            v.optional(v.string()),
    inviteStatus:               v.optional(v.union(v.literal("sent"), v.literal("claimed"))),
    inviteSentAt:               v.optional(v.number()),
    inviteExpiresAt:            v.optional(v.number()),
    inviteRequestedAt:          v.optional(v.number()),
    claimedAt:                  v.optional(v.number()),
    inviteCreatedBy:            v.optional(v.id("users")),
    maxActiveOrders:            v.optional(v.number()),
    minimumOrderValue:          v.optional(v.number()),
  })
    .index("by_slug",      ["slug"])
    .index("by_userId",    ["userId"])
    .index("by_status",    ["status"])
    .index("by_email",     ["email"])
    .index("by_regionIds", ["regionIds"])
    .index("by_ownerUserId", ["ownerUserId"])
    .index("by_ownerEmail", ["ownerEmail"])
    .index("by_inviteTokenHash", ["inviteTokenHash"])
    .searchIndex("search_boutiques", {
      searchField: "boutiqueName",
      filterFields: ["status", "storeCategory"],
    }),

  // ─── BOUTIQUE DOCUMENTS ───────────────────────────────────────────────────
  boutiqueDocuments: defineTable({
    boutiqueId:  v.id("boutiques"),
    type:        v.union(
                   v.literal("gst_certificate"),
                   v.literal("pan"),
                   v.literal("trade_license"),
                   v.literal("bank_proof"),
                   v.literal("other")
                 ),
    url:         v.string(),                        // Cloudinary private URL
    publicId:    v.string(),                        // Cloudinary public ID
    status:      v.union(
                   v.literal("pending"),
                   v.literal("verified"),
                   v.literal("rejected")
                 ),
    verifiedBy:  v.optional(v.id("users")),
    verifiedAt:  v.optional(v.number()),
    notes:       v.optional(v.string()),
    createdAt:   v.number(),
  })
    .index("by_boutiqueId",        ["boutiqueId"])
    .index("by_boutiqueId_type",   ["boutiqueId", "type"])
    .index("by_status",            ["status"]),

  // ─── OCCASIONS ────────────────────────────────────────────────────────────
  occasions: defineTable({
    name:        v.string(),                        // "Wedding", "Casual"
    slug:        v.string(),
    description: v.optional(v.string()),
    iconUrl:     v.optional(v.string()),
    bannerUrl:   v.optional(v.string()),
    sortOrder:   v.number(),
    isActive:    v.boolean(),
    createdAt:   v.number(),
    updatedAt:   v.number(),
  })
    .index("by_slug",      ["slug"])
    .index("by_isActive",  ["isActive"])
    .index("by_sortOrder", ["sortOrder"]),

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────
  products: defineTable({
    boutiqueId:       v.id("boutiques"),
    name:             v.string(),
    slug:             v.string(),
    description:      v.string(),
    categoryId:       v.id("categories"),
    price:            v.number(),
    discountPrice:    v.optional(v.number()),
    images:           v.array(v.union(v.string(), ImageAsset)),
    sizes:            v.array(v.string()),
    stockBySize:      v.record(v.string(), v.number()),
    sameDayEligible:  v.boolean(),
    featured:         v.boolean(),
    active:           v.boolean(),
    autoDeactivatedBecauseOutOfStock: v.optional(v.boolean()),
    adminHidden:      v.optional(v.boolean()),
    adminHiddenReason: v.optional(v.string()),
    adminHiddenAt:    v.optional(v.number()),
    adminHiddenBy:    v.optional(v.id("users")),
    moderationCategory: v.optional(v.string()),
    createdAt:        v.number(),
    updatedAt:        v.number(),
    lastVerifiedAt:   v.optional(v.number()),
    verifiedBy:       v.optional(v.id("users")),
    matchingProductIds: v.optional(v.array(v.id("products"))),
    measurementMatrix: v.optional(v.array(v.object({
                         size: v.string(),
                         chest: v.string(),
                         waist: v.string(),
                         shoulder: v.string(),
                         length: v.string(),
                       }))),
    material:         v.optional(v.string()),
    materialType:     v.optional(v.string()),
    care:             v.optional(v.string()),
    origin:           v.optional(v.string()),
    fitNote:          v.optional(v.string()),
    story:            v.optional(v.string()),
    occasion:         v.optional(v.string()),
    approvalStatus:   v.optional(
                        v.union(
                          v.literal("pending"),
                          v.literal("approved"),
                          v.literal("changes_requested")
                        )
                      ),
    approvalNotes:    v.optional(v.string()),
    approvedAt:       v.optional(v.number()),
    approvedBy:       v.optional(v.id("users")),
    lastModeratedAt:  v.optional(v.number()),
    details:          v.optional(v.record(v.string(), v.string())),
    fitRecommendation: v.optional(v.union(
                         v.literal("runs_small"),
                         v.literal("true_to_size"),
                         v.literal("runs_large")
                       )),
    silhouette:       v.optional(v.union(
                         v.literal("slim_fit"),
                         v.literal("regular_fit"),
                         v.literal("relaxed_fit"),
                         v.literal("oversized")
                       )),
  })
    .index("by_boutiqueId", ["boutiqueId"])
    .index("by_categoryId", ["categoryId"])
    .index("by_active",     ["active"])
    .index("by_slug",       ["slug"])
    .index("by_adminHidden", ["adminHidden"])
    .index("by_approvalStatus", ["approvalStatus"])
    .searchIndex("search_products", {
      searchField: "name",
      filterFields: ["active", "categoryId", "boutiqueId"],
    }),

  // ─── PRODUCT IMAGES ───────────────────────────────────────────────────────
  productImages: defineTable({
    productId:          v.id("products"),
    boutiqueId:         v.id("boutiques"),          // denormalised for fast boutique queries
    cloudinaryPublicId: v.string(),
    url:                v.string(),
    altText:            v.optional(v.string()),
    sortOrder:          v.number(),
    isPrimary:          v.boolean(),
    createdAt:          v.number(),
  })
    .index("by_productId",           ["productId"])
    .index("by_productId_isPrimary", ["productId", "isPrimary"])
    .index("by_boutiqueId",          ["boutiqueId"]),

  // ─── PRODUCT VIDEOS ───────────────────────────────────────────────────────
  productVideos: defineTable({
    productId:          v.id("products"),
    boutiqueId:         v.id("boutiques"),
    cloudinaryPublicId: v.string(),
    url:                v.string(),                 // Cloudinary HLS/DASH URL
    thumbnailUrl:       v.optional(v.string()),
    durationSeconds:    v.optional(v.number()),
    sortOrder:          v.number(),
    createdAt:          v.number(),
  })
    .index("by_productId",  ["productId"])
    .index("by_boutiqueId", ["boutiqueId"]),

  // ─── PRODUCT VARIANTS ─────────────────────────────────────────────────────
  productVariants: defineTable({
    productId:      v.id("products"),
    boutiqueId:     v.id("boutiques"),              // denormalised
    size:           v.union(
                      v.literal("XS"),
                      v.literal("S"),
                      v.literal("M"),
                      v.literal("L"),
                      v.literal("XL"),
                      v.literal("XXL"),
                      v.literal("Free")
                    ),
    color:          v.optional(v.string()),
    sku:            v.string(),
    price:          v.number(),                     // paise
    compareAtPrice: v.optional(v.number()),         // MRP in paise
    isActive:       v.boolean(),
    createdAt:      v.number(),
    updatedAt:      v.number(),
  })
    .index("by_productId",  ["productId"])
    .index("by_boutiqueId", ["boutiqueId"])
    .index("by_sku",        ["sku"]),

  // ─── INVENTORY ────────────────────────────────────────────────────────────
  inventory: defineTable({
    variantId:         v.id("productVariants"),
    productId:         v.id("products"),            // denormalised
    boutiqueId:        v.id("boutiques"),           // denormalised
    quantityTotal:     v.number(),                  // boutique's physical stock
    quantityReserved:  v.number(),                  // locked by active orders
    quantityAvailable: v.number(),                  // total - reserved (maintained manually)
    lowStockThreshold: v.number(),                  // alert below this (default 2)
    lastUpdatedBy:     v.optional(v.id("users")),
    updatedAt:         v.number(),
  })
    .index("by_variantId",            ["variantId"])  // effectively unique 1:1
    .index("by_productId",            ["productId"])
    .index("by_boutiqueId",           ["boutiqueId"])
    .index("by_boutiqueId_available", ["boutiqueId", "quantityAvailable"]),

  inventoryMovements: defineTable({
    productId:       v.id("products"),
    boutiqueId:      v.id("boutiques"),
    size:            v.string(),
    beforeQty:       v.number(),
    afterQty:        v.number(),
    adjustmentQty:   v.number(),
    reason:          v.union(
                       v.literal("in_store_sale"),
                       v.literal("damaged_item"),
                       v.literal("returned_item"),
                       v.literal("stock_recount"),
                       v.literal("restock"),
                       v.literal("online_order"),
                       v.literal("inventory_transfer"),
                       v.literal("sample_given"),
                       v.literal("initial_stock"),
                       v.literal("online_order_reversal"),
                       v.literal("order_cancelled")
                     ),
    source:          v.union(
                       v.literal("manual"),
                       v.literal("checkout"),
                       v.literal("return"),
                       v.literal("admin"),
                       v.literal("bulk_import"),
                       v.literal("creation")
                     ),
    createdBy:       v.id("users"),
    orderId:         v.optional(v.id("orders")),
    bulkMovementId:  v.optional(v.string()),
    notes:           v.optional(v.string()),
    createdAt:       v.number(),
  })
    .index("by_productId", ["productId"])
    .index("by_boutiqueId", ["boutiqueId"])
    .index("by_boutiqueId_createdAt", ["boutiqueId", "createdAt"]),

  inventoryVerifications: defineTable({
    boutiqueId:       v.id("boutiques"),
    verifiedBy:       v.id("users"),
    verificationType: v.union(v.literal("quick"), v.literal("full")),
    notes:            v.optional(v.string()),
    createdAt:        v.number(),
  })
    .index("by_boutiqueId", ["boutiqueId"])
    .index("by_boutiqueId_createdAt", ["boutiqueId", "createdAt"]),

  // ─── ORDERS ───────────────────────────────────────────────────────────────
  orders: defineTable({
    orderNumber:          v.string(),               // "HV-20260601-0042"
    customerId:           v.id("users"),
    boutiqueId:           v.id("boutiques"),
    status:               v.union(
                            v.literal("pending_payment"),
                            v.literal("pending_confirmation"),
                            v.literal("confirmed"),
                            v.literal("packed"),
                            v.literal("pickup_scheduled"),
                            v.literal("picked_up"),
                            v.literal("in_transit"),
                            v.literal("out_for_delivery"),
                            v.literal("delivered"),
                            v.literal("cancelled"),
                            v.literal("claim_submitted"),
                            v.literal("replacement_requested"),
                            v.literal("replacement_approved"),
                            v.literal("replacement_dispatched"),
                            v.literal("replacement_delivered"),
                            v.literal("refund_requested"),
                            v.literal("refunded"),
                            v.literal("booking_failed")
                          ),
    // Snapshot of delivery address at order time (immutable)
    deliveryAddress: v.object({
      label:            v.string(),
      line1:            v.optional(v.string()),
      line2:            v.optional(v.string()),
      formattedAddress: v.optional(v.string()),
      houseNumber:      v.optional(v.string()),
      landmark:         v.optional(v.string()),
      city:             v.string(),
      state:            v.string(),
      pincode:          v.string(),
      lat:              v.number(),
      lng:              v.number(),
      phone:            v.optional(v.string()),
      locality:         v.optional(v.string()),
      eLoc:             v.optional(v.string()),
    }),
    pickupAddress: v.optional(v.object({
      boutiqueName: v.string(),
      ownerName: v.string(),
      email: v.string(),
      phone: v.string(),
      address: v.string(),
      latitude: v.number(),
      longitude: v.number(),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      pincode: v.optional(v.string()),
      area: v.optional(v.string()),
    })),
    addressId:            v.id("addresses"),        // reference preserved for profile
    deliverySlotId:       v.optional(v.id("deliverySlots")),
    boutiqueName:         v.optional(v.string()),   // Snapshot frozen at order time
    subtotal:             v.number(),               // paise
    deliveryFee:          v.number(),               // paise
    discount:             v.number(),               // paise
    total:                v.number(),               // paise
    commissionAmount:     v.number(),               // paise
    paymentId:            v.optional(v.id("payments")),
    paymentStatus:        v.union(
                            v.literal("pending"),
                            v.literal("paid"),
                            v.literal("refunded"),
                            v.literal("failed")
                          ),
    checkoutSessionId:    v.optional(v.id("checkoutSessions")),
    reservationId:        v.optional(v.string()),
    orderSnapshot:        v.optional(v.object({
                            boutiqueName: v.string(),
                            boutiqueId: v.id("boutiques"),
                            items: v.array(v.object({
                              productId: v.id("products"),
                              productName: v.string(),
                              size: v.string(),
                              sku: v.string(),
                              priceAtPurchase: v.number(),
                              quantity: v.number(),
                            })),
                            deliveryFee: v.number(),
                            commissionRate: v.number(),
                            addressSnapshot: v.any(),
                            orderValue: v.number(),
                            platformCommissionAmount: v.number(),
                            platformCommissionRate: v.number(),
                            courierQuote: v.optional(v.object({
                              // DEPRECATED: Porter-specific, kept for historic data. New records use [equivalent generic field].
                              estimatedPorterCost: v.optional(v.number()),
                              estimatedCourierCost: v.optional(v.number()),
                              distanceKm: v.number(),
                              etaMinutes: v.number(),
                            })),
                            merchantOperatingModel: v.optional(v.string()),
                            payoutHoldDays: v.number(),
                            taxBreakdown: v.optional(v.object({
                              gstOnCommission: v.number(),
                            })),
                            // DEPRECATED: Porter-specific, kept for historic data. New records use [equivalent generic field].
                            courierCost: v.optional(v.number()),
                            actualCourierCost: v.optional(v.number()),
                            commissionAmount: v.number(),
                            gstAmount: v.number(),
                            merchantPayable: v.number(),
                          })),
    shipmentId:           v.optional(v.id("shipments")),
    notes:                v.optional(v.string()),
    cancelledAt:          v.optional(v.number()),
    cancelReason:         v.optional(v.string()),
    cancelledBy:          v.optional(v.id("users")),
    confirmedAt:          v.optional(v.number()),
    packedAt:             v.optional(v.number()),
    pickupScheduledAt:    v.optional(v.number()),
    pickedUpAt:           v.optional(v.number()),
    inTransitAt:          v.optional(v.number()),
    outForDeliveryAt:     v.optional(v.number()),
    deliveredAt:          v.optional(v.number()),
    claimWindowExpiresAt: v.optional(v.number()),   // deliveredAt + 48h
    refunded_lost_shipment: v.optional(v.boolean()),
    orderAcceptedAt:      v.optional(v.number()),
    readyForPickupAt:     v.optional(v.number()),
    prepTimeDurationMinutes: v.optional(v.number()),
    inventoryConfirmedAt: v.optional(v.number()),
    acceptanceTimeoutAt:  v.optional(v.number()),
    createdAt:            v.number(),
    updatedAt:            v.number(),
  })
    .index("by_orderNumber",       ["orderNumber"])
    .index("by_customerId",        ["customerId"])
    .index("by_boutiqueId",        ["boutiqueId"])
    .index("by_status",            ["status"])
    .index("by_customerId_status", ["customerId", "status"])
    .index("by_boutiqueId_status", ["boutiqueId", "status"])
    .index("by_paymentStatus",     ["paymentStatus"])
    .index("by_createdAt",         ["createdAt"])
    .index("by_checkoutSessionId", ["checkoutSessionId"])
    .index("by_reservationId",     ["reservationId"]),

  // ─── ORDER ITEMS ──────────────────────────────────────────────────────────
  orderItems: defineTable({
    orderId:         v.id("orders"),
    productId:       v.id("products"),
    // variantId stores the same products._id — this platform uses stockBySize on products
    // directly and does not use the productVariants table for checkout.
    variantId:       v.optional(v.id("products")),
    boutiqueId:      v.id("boutiques"),
    // Immutable snapshots at order creation time:
    productName:     v.string(),
    variantSize:     v.string(),
    variantColor:    v.optional(v.string()),
    imageUrl:        v.string(),
    sku:             v.string(),
    priceAtPurchase: v.number(),                    // paise — locked forever
    quantity:        v.number(),
    subtotal:        v.number(),                    // paise
  })
    .index("by_orderId",    ["orderId"])
    .index("by_productId",  ["productId"])
    .index("by_boutiqueId", ["boutiqueId"]),

  // ─── DELIVERY SLOTS ───────────────────────────────────────────────────────
  deliverySlots: defineTable({
    regionId:    v.id("regions"),
    date:        v.string(),                        // "YYYY-MM-DD"
    startTime:   v.string(),                        // "HH:MM"
    endTime:     v.string(),                        // "HH:MM"
    capacity:    v.number(),                        // max orders
    bookedCount: v.number(),                        // current bookings
    isActive:    v.boolean(),
    createdAt:   v.number(),
    updatedAt:   v.number(),
  })
    .index("by_regionId_date",   ["regionId", "date"])
    .index("by_date",            ["date"])
    .index("by_regionId_active", ["regionId", "isActive"]),
  // ─── SHIPROCKET TOKENS ────────────────────────────────────────────────────
  shiprocketTokens: defineTable({
    token: v.string(),
    issuedAt: v.number(),
    expiresAt: v.number(),
  }),

  // ─── SHIPMENTS ────────────────────────────────────────────────────────────
  shipments: defineTable({
    orderId:            v.id("orders"),
    provider:           v.string(),                 // "delhivery" | "shiprocket"
    awbNumber:          v.string(),
    providerShipmentId: v.optional(v.string()),
    status:             v.union(
                          v.literal("created"),
                          v.literal("booking_requested"),
                          v.literal("booking_confirmed"),
                          v.literal("driver_assigned"),
                          v.literal("driver_arrived"),
                          v.literal("booking_failed"),
                          v.literal("pickup_scheduled"),
                          v.literal("picked_up"),
                          v.literal("in_transit"),
                          v.literal("out_for_delivery"),
                          v.literal("delivered"),
                          v.literal("failed"),
                          v.literal("returned"),
                          v.literal("rto_initiated"),
                          v.literal("rto_in_transit"),
                          v.literal("rto_delivered"),
                          v.literal("lost"),
                          v.literal("cancelled")
                        ),
    trackingUrl:        v.optional(v.string()),
    labelUrl:           v.optional(v.string()),
    inventoryRestored:   v.optional(v.boolean()),
    inventoryRestoredAt: v.optional(v.number()),
    exceptionType:       v.optional(v.union(
                           v.literal("customer_unreachable"),
                           v.literal("address_issue"),
                           v.literal("door_locked"),
                           v.literal("payment_issue"),
                           v.literal("courier_damage"),
                           v.literal("lost_package"),
                           v.literal("other")
                         )),
    slaStatus:           v.optional(v.union(
                           v.literal("on_track"),
                           v.literal("at_risk"),
                           v.literal("breached")
                         )),
    delayResponsibility: v.optional(v.union(
                           v.literal("boutique"),
                           v.literal("courier"),
                           v.literal("customer"),
                           v.literal("system")
                         )),
    // Address snapshots (immutable)
    pickupAddress: v.object({
      name:    v.string(),
      line1:   v.string(),
      city:    v.string(),
      state:   v.string(),
      pincode: v.string(),
      phone:   v.string(),
    }),
    deliveryAddress: v.object({
      name:    v.string(),
      line1:   v.string(),
      line2:   v.optional(v.string()),
      city:    v.string(),
      state:   v.string(),
      pincode: v.string(),
      phone:   v.string(),
    }),
    estimatedDelivery:  v.optional(v.number()),     // epoch ms
    deliveredAt:        v.optional(v.number()),
    pickedUpAt:         v.optional(v.number()),
    lastWebhookAt:      v.optional(v.number()),
    scans:              v.optional(v.array(v.any())),
    rawWebhookEvents:   v.array(v.object({          // append-only log
      timestamp:   v.number(),
      status:      v.string(),
      location:    v.optional(v.string()),
      remarks:     v.optional(v.string()),
      rawPayload:  v.optional(v.string()),          // JSON stringified
    })),
    createdAt:          v.number(),
    updatedAt:          v.number(),
    // DEPRECATED: Porter-specific, kept for historic data. New records use [equivalent generic field].
    porterRequestId:    v.optional(v.string()),
    courierRequestId:   v.optional(v.string()),
    bookingStatus:      v.optional(v.union(
                          v.literal("pending"),
                          v.literal("booked"),
                          v.literal("failed"),
                          v.literal("manual_override")
                        )),
    driverName:         v.optional(v.string()),
    driverPhone:        v.optional(v.string()),
    vehiclePlate:       v.optional(v.string()),
    liveTrackingUrl:    v.optional(v.string()),
    // DEPRECATED: Porter-specific, kept for historic data. New records use [equivalent generic field].
    porterBookingAttempts: v.optional(v.number()),
    courierBookingAttempts: v.optional(v.number()),
    lastBookingAttemptAt: v.optional(v.number()),
    bookingFailureReason: v.optional(v.string()),
    providerBookingId:  v.optional(v.string()),
    idempotencyKey:     v.optional(v.string()),
    processedAt:        v.optional(v.number()),
  })
    .index("by_orderId",   ["orderId"])
    .index("by_awbNumber", ["awbNumber"])
    .index("by_status",    ["status"]),

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────
  payments: defineTable({
    orderId:            v.optional(v.id("orders")),
    customerId:         v.id("users"),
    razorpayOrderId:    v.optional(v.string()),
    razorpayPaymentId:  v.optional(v.string()),
    paymentProvider:    v.optional(v.string()),     // "razorpay" | ...
    amount:             v.number(),                 // paise
    currency:           v.string(),                 // "INR"
    status:             v.union(
                          v.literal("initiated"),
                          v.literal("created"),
                          v.literal("pending"),
                          v.literal("captured"),
                          v.literal("refund_pending"),
                          v.literal("refunded"),
                          v.literal("partially_refunded"),
                          v.literal("failed"),
                          v.literal("expired")
                        ),
    method:             v.optional(v.string()),     // "upi" | "card" | ...
    refundId:           v.optional(v.string()),
    refundAmount:       v.optional(v.number()),
    refundedAt:         v.optional(v.number()),
    webhookEvents:      v.array(v.object({
      event:     v.string(),
      timestamp: v.number(),
      payload:   v.optional(v.string()),            // JSON stringified
    })),
    createdAt:          v.number(),
    updatedAt:          v.number(),
  })
    .index("by_orderId",            ["orderId"])
    .index("by_customerId",         ["customerId"])
    .index("by_razorpayOrderId",    ["razorpayOrderId"])
    .index("by_razorpayPaymentId",  ["razorpayPaymentId"])
    .index("by_status",             ["status"]),

  checkoutSessions: defineTable({
    userId:          v.id("users"),
    addressId:       v.id("addresses"),
    addressSnapshot: v.any(), // compiled snapshot
    deliveryDate:    v.string(),
    deliverySlot:    v.string(),
    paymentMethod:   v.string(),
    items:           v.array(v.object({
                       productId: v.string(),
                       name: v.string(),
                       price: v.number(),
                       imageUrl: v.string(),
                       boutiqueName: v.string(),
                       size: v.string(),
                       quantity: v.number(),
                     })),
    subtotal:        v.number(),
    deliveryFee:     v.number(),
    discount:        v.number(),
    total:           v.number(),
    promoCode:       v.optional(v.string()),
    razorpayOrderId: v.string(),
    status:          v.union(
                       v.literal("pending"),
                       v.literal("processing"),
                       v.literal("completed"),
                       v.literal("expired"),
                       v.literal("failed")
                     ),
    expiresAt:       v.number(),
    createdAt:       v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_razorpayOrderId", ["razorpayOrderId"])
    .index("by_status_expiresAt", ["status", "expiresAt"]),

  paymentEvents: defineTable({
    source:      v.literal("razorpay"),
    eventId:     v.optional(v.string()),             // provider event ID if webhook
    orderId:     v.optional(v.id("orders")),
    paymentId:   v.optional(v.id("payments")),
    eventType:   v.union(
                   v.literal("initiated"),
                   v.literal("created"),
                   v.literal("authorized"),
                   v.literal("captured"),
                   v.literal("failed"),
                   v.literal("refunded")
                 ),
    payload:     v.optional(v.string()),            // raw JSON payload
    createdAt:   v.number(),
  })
    .index("by_paymentId", ["paymentId"])
    .index("by_orderId",   ["orderId"])
    .index("by_eventId",   ["eventId"]),

  // ─── CLAIMS ───────────────────────────────────────────────────────────────
  claims: defineTable({
    claimNumber:     v.string(),                    // "CLM-20260601-0012"
    orderId:         v.id("orders"),
    orderItemId:     v.id("orderItems"),
    customerId:      v.id("users"),
    boutiqueId:      v.id("boutiques"),
    type:            v.union(
                       v.literal("damage"),
                       v.literal("wrong_item"),
                       v.literal("missing_item")
                     ),
    description:     v.string(),
    status:          v.union(
                       v.literal("submitted"),
                       v.literal("under_review"),
                       v.literal("evidence_requested"),
                       v.literal("refund_approved"),
                       v.literal("refunded"),
                       v.literal("return_received"),
                       v.literal("closed"),
                       v.literal("rejected")
                     ),
    adminNotes:      v.optional(v.string()),
    reviewedBy:      v.optional(v.id("users")),
    reviewedAt:      v.optional(v.number()),
    resolution:      v.optional(v.union(
                       v.literal("replacement"),
                       v.literal("refund"),
                       v.literal("rejected")
                     )),
    replacementOrderId: v.optional(v.id("orders")),
    refundAmount:    v.optional(v.number()),
    submittedAt:     v.number(),
    windowExpiresAt: v.number(),                    // deliveredAt + 48h
    underReviewAt:       v.optional(v.number()),
    evidenceRequestedAt: v.optional(v.number()),
    refundApprovedAt:    v.optional(v.number()),
    refundedAt:          v.optional(v.number()),
    returnReceivedAt:    v.optional(v.number()),
    closedAt:            v.optional(v.number()),
    rejectedAt:          v.optional(v.number()),
    evidenceSnapshot:    v.optional(v.object({
                           videoUrl: v.string(),
                           imageUrls: v.array(v.string()),
                           uploadedAt: v.number(),
                         })),
    inventoryRestored:   v.optional(v.boolean()),
    createdAt:       v.number(),
    updatedAt:       v.number(),
  })
    .index("by_claimNumber",       ["claimNumber"])
    .index("by_orderId",           ["orderId"])
    .index("by_customerId",        ["customerId"])
    .index("by_boutiqueId",        ["boutiqueId"])
    .index("by_status",            ["status"])
    .index("by_customerId_status", ["customerId", "status"])
    .index("by_createdAt",         ["createdAt"]),

  // ─── CLAIM EVIDENCE ───────────────────────────────────────────────────────
  claimEvidence: defineTable({
    claimId:            v.id("claims"),
    customerId:         v.id("users"),
    type:               v.union(
                          v.literal("unboxing_video"),   // mandatory primary evidence
                          v.literal("damage_photo"),
                          v.literal("wrong_item_photo"),
                          v.literal("packaging_photo")
                        ),
    cloudinaryPublicId: v.string(),
    url:                v.string(),
    isSigned:           v.boolean(),                // true = private signed URL
    durationSeconds:    v.optional(v.number()),     // for videos
    fileSizeBytes:      v.optional(v.number()),
    mimeType:           v.optional(v.string()),
    isPrimary:          v.boolean(),                // the mandatory unboxing video
    uploadedAt:         v.number(),
    createdAt:          v.number(),
  })
    .index("by_claimId",    ["claimId"])
    .index("by_customerId", ["customerId"]),

  claimEvents: defineTable({
    claimId:     v.id("claims"),
    action:      v.string(), // "status_changed" | "notes_added" | "evidence_requested"
    fromStatus:  v.optional(v.string()),
    toStatus:    v.optional(v.string()),
    actorId:     v.id("users"),
    note:        v.optional(v.string()),
    createdAt:   v.number(),
  })
    .index("by_claimId", ["claimId"]),

  // ─── REVIEWS ──────────────────────────────────────────────────────────────
  reviews: defineTable({
    productId:          v.id("products"),
    boutiqueId:         v.id("boutiques"),
    customerId:         v.id("users"),
    orderId:            v.id("orders"),
    orderItemId:        v.id("orderItems"),
    rating:             v.number(),                 // 1–5 integer
    reviewText:         v.optional(v.string()),
    isVerifiedPurchase: v.boolean(),                // always true (enforced)
    isFlagged:          v.boolean(),
    isPublished:        v.boolean(),
    flagReason:         v.optional(v.string()),
    moderatedBy:        v.optional(v.id("users")),
    moderatedAt:        v.optional(v.number()),
    createdAt:          v.number(),
    updatedAt:          v.number(),
  })
    .index("by_productId",           ["productId"])
    .index("by_boutiqueId",          ["boutiqueId"])
    .index("by_customerId",          ["customerId"])
    .index("by_orderId",             ["orderId"])
    .index("by_productId_published", ["productId", "isPublished"]),

  // ─── HIVE SCORES ──────────────────────────────────────────────────────────
  hiveScores: defineTable({
    entityType:  v.union(v.literal("customer"), v.literal("boutique")),
    entityId:    v.string(),                        // Id<"users"> or Id<"boutiques">
    score:       v.number(),                        // 0–100
    components: v.object({
      orderCompletionRate:  v.optional(v.number()),
      claimRate:            v.optional(v.number()),
      responseSlaRate:      v.optional(v.number()), // boutique only
      deliverySuccessRate:  v.optional(v.number()),
      repeatCustomerRate:   v.optional(v.number()), // boutique only
      fraudSignalScore:     v.optional(v.number()), // customer only
    }),
    totalOrdersConsidered: v.number(),
    calculatedAt:          v.number(),
    version:               v.number(),              // increment on each recalculation
  })
    .index("by_entityType_entityId", ["entityType", "entityId"])
    .index("by_entityType_score",    ["entityType", "score"]),

  // ─── NOTIFICATIONS ────────────────────────────────────────────────────────
  notifications: defineTable({
    userId:    v.id("users"),
    type:      v.union(
                 v.literal("order_confirmed"),
                 v.literal("order_rejected"),
                 v.literal("order_picked_up"),
                 v.literal("order_in_transit"),
                 v.literal("order_out_for_delivery"),
                 v.literal("order_delivered"),
                 v.literal("order_cancelled"),
                 v.literal("claim_received"),
                 v.literal("claim_approved"),
                 v.literal("claim_rejected"),
                 v.literal("replacement_dispatched"),
                 v.literal("replacement_delivered"),
                 v.literal("refund_initiated"),
                 v.literal("refund_processed"),
                 v.literal("boutique_approved"),
                 v.literal("boutique_rejected"),
                 v.literal("boutique_suspended"),
                 v.literal("product_approved"),
                 v.literal("product_rejected"),
                 v.literal("low_stock_alert"),
                 v.literal("order_sla_breach")
               ),
    channel:   v.union(
                 v.literal("whatsapp"),
                 v.literal("email"),
                 v.literal("in_app")
               ),
    title:     v.string(),
    body:      v.string(),
    data:      v.optional(v.object({               // deep-link payload
      orderId:   v.optional(v.string()),
      claimId:   v.optional(v.string()),
      productId: v.optional(v.string()),
      url:       v.optional(v.string()),
    })),
    status:    v.union(
                 v.literal("pending"),
                 v.literal("sent"),
                 v.literal("failed")
               ),
    isRead:    v.boolean(),                         // in_app only
    sentAt:    v.optional(v.number()),
    error:     v.optional(v.string()),              // failure reason
    createdAt: v.number(),
  })
    .index("by_userId",        ["userId"])
    .index("by_userId_isRead", ["userId", "isRead"])
    .index("by_status",        ["status"])
    .index("by_userId_type",   ["userId", "type"]),

  // ─── AUDIT LOGS ───────────────────────────────────────────────────────────
  auditLogs: defineTable({
    actorId:    v.optional(v.id("users")),          // null for system actions
    actorRole:  v.string(),
    action:     v.string(),                         // "order.confirmed", "product.approved"
    entityType: v.string(),                         // "order" | "product" | "claim" | ...
    entityId:   v.string(),
    before:     v.optional(v.string()),             // JSON stringified prev state
    after:      v.optional(v.string()),             // JSON stringified new state
    ipAddress:  v.optional(v.string()),
    userAgent:  v.optional(v.string()),
    metadata:   v.optional(v.string()),             // extra context JSON
    createdAt:  v.number(),
  })
    .index("by_actorId",             ["actorId"])
    .index("by_entityType_entityId", ["entityType", "entityId"])
    .index("by_action",              ["action"])
    .index("by_createdAt",           ["createdAt"]),

  // ─── ANALYTICS EVENTS ─────────────────────────────────────────────────────
  analyticsEvents: defineTable({
    eventName:  v.string(),
    userId:     v.optional(v.id("users")),
    sessionId:  v.string(),
    properties: v.optional(v.string()),             // JSON stringified freeform
    regionId:   v.optional(v.id("regions")),
    createdAt:  v.number(),
  })
    .index("by_eventName", ["eventName"])
    .index("by_userId",    ["userId"])
    .index("by_createdAt", ["createdAt"]),

  // ─── WEBHOOK IDEMPOTENCY LOG ──────────────────────────────────────────────
  // Prevents duplicate processing of Razorpay / logistics webhooks
  webhookEvents: defineTable({
    source:      v.union(v.literal("razorpay"), v.literal("logistics"), v.literal("clerk")),
    eventId:     v.string(),                        // provider event ID
    eventType:   v.string(),
    status:      v.union(
                   v.literal("received"),
                   v.literal("processed"),
                   v.literal("failed"),
                   v.literal("duplicate")
                 ),
    payload:     v.optional(v.string()),            // raw JSON
    error:       v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    createdAt:   v.number(),
  })
    .index("by_source_eventId", ["source", "eventId"]) // unique check
    .index("by_status",         ["status"]),
  // ─── CART ITEMS ───────────────────────────────────────────────────────────
  // Lightweight per-user cart storage for the customer app.
  // Flat table: one row per line item, keyed by userId.
  cartItems: defineTable({
    userId:      v.id("users"),
    productId:   v.string(),          // slug or mock ID from frontend
    productSlug: v.optional(v.string()),
    name:        v.string(),
    price:       v.number(),          // rupees (not paise – consistent with UI)
    imageUrl:    v.string(),
    boutiqueName:v.string(),
    boutiqueId:  v.optional(v.string()),
    size:        v.string(),
    quantity:    v.number(),
    addedAt:     v.number(),          // epoch ms
  })
    .index("by_userId", ["userId"])
    .index("by_userId_product_size", ["userId", "productId", "size"]),

  // ─── USER LOCATIONS ───────────────────────────────────────────────────────
  // Location coordinates and details detected/chosen by the user.
  userLocations: defineTable({
    userId:    v.id("users"),
    latitude:  v.number(),
    longitude: v.number(),
    locality:  v.optional(v.string()),
    city:      v.string(),
    state:     v.string(),
    country:   v.string(),
    postcode:  v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // ─── SERVICEABILITY ZONES ──────────────────────────────────────────────────
  serviceZones: defineTable({
    city:      v.string(),
    state:     v.string(),
    isActive:  v.boolean(),
    createdAt: v.number(),
  })
    .index("by_city", ["city"])
    .index("by_isActive", ["isActive"]),

  // ─── SERVICE DEMAND REQUESTS ────────────────────────────────────────────────
  serviceRequests: defineTable({
    userId:    v.optional(v.string()), // Clerk or Convex user identifier
    city:      v.string(),
    state:     v.string(),
    latitude:  v.optional(v.number()),
    longitude: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_city_state", ["city", "state"])
    .index("by_userId", ["userId"]),

  // ─── INVOICES ─────────────────────────────────────────────────────────────
  invoices: defineTable({
    invoiceNumber:   v.string(),
    orderId:         v.id("orders"),
    orderNumber:     v.string(),
    userId:          v.id("users"),
    transactionId:   v.string(),
    customerName:    v.string(),
    customerEmail:   v.string(),
    customerPhone:   v.string(),
    billingAddress:  v.object({
      line1:         v.string(),
      line2:         v.optional(v.string()),
      city:          v.string(),
      state:         v.string(),
      pincode:       v.string(),
    }),
    shippingAddress: v.object({
      line1:         v.string(),
      line2:         v.optional(v.string()),
      city:          v.string(),
      state:         v.string(),
      pincode:       v.string(),
    }),
    items: v.array(
      v.object({
        productId:    v.string(),
        productName:  v.string(),
        productImage: v.string(),
        size:         v.string(),
        quantity:     v.number(),
        unitPrice:    v.number(),
        totalPrice:   v.number(),
      })
    ),
    subtotal:        v.number(),
    deliveryFee:     v.number(),
    discount:        v.number(),
    tax:             v.number(),
    totalAmount:     v.number(),
    paymentMethod:   v.string(),
    paymentStatus:   v.string(),
    generatedAt:     v.number(),
    pdfUrl:          v.optional(v.string()),
  })
    .index("by_order_id",       ["orderId"])
    .index("by_invoice_number", ["invoiceNumber"])
    .index("by_user",           ["userId"]),

  // ─── CATEGORIES ───────────────────────────────────────────────────────────
  categories: defineTable({
    name:           v.string(),
    slug:           v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    imageUrl:       v.optional(v.string()),
    homepageImage:  v.optional(v.string()),
    homepageOrder:  v.optional(v.number()),
    icon:           v.optional(v.string()),
    active:         v.boolean(),
    sortOrder:      v.number(),
    featured:       v.optional(v.boolean()),
    showOnHomepage: v.optional(v.boolean()),
    parentId:       v.optional(v.id("categories")),
    createdAt:      v.number(),
  })
    .index("by_active_and_sortOrder", ["active", "sortOrder"])
    .index("by_parentId", ["parentId"]),

  // ─── DELIVERY ZONES & PINCODES ─────────────────────────────────────────────
  deliveryZones: defineTable({
    code: v.string(),
    name: v.string(),
    deliveryFeePaise: v.number(),
    freeDeliveryThresholdPaise: v.number(),
    sameDayEligible: v.boolean(),
    active: v.boolean(),
  })
    .index("by_code", ["code"]),

  serviceablePincodes: defineTable({
    pincode: v.string(),
    city: v.string(),
    state: v.string(),
    lat: v.number(),
    lng: v.number(),
    active: v.boolean(),
    zoneCode: v.string(), // References deliveryZones.code
  })
    .index("by_pincode", ["pincode"])
    .index("by_active", ["active"]),

  // ─── HOMEPAGE CONFIG ───────────────────────────────────────────────────────
  homepageConfig: defineTable({
    activeHeroBannerIds: v.array(v.id("banners")),
    featuredCategoryIds: v.array(v.id("categories")),
    featuredBoutiqueIds: v.array(v.id("boutiques")),
    enableOccasionSection: v.boolean(),
    enableMostLovedSection: v.boolean(),
    trendingSectionTitle: v.optional(v.string()),
    enableTrendingSection: v.optional(v.boolean()),
    updatedAt: v.number(),
  }),

  homepageBanners: defineTable({
    title: v.string(),
    subtitle: v.optional(v.string()),
    desktopImageUrl: v.string(),
    mobileImageUrl: v.optional(v.string()),
    ctaText: v.string(),
    active: v.boolean(),
    displayOrder: v.number(),
    targetType: v.union(
      v.literal("collection"),
      v.literal("category"),
      v.literal("product"),
      v.literal("search")
    ),
    targetValue: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    city: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_active_and_displayOrder", ["active", "displayOrder"])
    .index("by_city", ["city"]),

  // ─── BANNERS ──────────────────────────────────────────────────────────────
  banners: defineTable({
    title:           v.string(),
    subtitle:        v.string(),
    desktopImageUrl: v.string(),
    mobileImageUrl:  v.string(),
    ctaText:         v.string(),
    ctaLink:         v.string(),
    active:          v.boolean(),
    sortOrder:       v.number(),
    createdAt:       v.number(),
  })
    .index("by_active_and_sortOrder", ["active", "sortOrder"]),

  boutiqueApplications: defineTable({
    userId:           v.id("users"),
    boutiqueName:     v.string(),
    ownerName:        v.string(),
    email:            v.string(),
    phone:            v.string(),
    address:          v.string(),
    latitude:         v.number(),
    longitude:        v.number(),
    deliveryRadiusKm: v.number(),
    description:      v.string(),
    city:             v.optional(v.string()),
    openingTime:      v.optional(v.string()),
    closingTime:      v.optional(v.string()),
    operatingDays:    v.optional(v.array(v.number())),
    dailyOrderLimit:  v.optional(v.number()),
    isOrderable:      v.optional(v.boolean()),
    state:            v.optional(v.string()),
    pincode:          v.optional(v.string()),
    status:           v.union(v.literal("PENDING"), v.literal("APPROVED"), v.literal("REJECTED")),
    rejectionReason:  v.optional(v.string()),
    approvedAt:       v.optional(v.number()),
    approvedBy:       v.optional(v.id("users")),
    merchantType:      v.optional(
                         v.union(
                           v.literal("women_fashion"),
                           v.literal("mens_fashion"),
                           v.literal("footwear"),
                           v.literal("handbags"),
                           v.literal("fragrance"),
                           v.literal("jewellery"),
                           v.literal("multi_brand")
                         )
                       ),
    storeCategory:     v.optional(
                         v.union(
                           v.literal("women_fashion"),
                           v.literal("mens_fashion"),
                           v.literal("footwear"),
                           v.literal("bags"),
                           v.literal("jewellery"),
                           v.literal("multi_category")
                         )
                       ),
    sellerModel:       v.optional(
                         v.union(
                           v.literal("boutique"),
                           v.literal("brand"),
                           v.literal("multi_brand_store")
                         )
                       ),
    area:              v.optional(v.string()),
    searchKeywords:    v.optional(v.array(v.string())),
    serviceType:       v.optional(
                         v.union(
                           v.literal("ready_to_ship"),
                           v.literal("made_to_order"),
                           v.literal("alterations"),
                           v.literal("custom_design")
                         )
                       ),
    createdAt:        v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  identityLinks: defineTable({
    oldUserId: v.id("users"),
    newUserId: v.id("users"),
    clerkId:   v.string(),
    linkedBy:  v.string(),                         // "webhook" | "manual" | "migration"
    linkedAt:  v.number(),
    reason:    v.string(),
  })
    .index("by_oldUserId", ["oldUserId"])
    .index("by_newUserId", ["newUserId"]),

  boutiqueDocumentEvents: defineTable({
    documentId:  v.id("boutiqueDocuments"),
    boutiqueId:  v.id("boutiques"),
    action:      v.string(), // "uploaded" | "viewed" | "verified" | "rejected" | "reuploaded"
    actorId:     v.optional(v.id("users")),
    note:        v.optional(v.string()),
    createdAt:   v.number(),
  })
    .index("by_documentId", ["documentId"])
    .index("by_boutiqueId", ["boutiqueId"]),

  commissionLedger: defineTable({
    orderId:           v.id("orders"),
    orderItemId:       v.id("orderItems"),
    productId:         v.id("products"),
    boutiqueId:        v.id("boutiques"),
    priceAtPurchase:   v.number(), // in paise
    quantity:          v.number(),
    commissionRate:    v.number(), // e.g. 10
    commissionAmount:  v.number(), // in paise
    gstAmount:         v.number(), // in paise
    netCommission:     v.number(), // in paise
    commissionVersion: v.string(), // e.g. "v1"
    createdAt:         v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_orderItemId", ["orderItemId"])
    .index("by_boutiqueId", ["boutiqueId"]),

  settlementLedger: defineTable({
    boutiqueId:      v.id("boutiques"),
    orderId:         v.optional(v.id("orders")),
    type:            v.union(v.literal("accrual"), v.literal("refund_deduction"), v.literal("adjustment")),
    source:          v.union(v.literal("order"), v.literal("claim"), v.literal("admin"), v.literal("system")),
    adjustmentType:  v.optional(v.union(
                       v.literal("bonus"),
                       v.literal("penalty"),
                       v.literal("commission_correction"),
                       v.literal("refund_correction"),
                       v.literal("manual_credit"),
                       v.literal("manual_debit")
                     )),
    amount:          v.number(), // paise, negative for deductions
    status:          v.union(v.literal("pending"), v.literal("available")),
    payoutId:        v.optional(v.id("payoutLedger")),
    claimWindowDays: v.optional(v.number()),
    accruedAt:       v.number(),
    settledAt:       v.optional(v.number()),
    createdAt:       v.number(),
    settlementSnapshot: v.optional(v.object({
                          orderValue: v.number(),
                          commissionAmount: v.number(),
                          gstAmount: v.number(),
                          courierCost: v.number(),
                          merchantPayable: v.number(),
                          settledAt: v.number(),
                          courierQuote: v.optional(v.object({
                            // DEPRECATED: Porter-specific, kept for historic data. New records use [equivalent generic field].
                            estimatedPorterCost: v.optional(v.number()),
                            estimatedCourierCost: v.optional(v.number()),
                            distanceKm: v.number(),
                            etaMinutes: v.number(),
                          })),
                        })),
  })
    .index("by_boutiqueId", ["boutiqueId"])
    .index("by_status", ["status"])
    .index("by_payoutId", ["payoutId"])
    .index("by_orderId", ["orderId"]),

  payoutLedger: defineTable({
    payoutNumber:   v.string(), // PAY-YYYYMMDD-XXXX
    boutiqueId:     v.id("boutiques"),
    amount:         v.number(), // paise
    status:         v.union(v.literal("scheduled"), v.literal("processing"), v.literal("success"), v.literal("failed")),
    bankAccount:    v.object({ holderName: v.string(), accountNo: v.string(), ifsc: v.string() }),
    utrReference:   v.optional(v.string()),
    payoutSnapshot: v.object({
                      availableBalance: v.number(),
                      orderCount: v.number(),
                      settlementIds: v.array(v.id("settlementLedger")),
                      generatedAt: v.number()
                    }),
    paidAt:         v.optional(v.number()),
    createdAt:      v.number(),
  })
    .index("by_boutiqueId", ["boutiqueId"])
    .index("by_status", ["status"]),

  refundLedger: defineTable({
    refundNumber:     v.string(), // REF-YYYYMMDD-XXXX
    orderId:          v.id("orders"),
    claimId:          v.optional(v.id("claims")),
    amount:           v.number(), // paise
    status:           v.union(v.literal("initiated"), v.literal("processed"), v.literal("failed")),
    refundType:       v.union(
                        v.literal("full_refund"),
                        v.literal("partial_refund"),
                        v.literal("shipping_refund"),
                        v.literal("goodwill_refund")
                      ),
    razorpayRefundId: v.optional(v.string()),
    notes:            v.string(),
    createdAt:        v.number(),
  })
    .index("by_orderId", ["orderId"]),

  systemAlerts: defineTable({
    code: v.union(
      v.literal("claim.transition_failed"),
      v.literal("shipment.transition_failed"),
      v.literal("payout.blocked"),
      v.literal("settlement.frozen"),
      v.literal("inventory.restore_blocked"),
      v.literal("cron.failed"),
      v.literal("finance.reconciliation_failed"),
      v.literal("finance.settlement_missing")
    ),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    message: v.string(),
    details: v.optional(v.string()), // JSON stringified details
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_resolved", ["resolved"])
    .index("by_code", ["code"]),

  cronRuns: defineTable({
    cronName: v.union(
      v.literal("settlement_cron"),
      v.literal("performance_recalc"),
      v.literal("reconciliation_scan")
    ),
    startedAt: v.number(),
    finishedAt: v.number(),
    durationMs: v.number(),
    status: v.union(v.literal("running"), v.literal("success"), v.literal("failed")),
    metrics: v.object({
      ordersReleased: v.optional(v.number()),
      failures: v.optional(v.number()),
      merchantsUpdated: v.optional(v.number()),
      exceptionsFound: v.optional(v.number()),
    }),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_cronName_createdAt", ["cronName", "createdAt"]),

  marketplaceHealthSnapshots: defineTable({
    score: v.number(),
    claimsRate: v.number(),
    rtoRate: v.number(),
    slaRate: v.number(),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"]),

  adminRoleProposals: defineTable({
    targetUserId: v.id("users"),
    requestedRole: v.union(v.literal("customer"), v.literal("boutique_owner"), v.literal("admin")),
    proposedBy: v.id("users"),
    proposedAt: v.number(),
    expiresAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_targetUserId", ["targetUserId"])
    .index("by_status", ["status"]),

  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  })
    .index("by_key", ["key"]),

  refundQueue: defineTable({
    paymentId:   v.id("payments"),
    orderId:     v.optional(v.id("orders")),
    reason:      v.string(),
    amountPaise: v.number(),
    status:      v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    idempotencyKey: v.optional(v.string()),
    lastError:   v.optional(v.string()),
    createdAt:   v.number(),
    processedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_idempotencyKey", ["idempotencyKey"]),

  notificationEvents: defineTable({
    userId:      v.id("users"),
    channel:     v.union(v.literal("email"), v.literal("sms"), v.literal("whatsapp"), v.literal("push")),
    template:    v.string(),
    status:      v.union(v.literal("queued"), v.literal("sent"), v.literal("failed")),
    entityType:  v.string(),
    entityId:    v.string(),
    payload:     v.optional(v.string()),
    sentAt:      v.optional(v.number()),
    createdAt:   v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_entity_template", ["entityType", "entityId", "template"]),

  notificationLogs: defineTable({
    channel: v.union(v.literal("email"), v.literal("whatsapp")),
    template: v.string(),
    recipient: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    response: v.optional(v.string()),
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
  })
    .index("by_recipient", ["recipient"])
    .index("by_status", ["status"]),

  orderEscalations: defineTable({
    orderId:             v.id("orders"),
    level:               v.number(), // 1 = 15m, 2 = 30m, 3 = 45m, 4 = 60m
    notificationEventId: v.optional(v.id("notificationEvents")),
    createdAt:           v.number(), // epoch ms
  })
    .index("by_orderId", ["orderId"])
    .index("by_orderId_level", ["orderId", "level"]),

  productPerformance: defineTable({
    productId:          v.id("products"),
    boutiqueId:         v.id("boutiques"),
    salesRevenue:       v.number(), // in paise
    orderCount:         v.number(), // quantity
    claimCount:         v.number(), // submitted
    approvedClaimCount: v.number(), // approved
    lastSoldAt:         v.optional(v.number()),
    updatedAt:          v.number(),
  })
    .index("by_productId", ["productId"])
    .index("by_boutiqueId", ["boutiqueId"])
    .index("by_salesRevenue", ["salesRevenue"]),

  cachedRoadDistances: defineTable({
    startLat: v.number(),
    startLng: v.number(),
    endLat: v.number(),
    endLng: v.number(),
    distanceKm: v.number(),
    durationMin: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_start_end", ["startLat", "startLng", "endLat", "endLng"])
    .index("by_expiresAt", ["expiresAt"]),

  deliverySubsidyLedger: defineTable({
    orderId:            v.id("orders"),
    cartSubtotal:       v.number(), // in paise
    customerPaidFee:    v.number(), // in paise
    // DEPRECATED: Porter-specific, kept for historic data. New records use [equivalent generic field].
    estimatedPorterCost:v.optional(v.number()), // in paise
    estimatedCourierCost:v.optional(v.number()), // in paise
    // DEPRECATED: Porter-specific, kept for historic data. New records use [equivalent generic field].
    actualPorterCost:   v.optional(v.number()), // in paise
    actualCourierCost:  v.optional(v.number()), // in paise
    subsidyAmount:      v.number(), // in paise
    subsidyPercent:     v.number(),
    gatewayFee:         v.number(), // in paise
    refundAmount:       v.number(), // in paise
    createdAt:          v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_createdAt", ["createdAt"]),

  deliveryPerformanceLedger: defineTable({
    orderId:             v.id("orders"),
    estimatedDistance:   v.number(),
    actualDistance:      v.number(),
    estimatedEta:        v.number(),
    actualEta:           v.number(),
    estimatedCost:       v.number(),
    actualCost:          v.number(),
    deliveredOnTime:     v.boolean(),
    delayResponsibility: v.union(
                           v.literal("boutique"),
                           v.literal("courier"),
                           v.literal("customer"),
                           v.literal("system"),
                           v.literal("none")
                         ),
    createdAt:           v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_createdAt", ["createdAt"]),

  systemConfig: defineTable({
    key: v.string(), // "maintenanceMode" | "ordersEnabled" | "checkoutEnabled" | "paymentsEnabled"
    value: v.boolean(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.id("users")),
  })
    .index("by_key", ["key"]),

  // ─── FIT FEEDBACK ────────────────────────────────────────────────────────
  fitFeedback: defineTable({
    orderId:       v.id("orders"),
    orderItemId:   v.id("orderItems"),
    productId:     v.id("products"),
    boutiqueId:    v.id("boutiques"),
    categoryId:    v.id("categories"),              // denormalized for category-level aggregation
    customerId:    v.id("users"),
    sizePurchased: v.string(),                       // "M", "L", "XL", etc.
    fitResponse:   v.union(
                     v.literal("too_small"),
                     v.literal("perfect_fit"),
                     v.literal("too_large")
                   ),
    createdAt:     v.number(),
  })
    .index("by_productId",              ["productId"])
    .index("by_boutiqueId",             ["boutiqueId"])
    .index("by_orderId",                ["orderId"])
    .index("by_customerId",             ["customerId"])
    .index("by_orderItemId",            ["orderItemId"])
    .index("by_boutiqueId_categoryId",  ["boutiqueId", "categoryId"]),

});
