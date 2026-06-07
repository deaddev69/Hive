// convex/schema.ts
// Hive by TailorBee — Complete Convex Schema (21 tables)
// Generated from: HIVE_CONVEX_DATA_MODEL.md v1.0 · June 2026

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ─── IDENTITY & AUTH ──────────────────────────────────────────────────────
  users: defineTable({
    clerkId:         v.string(),
    email:           v.optional(v.string()),
    phone:           v.optional(v.string()),       // E.164 format e.g. +919876543210
    role:            v.union(
                       v.literal("customer"),
                       v.literal("boutique_owner"),
                       v.literal("admin")
                     ),
    isActive:        v.boolean(),
    isPhoneVerified: v.boolean(),
    createdAt:       v.number(),                   // epoch ms
    updatedAt:       v.number(),
  })
    .index("by_clerkId",  ["clerkId"])
    .index("by_phone",    ["phone"])
    .index("by_email",    ["email"])
    .index("by_role",     ["role"]),

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
    userId:    v.id("users"),
    label:     v.string(),                          // "Home" | "Work" | custom
    line1:     v.string(),
    line2:     v.optional(v.string()),
    city:      v.string(),
    state:     v.string(),
    pincode:   v.string(),
    lat:       v.number(),
    lng:       v.number(),
    regionId:  v.optional(v.id("regions")),         // resolved at save time; null = not serviceable
    isDefault: v.boolean(),
    isDeleted: v.boolean(),                         // soft delete
    createdAt: v.number(),
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
    deliveryRadiusKm: v.number(),
    description:      v.string(),
    status:           v.string(), // PENDING, APPROVED, REJECTED, SUSPENDED
    createdAt:        v.number(),

    // Legacy fields (made optional to prevent compilation failures in existing code)
    userId:           v.optional(v.id("users")),
    name:             v.optional(v.string()),
    slug:             v.optional(v.string()),
    logoUrl:          v.optional(v.string()),
    bannerUrl:        v.optional(v.string()),
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
    gstNumber:        v.optional(v.string()),
    hiveScore:        v.optional(v.number()),
    totalSales:       v.optional(v.number()),
    totalOrders:      v.optional(v.number()),
    approvedAt:       v.optional(v.number()),
    approvedBy:       v.optional(v.id("users")),
    rejectionReason:  v.optional(v.string()),
    updatedAt:        v.optional(v.number()),
  })
    .index("by_slug",      ["slug"])
    .index("by_userId",    ["userId"])
    .index("by_status",    ["status"])
    .index("by_regionIds", ["regionIds"]),

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
    boutiqueId:   v.id("boutiques"),
    name:         v.string(),
    slug:         v.string(),
    description:  v.optional(v.string()),
    category:     v.string(),                       // "Saree" | "Kurti" | "Co-ord" ...
    occasionIds:  v.array(v.id("occasions")),
    priceMin:     v.number(),                       // paise (lowest variant)
    priceMax:     v.number(),                       // paise (highest variant)
    measurementMatrix: v.optional(v.object({
      XS:  v.optional(v.object({ bust: v.optional(v.string()), waist: v.optional(v.string()), hip: v.optional(v.string()), length: v.optional(v.string()) })),
      S:   v.optional(v.object({ bust: v.optional(v.string()), waist: v.optional(v.string()), hip: v.optional(v.string()), length: v.optional(v.string()) })),
      M:   v.optional(v.object({ bust: v.optional(v.string()), waist: v.optional(v.string()), hip: v.optional(v.string()), length: v.optional(v.string()) })),
      L:   v.optional(v.object({ bust: v.optional(v.string()), waist: v.optional(v.string()), hip: v.optional(v.string()), length: v.optional(v.string()) })),
      XL:  v.optional(v.object({ bust: v.optional(v.string()), waist: v.optional(v.string()), hip: v.optional(v.string()), length: v.optional(v.string()) })),
      XXL: v.optional(v.object({ bust: v.optional(v.string()), waist: v.optional(v.string()), hip: v.optional(v.string()), length: v.optional(v.string()) })),
      Free:v.optional(v.object({ bust: v.optional(v.string()), waist: v.optional(v.string()), hip: v.optional(v.string()), length: v.optional(v.string()) })),
    })),
    careInstructions: v.optional(v.string()),
    fabricDetails:    v.optional(v.string()),
    tags:             v.array(v.string()),
    status:           v.union(
                        v.literal("draft"),
                        v.literal("pending_review"),
                        v.literal("approved"),
                        v.literal("rejected"),
                        v.literal("archived")
                      ),
    rejectionReason:  v.optional(v.string()),
    isActive:         v.boolean(),
    viewCount:        v.number(),
    orderCount:       v.number(),
    approvedAt:       v.optional(v.number()),
    approvedBy:       v.optional(v.id("users")),
    createdAt:        v.number(),
    updatedAt:        v.number(),
  })
    .index("by_boutiqueId",        ["boutiqueId"])
    .index("by_slug",              ["slug"])
    .index("by_status",            ["status"])
    .index("by_category",          ["category"])
    .index("by_occasionIds",       ["occasionIds"])
    .index("by_boutiqueId_status", ["boutiqueId", "status"])
    .index("by_isActive_status",   ["isActive", "status"]),

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

  // ─── ORDERS ───────────────────────────────────────────────────────────────
  orders: defineTable({
    orderNumber:          v.string(),               // "HV-20260601-0042"
    customerId:           v.id("users"),
    boutiqueId:           v.id("boutiques"),
    status:               v.union(
                            v.literal("pending_payment"),
                            v.literal("pending_confirmation"),
                            v.literal("confirmed"),
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
                            v.literal("refunded")
                          ),
    // Snapshot of delivery address at order time (immutable)
    deliveryAddress: v.object({
      label:   v.string(),
      line1:   v.string(),
      line2:   v.optional(v.string()),
      city:    v.string(),
      state:   v.string(),
      pincode: v.string(),
      lat:     v.number(),
      lng:     v.number(),
    }),
    addressId:            v.id("addresses"),        // reference preserved for profile
    deliverySlotId:       v.optional(v.id("deliverySlots")),
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
    shipmentId:           v.optional(v.id("shipments")),
    notes:                v.optional(v.string()),
    cancelledAt:          v.optional(v.number()),
    cancelReason:         v.optional(v.string()),
    cancelledBy:          v.optional(v.id("users")),
    confirmedAt:          v.optional(v.number()),
    deliveredAt:          v.optional(v.number()),
    claimWindowExpiresAt: v.optional(v.number()),   // deliveredAt + 48h
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
    .index("by_createdAt",         ["createdAt"]),

  // ─── ORDER ITEMS ──────────────────────────────────────────────────────────
  orderItems: defineTable({
    orderId:         v.id("orders"),
    productId:       v.id("products"),
    variantId:       v.id("productVariants"),
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

  // ─── SHIPMENTS ────────────────────────────────────────────────────────────
  shipments: defineTable({
    orderId:            v.id("orders"),
    provider:           v.string(),                 // "delhivery" | "shiprocket"
    awbNumber:          v.string(),
    providerShipmentId: v.optional(v.string()),
    status:             v.union(
                          v.literal("created"),
                          v.literal("pickup_scheduled"),
                          v.literal("picked_up"),
                          v.literal("in_transit"),
                          v.literal("out_for_delivery"),
                          v.literal("delivered"),
                          v.literal("failed"),
                          v.literal("returned")
                        ),
    trackingUrl:        v.optional(v.string()),
    labelUrl:           v.optional(v.string()),
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
    lastWebhookAt:      v.optional(v.number()),
    rawWebhookEvents:   v.array(v.object({          // append-only log
      timestamp:   v.number(),
      status:      v.string(),
      location:    v.optional(v.string()),
      remarks:     v.optional(v.string()),
      rawPayload:  v.optional(v.string()),          // JSON stringified
    })),
    createdAt:          v.number(),
    updatedAt:          v.number(),
  })
    .index("by_orderId",   ["orderId"])
    .index("by_awbNumber", ["awbNumber"])
    .index("by_status",    ["status"]),

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────
  payments: defineTable({
    orderId:            v.id("orders"),
    customerId:         v.id("users"),
    razorpayOrderId:    v.string(),
    razorpayPaymentId:  v.optional(v.string()),
    amount:             v.number(),                 // paise
    currency:           v.string(),                 // "INR"
    status:             v.union(
                          v.literal("created"),
                          v.literal("pending"),
                          v.literal("captured"),
                          v.literal("failed"),
                          v.literal("refunded"),
                          v.literal("partially_refunded")
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
                       v.literal("approved"),
                       v.literal("rejected"),
                       v.literal("replacement_initiated"),
                       v.literal("replacement_approved"),
                       v.literal("replacement_dispatched"),
                       v.literal("replacement_delivered"),
                       v.literal("refund_requested"),
                       v.literal("refund_approved"),
                       v.literal("refunded"),
                       v.literal("closed")
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
    createdAt:       v.number(),
    updatedAt:       v.number(),
  })
    .index("by_claimNumber",       ["claimNumber"])
    .index("by_orderId",           ["orderId"])
    .index("by_customerId",        ["customerId"])
    .index("by_boutiqueId",        ["boutiqueId"])
    .index("by_status",            ["status"])
    .index("by_customerId_status", ["customerId", "status"]),

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
    source:      v.union(v.literal("razorpay"), v.literal("logistics")),
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
    name:      v.string(),
    slug:      v.string(),
    imageUrl:  v.string(),
    active:    v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_active_and_sortOrder", ["active", "sortOrder"]),

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

});
