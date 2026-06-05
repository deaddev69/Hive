# Hive by TailorBee — Complete Convex Data Model
### Lead Database Architect Document · v1.0 · June 2026
### Stack: Next.js · TypeScript · Convex · Clerk · Cloudinary · Razorpay

---

## Table of Contents

1. [Convex Schema Structure](#1-convex-schema-structure)
2. [Collection Definitions](#2-collection-definitions)
3. [Relationship Diagram](#3-relationship-diagram)
4. [State Transition Definitions](#4-state-transition-definitions)
5. [Data Integrity Rules](#5-data-integrity-rules)
6. [Collection-Level Permission Rules](#6-collection-level-permission-rules)
7. [MVP vs Future Collections](#7-mvp-vs-future-collections)

---

## 1. Convex Schema Structure

The complete `convex/schema.ts` file. All 21 collections defined using `defineSchema` + `defineTable` with Convex's `v` validator DSL.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  // ─── IDENTITY & AUTH ──────────────────────────────────────────────────────
  users: defineTable({
    clerkId:         v.string(),
    email:           v.optional(v.string()),
    phone:           v.optional(v.string()),       // E.164 format
    role:            v.union(
                       v.literal("customer"),
                       v.literal("boutique_owner"),
                       v.literal("admin")
                     ),
    isActive:        v.boolean(),
    isPhoneVerified: v.boolean(),
    createdAt:       v.number(),
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
    regionId:  v.optional(v.id("regions")),         // resolved at save time
    isDefault: v.boolean(),
    isDeleted: v.boolean(),
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
    userId:         v.id("users"),
    name:           v.string(),
    slug:           v.string(),
    description:    v.optional(v.string()),
    logoUrl:        v.optional(v.string()),
    bannerUrl:      v.optional(v.string()),
    phoneNumber:    v.string(),
    email:          v.string(),
    address: v.object({
      line1:   v.string(),
      line2:   v.optional(v.string()),
      city:    v.string(),
      state:   v.string(),
      pincode: v.string(),
      lat:     v.number(),
      lng:     v.number(),
    }),
    regionIds:      v.array(v.id("regions")),
    status:         v.union(
                      v.literal("pending"),
                      v.literal("approved"),
                      v.literal("suspended"),
                      v.literal("rejected")
                    ),
    commissionRate: v.number(),                     // percentage, e.g. 15
    gstNumber:      v.optional(v.string()),
    hiveScore:      v.number(),
    totalSales:     v.number(),                     // paise, denormalised
    totalOrders:    v.number(),
    approvedAt:     v.optional(v.number()),
    approvedBy:     v.optional(v.id("users")),
    rejectionReason: v.optional(v.string()),
    createdAt:      v.number(),
    updatedAt:      v.number(),
  })
    .index("by_slug",     ["slug"])
    .index("by_userId",   ["userId"])
    .index("by_status",   ["status"])
    .index("by_regionIds",["regionIds"]),

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
    .index("by_slug",     ["slug"])
    .index("by_isActive", ["isActive"])
    .index("by_sortOrder",["sortOrder"]),

  // ─── PRODUCTS ─────────────────────────────────────────────────────────────
  products: defineTable({
    boutiqueId:   v.id("boutiques"),
    name:         v.string(),
    slug:         v.string(),
    description:  v.optional(v.string()),
    category:     v.string(),                       // "Saree" | "Kurti" | ...
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
    .index("by_productId",          ["productId"])
    .index("by_productId_isPrimary",["productId", "isPrimary"])
    .index("by_boutiqueId",         ["boutiqueId"]),

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
    .index("by_productId", ["productId"])
    .index("by_boutiqueId",["boutiqueId"]),

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
    compareAtPrice: v.optional(v.number()),         // MRP paise
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
    quantityAvailable: v.number(),                  // total - reserved
    lowStockThreshold: v.number(),                  // alert below this (default 2)
    lastUpdatedBy:     v.optional(v.id("users")),
    updatedAt:         v.number(),
  })
    .index("by_variantId",           ["variantId"])  // effectively unique 1:1
    .index("by_productId",           ["productId"])
    .index("by_boutiqueId",          ["boutiqueId"])
    .index("by_boutiqueId_available",["boutiqueId", "quantityAvailable"]),

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
    priceAtPurchase: v.number(),                    // paise, locked forever
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
    .index("by_regionId_date",  ["regionId", "date"])
    .index("by_date",           ["date"])
    .index("by_regionId_active",["regionId", "isActive"]),

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
    // Address snapshots (immutable):
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
    .index("by_orderId",           ["orderId"])
    .index("by_customerId",        ["customerId"])
    .index("by_razorpayOrderId",   ["razorpayOrderId"])
    .index("by_razorpayPaymentId", ["razorpayPaymentId"])
    .index("by_status",            ["status"]),

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
    windowExpiresAt: v.number(),                    // submittedAt + 48h from delivery
    createdAt:       v.number(),
    updatedAt:       v.number(),
  })
    .index("by_claimNumber",  ["claimNumber"])
    .index("by_orderId",      ["orderId"])
    .index("by_customerId",   ["customerId"])
    .index("by_boutiqueId",   ["boutiqueId"])
    .index("by_status",       ["status"])
    .index("by_customerId_status", ["customerId", "status"]),

  // ─── CLAIM EVIDENCE ───────────────────────────────────────────────────────
  claimEvidence: defineTable({
    claimId:            v.id("claims"),
    customerId:         v.id("users"),
    type:               v.union(
                          v.literal("unboxing_video"),    // mandatory primary
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
    .index("by_claimId",   ["claimId"])
    .index("by_customerId",["customerId"]),

  // ─── REVIEWS ──────────────────────────────────────────────────────────────
  reviews: defineTable({
    productId:         v.id("products"),
    boutiqueId:        v.id("boutiques"),
    customerId:        v.id("users"),
    orderId:           v.id("orders"),
    orderItemId:       v.id("orderItems"),
    rating:            v.number(),                  // 1–5 integer
    reviewText:        v.optional(v.string()),
    isVerifiedPurchase: v.boolean(),                // always true (enforced)
    isFlagged:         v.boolean(),
    isPublished:       v.boolean(),
    flagReason:        v.optional(v.string()),
    moderatedBy:       v.optional(v.id("users")),
    moderatedAt:       v.optional(v.number()),
    createdAt:         v.number(),
    updatedAt:         v.number(),
  })
    .index("by_productId",         ["productId"])
    .index("by_boutiqueId",        ["boutiqueId"])
    .index("by_customerId",        ["customerId"])
    .index("by_orderId",           ["orderId"])
    .index("by_productId_published",["productId", "isPublished"]),

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
    .index("by_actorId",               ["actorId"])
    .index("by_entityType_entityId",   ["entityType", "entityId"])
    .index("by_action",                ["action"])
    .index("by_createdAt",             ["createdAt"]),

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
    .index("by_source_eventId",["source", "eventId"]) // unique check
    .index("by_status",        ["status"]),

});
```

---

## 2. Collection Definitions

Detailed field-by-field reference for every collection.

---

### 2.1 `users`

**Purpose:** Master identity record. Created/updated on first Clerk login via `syncClerkUser` mutation.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"users">` | No | Auto PK |
| `_creationTime` | `number` | No | Auto epoch ms |
| `clerkId` | `string` | No | Clerk subject ID — unique |
| `email` | `string` | Yes | Optional (phone-only users) |
| `phone` | `string` | Yes | E.164 format, e.g. `+919876543210` |
| `role` | `"customer" \| "boutique_owner" \| "admin"` | No | Server-authoritative |
| `isActive` | `boolean` | No | Soft disable without deleting |
| `isPhoneVerified` | `boolean` | No | Set by Clerk webhook |
| `createdAt` | `number` | No | Epoch ms |
| `updatedAt` | `number` | No | Epoch ms |

**Indexes:** `by_clerkId` · `by_phone` · `by_email` · `by_role`

**Relationships:**
- 1:1 → `customerProfiles` (for role=customer)
- 1:1 → `boutiques` (for role=boutique_owner)
- 1:N → `addresses`
- 1:N → `orders` (as customer)
- 1:N → `notifications`

---

### 2.2 `customerProfiles`

**Purpose:** Extended profile data for customers. Separated from `users` to keep auth record lean.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"customerProfiles">` | No | Auto PK |
| `userId` | `Id<"users">` | No | FK — 1:1 |
| `displayName` | `string` | No | |
| `avatarUrl` | `string` | Yes | Cloudinary CDN URL |
| `defaultAddressId` | `Id<"addresses">` | Yes | |
| `regionId` | `Id<"regions">` | Yes | Last resolved delivery region |
| `hiveScore` | `number` | No | 0–100, recomputed async |
| `totalOrders` | `number` | No | Denormalised counter |
| `totalClaimsSubmitted` | `number` | No | Fraud heuristic signal |
| `updatedAt` | `number` | No | |

**Indexes:** `by_userId`

---

### 2.3 `addresses`

**Purpose:** Customer saved delivery addresses. Resolved to a region at save time.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"addresses">` | No | Auto PK |
| `userId` | `Id<"users">` | No | FK |
| `label` | `string` | No | "Home", "Work", or custom |
| `line1` | `string` | No | |
| `line2` | `string` | Yes | Apartment, floor |
| `city` | `string` | No | |
| `state` | `string` | No | |
| `pincode` | `string` | No | 6-digit Indian PIN |
| `lat` | `number` | No | WGS84 |
| `lng` | `number` | No | WGS84 |
| `regionId` | `Id<"regions">` | Yes | Null = not serviceable |
| `isDefault` | `boolean` | No | |
| `isDeleted` | `boolean` | No | Soft delete |
| `createdAt` | `number` | No | |

**Indexes:** `by_userId` · `by_userId_default`

---

### 2.4 `regions`

**Purpose:** Defines serviceable delivery areas. The core of the serviceability module.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"regions">` | No | Auto PK |
| `name` | `string` | No | "Banjara Hills" |
| `city` | `string` | No | "Hyderabad" |
| `pincodes` | `string[]` | No | All serviceable pincodes |
| `polygonGeoJson` | `string` | Yes | GeoJSON boundary for map display |
| `isActive` | `boolean` | No | Disable without deleting |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_city` · `by_isActive`

---

### 2.5 `boutiques`

**Purpose:** Boutique partner record. Created on registration, approved by admin before going live.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"boutiques">` | No | Auto PK |
| `userId` | `Id<"users">` | No | Owner FK |
| `name` | `string` | No | |
| `slug` | `string` | No | Unique URL slug |
| `description` | `string` | Yes | |
| `logoUrl` | `string` | Yes | Cloudinary |
| `bannerUrl` | `string` | Yes | Cloudinary |
| `phoneNumber` | `string` | No | Business contact |
| `email` | `string` | No | Business email |
| `address` | `object` | No | Embedded pickup address |
| `regionIds` | `Id<"regions">[]` | No | Regions boutique serves |
| `status` | `"pending"\|"approved"\|"suspended"\|"rejected"` | No | |
| `commissionRate` | `number` | No | Default 15 (%) |
| `gstNumber` | `string` | Yes | |
| `hiveScore` | `number` | No | 0–100 |
| `totalSales` | `number` | No | Paise, denormalised |
| `totalOrders` | `number` | No | Denormalised |
| `approvedAt` | `number` | Yes | |
| `approvedBy` | `Id<"users">` | Yes | Admin FK |
| `rejectionReason` | `string` | Yes | |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_slug` · `by_userId` · `by_status` · `by_regionIds`

---

### 2.6 `boutiqueDocuments`

**Purpose:** Verification documents for boutique onboarding. Stored in private Cloudinary folder.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"boutiqueDocuments">` | No | Auto PK |
| `boutiqueId` | `Id<"boutiques">` | No | FK |
| `type` | `"gst_certificate"\|"pan"\|"trade_license"\|"bank_proof"\|"other"` | No | |
| `url` | `string` | No | Cloudinary private URL |
| `publicId` | `string` | No | Cloudinary public ID |
| `status` | `"pending"\|"verified"\|"rejected"` | No | |
| `verifiedBy` | `Id<"users">` | Yes | Admin FK |
| `verifiedAt` | `number` | Yes | |
| `notes` | `string` | Yes | Admin review notes |
| `createdAt` | `number` | No | |

**Indexes:** `by_boutiqueId` · `by_boutiqueId_type` · `by_status`

---

### 2.7 `occasions`

**Purpose:** Admin-managed occasion taxonomy (Wedding, Casual, Festive, etc.). Products map to one or more.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"occasions">` | No | Auto PK |
| `name` | `string` | No | Display name |
| `slug` | `string` | No | URL slug — unique |
| `description` | `string` | Yes | |
| `iconUrl` | `string` | Yes | Cloudinary icon |
| `bannerUrl` | `string` | Yes | Cloudinary hero banner |
| `sortOrder` | `number` | No | Display order on home page |
| `isActive` | `boolean` | No | |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_slug` · `by_isActive` · `by_sortOrder`

---

### 2.8 `products`

**Purpose:** Core catalog entity. One product per boutique listing. Variants hold size/color options.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"products">` | No | Auto PK |
| `boutiqueId` | `Id<"boutiques">` | No | FK |
| `name` | `string` | No | |
| `slug` | `string` | No | URL slug — unique |
| `description` | `string` | Yes | |
| `category` | `string` | No | "Saree"\|"Kurti"\|"Co-ord"\|"Dress"\|... |
| `occasionIds` | `Id<"occasions">[]` | No | Min 1 required |
| `priceMin` | `number` | No | Paise — lowest active variant |
| `priceMax` | `number` | No | Paise — highest active variant |
| `measurementMatrix` | `object` | Yes | Per-size bust/waist/hip/length |
| `careInstructions` | `string` | Yes | |
| `fabricDetails` | `string` | Yes | |
| `tags` | `string[]` | No | Search keywords |
| `status` | `"draft"\|"pending_review"\|"approved"\|"rejected"\|"archived"` | No | |
| `rejectionReason` | `string` | Yes | Admin-set |
| `isActive` | `boolean` | No | Boutique soft-toggle |
| `viewCount` | `number` | No | Denormalised |
| `orderCount` | `number` | No | Denormalised |
| `approvedAt` | `number` | Yes | |
| `approvedBy` | `Id<"users">` | Yes | Admin FK |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_boutiqueId` · `by_slug` · `by_status` · `by_category` · `by_occasionIds` · `by_boutiqueId_status` · `by_isActive_status`

---

### 2.9 `productImages`

**Purpose:** Product image assets. Multiple per product. Sort order determines display sequence.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"productImages">` | No | Auto PK |
| `productId` | `Id<"products">` | No | FK |
| `boutiqueId` | `Id<"boutiques">` | No | Denormalised |
| `cloudinaryPublicId` | `string` | No | For transforms |
| `url` | `string` | No | CDN delivery URL |
| `altText` | `string` | Yes | Accessibility |
| `sortOrder` | `number` | No | 0 = first |
| `isPrimary` | `boolean` | No | Cover/thumbnail image |
| `createdAt` | `number` | No | |

**Indexes:** `by_productId` · `by_productId_isPrimary` · `by_boutiqueId`

---

### 2.10 `productVideos`

**Purpose:** Product showcase videos. Cloudinary handles adaptive streaming.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"productVideos">` | No | Auto PK |
| `productId` | `Id<"products">` | No | FK |
| `boutiqueId` | `Id<"boutiques">` | No | Denormalised |
| `cloudinaryPublicId` | `string` | No | |
| `url` | `string` | No | HLS/DASH streaming URL |
| `thumbnailUrl` | `string` | Yes | Auto-generated frame |
| `durationSeconds` | `number` | Yes | |
| `sortOrder` | `number` | No | |
| `createdAt` | `number` | No | |

**Indexes:** `by_productId` · `by_boutiqueId`

---

### 2.11 `productVariants`

**Purpose:** Size × color combinations of a product. Each variant has its own price and inventory record.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"productVariants">` | No | Auto PK |
| `productId` | `Id<"products">` | No | FK |
| `boutiqueId` | `Id<"boutiques">` | No | Denormalised |
| `size` | `"XS"\|"S"\|"M"\|"L"\|"XL"\|"XXL"\|"Free"` | No | |
| `color` | `string` | Yes | Nullable for single-color |
| `sku` | `string` | No | Boutique-defined unique SKU |
| `price` | `number` | No | Paise |
| `compareAtPrice` | `number` | Yes | MRP in paise |
| `isActive` | `boolean` | No | Boutique can disable variant |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_productId` · `by_boutiqueId` · `by_sku`

---

### 2.12 `inventory`

**Purpose:** Real-time stock levels per variant. Reservations prevent oversell. One record per variant (1:1).

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"inventory">` | No | Auto PK |
| `variantId` | `Id<"productVariants">` | No | FK — 1:1 |
| `productId` | `Id<"products">` | No | Denormalised |
| `boutiqueId` | `Id<"boutiques">` | No | Denormalised |
| `quantityTotal` | `number` | No | Physical stock |
| `quantityReserved` | `number` | No | Locked by active orders |
| `quantityAvailable` | `number` | No | Computed: total − reserved |
| `lowStockThreshold` | `number` | No | Alert trigger (default 2) |
| `lastUpdatedBy` | `Id<"users">` | Yes | Boutique user |
| `updatedAt` | `number` | No | |

**Indexes:** `by_variantId` · `by_productId` · `by_boutiqueId` · `by_boutiqueId_available`

---

### 2.13 `orders`

**Purpose:** Core transaction entity. Single-boutique per order for MVP. Address snapshotted at creation.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"orders">` | No | Auto PK |
| `orderNumber` | `string` | No | "HV-YYYYMMDD-NNNN" |
| `customerId` | `Id<"users">` | No | FK |
| `boutiqueId` | `Id<"boutiques">` | No | FK |
| `status` | `OrderStatus` enum | No | See §4 state machine |
| `deliveryAddress` | `object` | No | **Immutable snapshot** |
| `addressId` | `Id<"addresses">` | No | Reference preserved |
| `deliverySlotId` | `Id<"deliverySlots">` | Yes | |
| `subtotal` | `number` | No | Paise |
| `deliveryFee` | `number` | No | Paise |
| `discount` | `number` | No | Paise |
| `total` | `number` | No | Paise |
| `commissionAmount` | `number` | No | Paise |
| `paymentId` | `Id<"payments">` | Yes | Set after payment created |
| `paymentStatus` | `"pending"\|"paid"\|"refunded"\|"failed"` | No | |
| `shipmentId` | `Id<"shipments">` | Yes | |
| `notes` | `string` | Yes | Customer delivery notes |
| `cancelledAt` | `number` | Yes | |
| `cancelReason` | `string` | Yes | |
| `cancelledBy` | `Id<"users">` | Yes | |
| `confirmedAt` | `number` | Yes | |
| `deliveredAt` | `number` | Yes | |
| `claimWindowExpiresAt` | `number` | Yes | deliveredAt + 48h |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_orderNumber` · `by_customerId` · `by_boutiqueId` · `by_status` · `by_customerId_status` · `by_boutiqueId_status` · `by_paymentStatus` · `by_createdAt`

---

### 2.14 `orderItems`

**Purpose:** Line items within an order. All product data **snapshotted** — immutable record of what was purchased.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"orderItems">` | No | Auto PK |
| `orderId` | `Id<"orders">` | No | FK |
| `productId` | `Id<"products">` | No | FK (reference only) |
| `variantId` | `Id<"productVariants">` | No | FK (reference only) |
| `boutiqueId` | `Id<"boutiques">` | No | Denormalised |
| `productName` | `string` | No | **Snapshot** |
| `variantSize` | `string` | No | **Snapshot** |
| `variantColor` | `string` | Yes | **Snapshot** |
| `imageUrl` | `string` | No | **Snapshot** |
| `sku` | `string` | No | **Snapshot** |
| `priceAtPurchase` | `number` | No | Paise — **locked forever** |
| `quantity` | `number` | No | |
| `subtotal` | `number` | No | Paise |

**Indexes:** `by_orderId` · `by_productId` · `by_boutiqueId`

---

### 2.15 `deliverySlots`

**Purpose:** Admin-managed time windows for deliveries per region per date.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"deliverySlots">` | No | Auto PK |
| `regionId` | `Id<"regions">` | No | FK |
| `date` | `string` | No | "YYYY-MM-DD" |
| `startTime` | `string` | No | "HH:MM" (24h) |
| `endTime` | `string` | No | "HH:MM" (24h) |
| `capacity` | `number` | No | Max orders |
| `bookedCount` | `number` | No | Incremented on booking |
| `isActive` | `boolean` | No | Admin can disable |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_regionId_date` · `by_date` · `by_regionId_active`

---

### 2.16 `shipments`

**Purpose:** Logistics shipment record. One per order. Webhook events appended chronologically.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"shipments">` | No | Auto PK |
| `orderId` | `Id<"orders">` | No | FK |
| `provider` | `string` | No | "delhivery"\|"shiprocket" |
| `awbNumber` | `string` | No | Tracking ID |
| `providerShipmentId` | `string` | Yes | External ID |
| `status` | `ShipmentStatus` enum | No | |
| `trackingUrl` | `string` | Yes | Provider URL |
| `labelUrl` | `string` | Yes | Printable label |
| `pickupAddress` | `object` | No | **Immutable snapshot** |
| `deliveryAddress` | `object` | No | **Immutable snapshot** |
| `estimatedDelivery` | `number` | Yes | Epoch ms |
| `deliveredAt` | `number` | Yes | |
| `lastWebhookAt` | `number` | Yes | For stale-detection |
| `rawWebhookEvents` | `object[]` | No | Append-only event log |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_orderId` · `by_awbNumber` · `by_status`

---

### 2.17 `payments`

**Purpose:** Razorpay payment record. Created before checkout. Confirmed by webhook.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"payments">` | No | Auto PK |
| `orderId` | `Id<"orders">` | No | FK |
| `customerId` | `Id<"users">` | No | FK |
| `razorpayOrderId` | `string` | No | Created server-side |
| `razorpayPaymentId` | `string` | Yes | Set on capture |
| `amount` | `number` | No | Paise |
| `currency` | `string` | No | "INR" |
| `status` | `PaymentStatus` enum | No | |
| `method` | `string` | Yes | "upi"\|"card"\|... |
| `refundId` | `string` | Yes | Razorpay refund ID |
| `refundAmount` | `number` | Yes | Paise |
| `refundedAt` | `number` | Yes | |
| `webhookEvents` | `object[]` | No | Append-only |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_orderId` · `by_customerId` · `by_razorpayOrderId` · `by_razorpayPaymentId` · `by_status`

---

### 2.18 `claims`

**Purpose:** Post-delivery dispute record. Linked to an order and specific order item.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"claims">` | No | Auto PK |
| `claimNumber` | `string` | No | "CLM-YYYYMMDD-NNNN" |
| `orderId` | `Id<"orders">` | No | FK |
| `orderItemId` | `Id<"orderItems">` | No | FK (item-level) |
| `customerId` | `Id<"users">` | No | FK |
| `boutiqueId` | `Id<"boutiques">` | No | FK |
| `type` | `"damage"\|"wrong_item"\|"missing_item"` | No | |
| `description` | `string` | No | |
| `status` | `ClaimStatus` enum | No | |
| `adminNotes` | `string` | Yes | |
| `reviewedBy` | `Id<"users">` | Yes | Admin FK |
| `reviewedAt` | `number` | Yes | |
| `resolution` | `"replacement"\|"refund"\|"rejected"` | Yes | Set on resolution |
| `replacementOrderId` | `Id<"orders">` | Yes | FK |
| `refundAmount` | `number` | Yes | Paise |
| `submittedAt` | `number` | No | |
| `windowExpiresAt` | `number` | No | Delivery time + 48h |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_claimNumber` · `by_orderId` · `by_customerId` · `by_boutiqueId` · `by_status` · `by_customerId_status`

---

### 2.19 `claimEvidence`

**Purpose:** Evidence files for claims. Primary evidence is the mandatory continuous unboxing video.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"claimEvidence">` | No | Auto PK |
| `claimId` | `Id<"claims">` | No | FK |
| `customerId` | `Id<"users">` | No | FK |
| `type` | `"unboxing_video"\|"damage_photo"\|"wrong_item_photo"\|"packaging_photo"` | No | |
| `cloudinaryPublicId` | `string` | No | |
| `url` | `string` | No | Cloudinary URL |
| `isSigned` | `boolean` | No | Private signed URL |
| `durationSeconds` | `number` | Yes | Video duration |
| `fileSizeBytes` | `number` | Yes | |
| `mimeType` | `string` | Yes | "video/mp4"\|"image/jpeg" |
| `isPrimary` | `boolean` | No | True for unboxing video |
| `uploadedAt` | `number` | No | |
| `createdAt` | `number` | No | |

**Indexes:** `by_claimId` · `by_customerId`

---

### 2.20 `reviews`

**Purpose:** Verified purchase reviews. Only creatable after order is in `delivered` state.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"reviews">` | No | Auto PK |
| `productId` | `Id<"products">` | No | FK |
| `boutiqueId` | `Id<"boutiques">` | No | Denormalised |
| `customerId` | `Id<"users">` | No | FK |
| `orderId` | `Id<"orders">` | No | FK — ensures purchase-verified |
| `orderItemId` | `Id<"orderItems">` | No | FK |
| `rating` | `number` | No | Integer 1–5 |
| `reviewText` | `string` | Yes | |
| `isVerifiedPurchase` | `boolean` | No | Always `true` |
| `isFlagged` | `boolean` | No | Moderation flag |
| `isPublished` | `boolean` | No | Admin approval gate |
| `flagReason` | `string` | Yes | |
| `moderatedBy` | `Id<"users">` | Yes | Admin FK |
| `moderatedAt` | `number` | Yes | |
| `createdAt` | `number` | No | |
| `updatedAt` | `number` | No | |

**Indexes:** `by_productId` · `by_boutiqueId` · `by_customerId` · `by_orderId` · `by_productId_published`

---

### 2.21 `hiveScores`

**Purpose:** Computed reliability score for customers and boutiques. Recalculated by scheduled function.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"hiveScores">` | No | Auto PK |
| `entityType` | `"customer"\|"boutique"` | No | |
| `entityId` | `string` | No | FK to users or boutiques |
| `score` | `number` | No | 0–100 |
| `components.orderCompletionRate` | `number` | Yes | |
| `components.claimRate` | `number` | Yes | |
| `components.responseSlaRate` | `number` | Yes | Boutique only |
| `components.deliverySuccessRate` | `number` | Yes | |
| `components.repeatCustomerRate` | `number` | Yes | Boutique only |
| `components.fraudSignalScore` | `number` | Yes | Customer only |
| `totalOrdersConsidered` | `number` | No | Sample size |
| `calculatedAt` | `number` | No | |
| `version` | `number` | No | Recalculation version |

**Indexes:** `by_entityType_entityId` · `by_entityType_score`

---

### 2.22 `notifications`

**Purpose:** Outbound notification log. Covers WhatsApp, email, and in-app.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"notifications">` | No | Auto PK |
| `userId` | `Id<"users">` | No | Recipient FK |
| `type` | `NotificationType` enum | No | 20 types defined |
| `channel` | `"whatsapp"\|"email"\|"in_app"` | No | |
| `title` | `string` | No | |
| `body` | `string` | No | |
| `data` | `object` | Yes | Deep-link payload |
| `status` | `"pending"\|"sent"\|"failed"` | No | |
| `isRead` | `boolean` | No | In-app only |
| `sentAt` | `number` | Yes | |
| `error` | `string` | Yes | Failure reason |
| `createdAt` | `number` | No | |

**Indexes:** `by_userId` · `by_userId_isRead` · `by_status` · `by_userId_type`

---

### 2.23 `auditLogs`

**Purpose:** Immutable action trail. Every state change written here. Before/after stored as JSON strings.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"auditLogs">` | No | Auto PK |
| `actorId` | `Id<"users">` | Yes | Null for system/cron |
| `actorRole` | `string` | No | Role at action time |
| `action` | `string` | No | "order.confirmed" |
| `entityType` | `string` | No | "order"\|"product"... |
| `entityId` | `string` | No | Target record ID |
| `before` | `string` | Yes | JSON prev state |
| `after` | `string` | Yes | JSON new state |
| `ipAddress` | `string` | Yes | |
| `userAgent` | `string` | Yes | |
| `metadata` | `string` | Yes | Extra context JSON |
| `createdAt` | `number` | No | |

**Indexes:** `by_actorId` · `by_entityType_entityId` · `by_action` · `by_createdAt`

---

### 2.24 `webhookEvents` (Infrastructure)

**Purpose:** Idempotency guard for incoming Razorpay and logistics webhooks.

| Field | Convex Type | Nullable | Notes |
|-------|------------|----------|-------|
| `_id` | `Id<"webhookEvents">` | No | Auto PK |
| `source` | `"razorpay"\|"logistics"` | No | |
| `eventId` | `string` | No | Provider event ID |
| `eventType` | `string` | No | e.g., "payment.captured" |
| `status` | `"received"\|"processed"\|"failed"\|"duplicate"` | No | |
| `payload` | `string` | Yes | Raw JSON |
| `error` | `string` | Yes | |
| `processedAt` | `number` | Yes | |
| `createdAt` | `number` | No | |

**Indexes:** `by_source_eventId` · `by_status`

---

## 3. Relationship Diagram

```
┌─────────────┐       1:1       ┌──────────────────┐
│    users    │ ──────────────► │ customerProfiles │
│             │                 └──────────────────┘
│             │       1:1       ┌──────────────────┐
│             │ ──────────────► │    boutiques     │
│             │                 └───────┬──────────┘
│             │       1:N       ┌───────▼──────────┐
│             │ ──────────────► │   addresses      │
└──────┬──────┘                 └───────┬──────────┘
       │                                │ N:1
       │ 1:N                     ┌──────▼──────────┐
       │                         │    regions      │
       ▼                         └─────────────────┘
┌─────────────┐       1:N       ┌──────────────────┐
│   orders    │ ──────────────► │   orderItems     │
│             │                 └──────────┬───────┘
│             │ 1:1                        │N:1
│             ├──────────────► shipments  │
│             │ 1:1                        ▼
│             ├──────────────► payments  products ──1:N──► productImages
│             │ N:1                        │               productVideos
│             ├──────◄─── boutiques        │
│             │ N:1                        │1:N
│             ├──────◄─── deliverySlots   │
│             │                           ▼
└──────┬──────┘              productVariants ──1:1──► inventory
       │
       │1:N        1:N
       ▼           ▼
┌─────────────┐  ┌──────────────┐
│   claims    │  │   reviews    │
│             │  └──────────────┘
│     │1:N    │
│     ▼       │
│claimEvidence│
└─────────────┘

boutiques ──1:N──► boutiqueDocuments
boutiques ──1:N──► products
          ──M:N──► regions (via regionIds array)

occasions ──M:N──► products (via occasionIds array)

users/boutiques ──1:1──► hiveScores
users           ──1:N──► notifications
users/system    ──1:N──► auditLogs

webhookEvents (standalone — no FK relations)
analyticsEvents (userId optional — anonymous sessions)
```

---

## 4. State Transition Definitions

### 4.1 Order Status (`orders.status`)

| From | To | Trigger | Actor | Conditions |
|------|----|---------|-------|------------|
| — | `pending_payment` | `orders.create` mutation | Customer | Cart validates stock + serviceability |
| `pending_payment` | `pending_confirmation` | Razorpay webhook `payment.captured` | System | HMAC verified, idempotency checked |
| `pending_payment` | `cancelled` | `orders.cancelByCustomer` | Customer | No payment captured |
| `pending_confirmation` | `confirmed` | `orders.confirmByBoutique` | Boutique | Within SLA window |
| `pending_confirmation` | `cancelled` | `orders.rejectByBoutique` | Boutique | Boutique rejects; full refund triggered |
| `pending_confirmation` | `cancelled` | Cron `checkOrderSLA` | System | > 2h no response; full refund triggered |
| `confirmed` | `pickup_scheduled` | `logistics.createShipment` | Admin/System | Shipment created via provider API |
| `pickup_scheduled` | `picked_up` | Logistics webhook `picked_up` | System | AWB matched, signature verified |
| `picked_up` | `in_transit` | Logistics webhook `in_transit` | System | |
| `in_transit` | `out_for_delivery` | Logistics webhook `out_for_delivery` | System | |
| `out_for_delivery` | `delivered` | Logistics webhook `delivered` | System | Sets `deliveredAt`, `claimWindowExpiresAt` |
| `delivered` | `claim_submitted` | `claims.submit` | Customer | Within 48h window, unboxing video uploaded |
| `claim_submitted` | `replacement_requested` | `claims.approve` | Admin | Replacement-first policy |
| `claim_submitted` | `cancelled` | `claims.reject` | Admin | Claim rejected |
| `replacement_requested` | `replacement_approved` | Boutique confirms stock | Boutique | Replacement inventory confirmed |
| `replacement_requested` | `refund_requested` | Boutique marks no stock | Boutique/Admin | No replacement available |
| `replacement_approved` | `replacement_dispatched` | `logistics.createShipment` | System | New shipment created |
| `replacement_dispatched` | `replacement_delivered` | Logistics webhook | System | |
| `refund_requested` | `refunded` | `payments.initiateRefund` + Razorpay | Admin | Razorpay refund processed |
| `confirmed`→`picked_up` | `cancelled` | `orders.cancelByAdmin` | Admin | Pre-pickup; full refund |

**Terminal states:** `cancelled`, `delivered` (no claim), `replacement_delivered`, `refunded`

---

### 4.2 Boutique Status (`boutiques.status`)

| From | To | Trigger | Actor |
|------|----|---------|-------|
| — | `pending` | `boutiques.register` | Boutique owner |
| `pending` | `approved` | `boutiques.approve` | Admin |
| `pending` | `rejected` | `boutiques.reject` | Admin |
| `approved` | `suspended` | `boutiques.suspend` | Admin |
| `suspended` | `approved` | `boutiques.unsuspend` | Admin |
| `rejected` | `pending` | `boutiques.resubmit` | Boutique owner |

---

### 4.3 Product Status (`products.status`)

| From | To | Trigger | Actor |
|------|----|---------|-------|
| — | `draft` | `products.create` | Boutique |
| `draft` | `pending_review` | `products.submitForReview` | Boutique |
| `pending_review` | `approved` | `products.approve` | Admin |
| `pending_review` | `rejected` | `products.reject` | Admin |
| `rejected` | `draft` | Boutique edits product | Boutique |
| `approved` | `archived` | `products.archive` | Boutique/Admin |
| `archived` | `draft` | `products.unarchive` | Boutique |

---

### 4.4 Shipment Status (`shipments.status`)

| From | To | Webhook Event | Notes |
|------|----|--------------|-------|
| — | `created` | (internal, on creation) | AWB assigned |
| `created` | `pickup_scheduled` | provider: `pickup_scheduled` | |
| `pickup_scheduled` | `picked_up` | provider: `picked_up` | |
| `picked_up` | `in_transit` | provider: `in_transit` | |
| `in_transit` | `out_for_delivery` | provider: `out_for_delivery` | |
| `out_for_delivery` | `delivered` | provider: `delivered` | Triggers order delivery flow |
| Any | `failed` | provider: `failed` | Alert admin |
| `failed` | `returned` | provider: `returned` | Return to boutique |

---

### 4.5 Claim Status (`claims.status`)

| From | To | Trigger | Actor |
|------|----|---------|-------|
| — | `submitted` | `claims.submit` | Customer |
| `submitted` | `under_review` | `claims.review` | Admin |
| `under_review` | `approved` | `claims.approve` | Admin |
| `under_review` | `rejected` | `claims.reject` | Admin |
| `approved` | `replacement_initiated` | System (auto) | System |
| `replacement_initiated` | `replacement_approved` | Boutique confirms | Boutique |
| `replacement_initiated` | `refund_requested` | Boutique: no stock | Boutique/Admin |
| `replacement_approved` | `replacement_dispatched` | Shipment created | System |
| `replacement_dispatched` | `replacement_delivered` | Logistics webhook | System |
| `refund_requested` | `refund_approved` | `claims.approveRefund` | Admin |
| `refund_approved` | `refunded` | Razorpay refund webhook | System |
| `replacement_delivered` | `closed` | Auto (cron) | System |
| `refunded` | `closed` | Auto (cron) | System |
| `rejected` | `closed` | Auto (cron) | System |

---

### 4.6 Payment Status (`payments.status`)

| From | To | Trigger |
|------|----|---------|
| — | `created` | `payments.createRazorpayOrder` |
| `created` | `pending` | Customer opens checkout |
| `pending` | `captured` | Razorpay webhook `payment.captured` |
| `pending` | `failed` | Razorpay webhook `payment.failed` |
| `captured` | `refunded` | Razorpay Refund API success |
| `captured` | `partially_refunded` | Partial Razorpay refund |

---

## 5. Data Integrity Rules

### 5.1 Referential Integrity

Convex is a document store — there are no foreign key constraints at the database level. **All referential integrity is enforced in Convex mutation logic.**

| Rule | Enforcement Location |
|------|---------------------|
| `customerProfile.userId` must exist in `users` | `customers.createProfile` mutation |
| `order.customerId` must be `role=customer` | `orders.create` mutation |
| `order.boutiqueId` must be `status=approved` | `orders.create` mutation |
| `product.boutiqueId` must be `status=approved` | `products.create` mutation |
| `inventory` record always exists for each `productVariant` | Created atomically with variant |
| `claim.orderId` must be `status=delivered` | `claims.submit` mutation |
| `claim.orderItemId` must belong to `claim.orderId` | `claims.submit` mutation |
| `review.orderId` order must be `status=delivered` | `reviews.submit` mutation |
| One review per `(customerId, orderItemId)` pair | `reviews.submit` uniqueness check |

---

### 5.2 Inventory Integrity

```
RULE: quantityAvailable = quantityTotal - quantityReserved (always)

On reserveStock():
  - Check quantityAvailable >= requestedQty (atomic in mutation)
  - quantityReserved += requestedQty
  - quantityAvailable -= requestedQty
  - If quantityAvailable < lowStockThreshold → emit low_stock notification

On releaseStock() (cancellation/rejection):
  - quantityReserved -= releasedQty
  - quantityAvailable += releasedQty

On confirmOrder() (boutique confirms):
  - quantityTotal -= confirmedQty
  - quantityReserved -= confirmedQty
  - (quantityAvailable remains same)

On updateStock() (boutique manual update):
  - quantityTotal = newTotal
  - quantityAvailable = newTotal - quantityReserved
  - Cannot set total < quantityReserved (error)
```

---

### 5.3 Order Creation Atomicity

The `orders.create` mutation executes the following in a **single Convex mutation** (ACID):

```
1. Validate customer serviceability (address.regionId !== null)
2. For each item in cart:
   a. Fetch inventory record for variantId
   b. Assert quantityAvailable >= qty
3. Create order document (status: pending_payment)
4. Create orderItems documents (with all snapshots)
5. Book deliverySlot (bookedCount++)
6. Reserve inventory for all items (quantityReserved++)
7. Return orderId

If any step fails → entire transaction rolls back
```

---

### 5.4 Claim Window Enforcement

```
RULE: Claims can only be submitted if:
  1. order.status === "delivered"
  2. now() < order.claimWindowExpiresAt
  3. No existing claim for the same orderItemId

Cron: checkClaimDeadlines (runs every 15 min)
  - Find all DELIVERED orders where claimWindowExpiresAt < now()
  - Mark any lingering submitted claims as "closed" (admin missed window)
  - Update order metadata to note window closed
```

---

### 5.5 Payment Confirmation Guard

```
RULE: order.status can only advance from pending_payment → pending_confirmation
      when triggered by the Razorpay webhook handler.

The client-side success callback (Razorpay's onSuccess) does NOT update order status.
The client-side flow only shows a "pending" screen.

The webhook handler:
  1. Verifies HMAC-SHA256 signature
  2. Checks webhookEvents for duplicate eventId
  3. Updates payment.status = "captured"
  4. Updates order.status = "pending_confirmation"
  5. Sends boutique notification
```

---

### 5.6 Immutable Records

The following fields are **written once and never updated** after order creation:

| Collection | Immutable Fields |
|-----------|-----------------|
| `orderItems` | All fields (entire document) |
| `orders` | `deliveryAddress`, `subtotal`, `total`, `priceAtPurchase` |
| `shipments` | `pickupAddress`, `deliveryAddress`, `rawWebhookEvents` (append-only) |
| `payments` | `amount`, `webhookEvents` (append-only) |
| `claimEvidence` | All fields |
| `auditLogs` | All fields |

---

### 5.7 Denormalised Counter Consistency

Denormalised counters (`totalOrders`, `totalSales`, `viewCount`, `orderCount`, `bookedCount`) are updated within the same mutation that causes the change. They are **eventually consistent** with actual record counts but serve as fast-read values.

| Counter | Updated In |
|---------|-----------|
| `boutiques.totalOrders` | `orders.confirmByBoutique` |
| `boutiques.totalSales` | `orders.confirmByBoutique` |
| `products.orderCount` | `orders.confirmByBoutique` |
| `products.viewCount` | `analytics.track("product_viewed")` |
| `customerProfiles.totalOrders` | `orders.create` |
| `customerProfiles.totalClaimsSubmitted` | `claims.submit` |
| `deliverySlots.bookedCount` | `orders.create` / `orders.cancel` |

---

## 6. Collection-Level Permission Rules

All rules are enforced **inside Convex query/mutation functions** via the helper pattern:

```typescript
// convex/lib/auth.ts (shared helper)
export async function requireRole(ctx: QueryCtx | MutationCtx, role: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", q => q.eq("clerkId", identity.subject))
    .unique();
  if (!user || !user.isActive) throw new ConvexError("Account inactive");
  if (user.role !== role) throw new ConvexError("Unauthorized");
  return user;
}

export async function requireAnyRole(ctx, ...roles) { ... }
export async function requireOwnership(doc, userId) { ... }
```

---

### Permission Table by Collection

| Collection | Read | Create | Update | Delete |
|-----------|------|--------|--------|--------|
| `users` | Own record (any) · All (admin) | System only (syncClerkUser) | Own record (any) · Admin (all) | Admin only (soft-disable) |
| `customerProfiles` | Own (customer) · Admin | System on register | Own (customer) · Admin | Admin (soft) |
| `addresses` | Own (customer) | Own (customer) | Own (customer) | Own (soft-delete) |
| `regions` | Public | Admin | Admin | Admin |
| `boutiques` | Public (approved) · Admin (all) | Any user (creates pending) | Own boutique owner · Admin | Admin (soft-suspend) |
| `boutiqueDocuments` | Own boutique · Admin | Own boutique | Admin (status update) | None |
| `occasions` | Public | Admin | Admin | Admin |
| `products` | Public (approved+active) · Boutique own · Admin all | Own boutique | Own boutique (draft/rejected) · Admin | Own boutique (archive) · Admin |
| `productImages` | Public (if product approved) · Boutique own | Own boutique | Own boutique | Own boutique |
| `productVideos` | Public (if product approved) · Boutique own | Own boutique | Own boutique | Own boutique |
| `productVariants` | Public (if product approved) · Boutique own | Own boutique | Own boutique | Own boutique |
| `inventory` | Own boutique · Admin | System (with variant create) | Own boutique · Admin | None (always exists with variant) |
| `orders` | Own customer · Own boutique · Admin | Customer only | Limited (status by role) | Admin only (soft-cancel) |
| `orderItems` | Via order access | System (with order create) | **Never** | **Never** |
| `deliverySlots` | Customer (active only) · Admin all | Admin | Admin | Admin (soft-disable) |
| `shipments` | Own customer (tracking only) · Boutique (own orders) · Admin | System (logistics.createShipment) | System (webhooks) · Admin | Admin |
| `payments` | Own customer · Admin | System | System (webhooks) · Admin | **Never** |
| `claims` | Own customer · Boutique (own orders) · Admin | Customer (delivered orders, within 48h) | Admin (status/notes) | **Never** |
| `claimEvidence` | Own customer · Admin | Customer (during claim submit) | **Never** | **Never** |
| `reviews` | Public (published) · Own customer | Customer (post-delivery, once per item) | Customer (own, within 7 days) · Admin (publish/flag) | Admin |
| `hiveScores` | Own entity · Admin | System (cron) | System (cron) | System |
| `notifications` | Own user (in-app) · Admin | System | Own user (isRead) · System (status) | **Never** |
| `auditLogs` | Admin only | System only | **Never** | **Never** |
| `analyticsEvents` | Admin only | Any (client event tracking) | **Never** | **Never** |
| `webhookEvents` | Admin only | System (HTTP action) | System | **Never** |

---

### Boutique Scope Rule

Any mutation touching `products`, `productImages`, `productVideos`, `productVariants`, `inventory`, `orders` (update), `claims` (boutique view) must include:

```typescript
// Enforced in every boutique mutation
const boutique = await ctx.db
  .query("boutiques")
  .withIndex("by_userId", q => q.eq("userId", user._id))
  .unique();

if (!boutique || boutique._id !== args.boutiqueId) {
  throw new ConvexError("You do not own this boutique");
}
```

---

## 7. MVP vs Future Collections

### 7.1 MVP Collections (Required at Launch)

All collections below must be implemented before go-live.

| Collection | Priority | Notes |
|-----------|---------|-------|
| `users` | P0 | Core identity |
| `customerProfiles` | P0 | Customer experience |
| `addresses` | P0 | Checkout required |
| `regions` | P0 | Serviceability gate |
| `boutiques` | P0 | Marketplace core |
| `boutiqueDocuments` | P0 | Onboarding verification |
| `occasions` | P0 | Discovery experience |
| `products` | P0 | Catalog core |
| `productImages` | P0 | Product presentation |
| `productVariants` | P0 | Size selection |
| `inventory` | P0 | Stock management |
| `orders` | P0 | Transaction core |
| `orderItems` | P0 | Order detail |
| `deliverySlots` | P0 | Scheduling |
| `shipments` | P0 | Logistics tracking |
| `payments` | P0 | Revenue |
| `claims` | P0 | Policy compliance |
| `claimEvidence` | P0 | Evidence management |
| `notifications` | P0 | Customer communication |
| `auditLogs` | P0 | Compliance & ops |
| `webhookEvents` | P0 | Idempotency safety |
| `analyticsEvents` | P1 | Business metrics |

### 7.2 Post-MVP (V1 — Month 4–9)

| Collection | Priority | Notes |
|-----------|---------|-------|
| `reviews` | P1 | After delivery volume |
| `hiveScores` | P1 | After sufficient order history |
| `productVideos` | P1 | Rich media enhancement |

### 7.3 Future Collections

| Collection | Priority | Notes |
|-----------|---------|-------|
| `wishlists` | V2 | Save-for-later |
| `carts` | V2 | Persistent cart (MVP uses client-side) |
| `promotions` | V2 | Discount codes, campaigns |
| `loyaltyPoints` | V3 | Rewards program |
| `boutiquePosts` | V3 | Social/live commerce |
| `aiRecommendations` | V3 | ML-powered discovery |
| `subscriptions` | V3 | Premium memberships |

---

### 7.4 MVP Schema Minimum (Simplified)

For the absolute MVP sprint, this is the minimal viable schema excluding analytics and hive scores:

```
P0 Core:        users, customerProfiles, addresses, regions
P0 Catalog:     boutiques, boutiqueDocuments, occasions, products,
                productImages, productVariants, inventory
P0 Commerce:    orders, orderItems, deliverySlots, payments
P0 Logistics:   shipments, webhookEvents
P0 Claims:      claims, claimEvidence
P0 Ops:         notifications, auditLogs
```

`analyticsEvents`, `hiveScores`, `productVideos`, `reviews` can be added in sprint 2 without breaking MVP data model.

---

*Document version: 1.0 | Lead Database Architect | June 2026*
*Based on: HIVE_PRD_V2.2 + HIVE_SYSTEM_ARCHITECTURE v1.0*
*Stack: Next.js · TypeScript · Convex · Clerk · Cloudinary · Razorpay*
