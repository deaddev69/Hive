# Hive by TailorBee — System Architecture
### Lead Software Architect Document · v1.0 · June 2026

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Folder Structure](#2-folder-structure)
3. [Database Design](#3-database-design)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Order Lifecycle State Machine](#5-order-lifecycle-state-machine)
6. [API Design](#6-api-design)
7. [Logistics Integration Architecture](#7-logistics-integration-architecture)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [MVP Scope](#9-mvp-scope)

---

## 1. System Architecture

### 1.1 Overview

Hive is a **multi-sided marketplace** built on a modern serverless stack. The platform is designed for low operational overhead, real-time synchronization, and horizontal scalability without managing dedicated infrastructure.

```
┌────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐ │
│  │ Customer App │  │  Boutique Portal │  │     Admin Portal     │ │
│  │  (Next.js)   │  │    (Next.js)     │  │      (Next.js)       │ │
│  └──────┬───────┘  └────────┬─────────┘  └──────────┬───────────┘ │
└─────────┼───────────────────┼────────────────────────┼────────────┘
          │                   │                        │
          └───────────────────▼────────────────────────┘
                              │  HTTPS / WebSocket
┌─────────────────────────────▼──────────────────────────────────────┐
│                       BACKEND LAYER (Convex)                       │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Convex Functions                          │  │
│  │  Queries · Mutations · Actions · Scheduled Functions        │  │
│  │                                                              │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │   Auth      │  │   Products   │  │    Orders        │   │  │
│  │  │  (Clerk)    │  │   Catalog    │  │   Management     │   │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘   │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │  Payments   │  │  Logistics   │  │    Claims        │   │  │
│  │  │ (Razorpay)  │  │ Integration  │  │   & Returns      │   │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘   │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │  │
│  │  │ Serviceabil │  │ Notifications│  │    Analytics     │   │  │
│  │  │ ity Module  │  │ (WA + Email) │  │                  │   │  │
│  │  └─────────────┘  └──────────────┘  └──────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Convex Database                           │  │
│  │              (Real-time document store)                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
          │                   │                    │
┌─────────▼───┐   ┌───────────▼───────┐  ┌────────▼──────────────────┐
│  Cloudinary │   │    Razorpay       │  │  Logistics Provider API   │
│  (Media CDN)│   │  (Payment Gateway)│  │  (Delhivery / Shiprocket) │
└─────────────┘   └───────────────────┘  └───────────────────────────┘
          │
┌─────────▼──────────────────────────────┐
│   OSM + Nominatim (Geocoding / Regions)│
└────────────────────────────────────────┘
```

---

### 1.2 Frontend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14+ (App Router) | Server-side rendering, routing, RSC |
| Language | TypeScript | Type safety across the stack |
| Styling | Vanilla CSS + CSS Modules | Component-scoped, zero-runtime CSS |
| State | Convex React hooks + React Context | Real-time server state, local UI state |
| Auth UI | Clerk (embedded components) | Sign-in, sign-up, session management |
| Maps | Leaflet.js + OSM tiles | Interactive map for region display |
| Media | Cloudinary React SDK | Optimised image/video delivery |
| Payments | Razorpay.js (client SDK) | Secure payment form |
| Hosting | Vercel | Global edge deployment, zero-config CI |

**Three separate Next.js apps deployed on Vercel:**

| App | Domain | Audience |
|-----|--------|----------|
| `hive-customer` | hive.tailorbee.in | Customers |
| `hive-boutique` | boutique.tailorbee.in | Boutique Partners |
| `hive-admin` | admin.tailorbee.in | Internal team |

---

### 1.3 Backend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Runtime | Convex | Serverless backend with real-time DB |
| Functions | Convex Queries / Mutations / Actions | Business logic |
| Scheduled Jobs | Convex Cron / Scheduled Functions | SLA checks, webhook retries |
| Auth | Clerk + Convex Auth | JWT validation, role claims |
| Webhooks | Convex HTTP Actions | Receive Razorpay & logistics webhooks |
| File Uploads | Cloudinary signed upload | Direct browser-to-Cloudinary with server-signed tokens |

Convex provides:
- **Real-time reactivity** — database changes propagate to all subscribed clients instantly
- **Transactional mutations** — ACID-compliant document mutations
- **Scheduled functions** — background jobs without a separate worker service
- **HTTP actions** — webhook ingestion endpoints

---

### 1.4 Database

**Convex's built-in document database** (NoSQL, JavaScript-native, real-time) is used as the primary data store. Convex handles indexing, replication, and consistency automatically.

For complex reporting queries and audit log retention, a secondary **read replica** export to **Supabase (Postgres)** can be enabled via Convex's streaming export feature (V1 roadmap item).

---

### 1.5 Storage

| Asset Type | Storage | Delivery |
|-----------|---------|----------|
| Product images | Cloudinary | Cloudinary CDN |
| Product videos | Cloudinary | Cloudinary Adaptive Streaming |
| Claim evidence videos | Cloudinary | Cloudinary CDN (private, signed URLs) |
| Boutique documents (GST, FSSAI) | Cloudinary (private folder) | Signed URLs, admin-only |

All uploads use **server-signed Cloudinary upload presets** — no API secret ever reaches the browser.

---

### 1.6 Authentication

| Mechanism | Tool | Detail |
|----------|------|--------|
| Identity Provider | Clerk | OTP (phone), Google OAuth |
| Session | Clerk JWT | Short-lived JWT, auto-refreshed |
| Backend Validation | Convex Auth Integration | JWT verified per-request |
| Role Claims | Clerk metadata (`role`) | `customer`, `boutique`, `admin` |
| Phone Verification | Clerk OTP | Required for customers |
| Boutique Admin Access | Clerk org membership | One org per boutique |

Phone number is primary for customers (India market). Google OAuth available as secondary.

---

### 1.7 Payments

| Step | Detail |
|------|--------|
| Provider | Razorpay |
| Payment Methods | UPI, Cards, Net Banking, Wallets |
| Flow | Server creates order → Client opens Razorpay modal → Payment captured → Webhook confirms |
| Webhook verification | HMAC-SHA256 signature check in Convex HTTP action |
| Refunds | Razorpay Refunds API triggered by Convex mutation after admin approval |
| Commission Capture | Razorpay Route or manual settlement split (V1) |

> [!IMPORTANT]
> Orders are only confirmed **after** Razorpay webhook confirms `payment.captured`. The client-side success callback alone is NOT trusted.

---

### 1.8 Logistics Integration

| Provider | Integration Mode | Notes |
|----------|----------------|-------|
| Primary (e.g. Delhivery / Shiprocket) | REST API + Webhooks | Shipment creation, label generation, tracking |
| Fallback | Manual (Admin) | If API fails, admin manually creates shipment |

Full logistics integration design in [Section 7](#7-logistics-integration-architecture).

---

## 2. Folder Structure

### 2.1 Monorepo Layout

```
hive-platform/
├── apps/
│   ├── customer/              # Customer-facing Next.js app
│   ├── boutique/              # Boutique partner Next.js app
│   └── admin/                 # Admin Next.js app
├── packages/
│   ├── ui/                    # Shared component library
│   ├── types/                 # Shared TypeScript types
│   └── utils/                 # Shared utilities (formatters, validators)
├── convex/                    # Convex backend (shared across all apps)
├── .env.local                 # Local environment variables (not committed)
├── turbo.json                 # Turborepo config
└── package.json               # Workspace root
```

---

### 2.2 Frontend Structure (per app, shown for `customer`)

```
apps/customer/
├── public/
│   └── icons/                 # Static icons, manifest
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (customer)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # Home / discovery
│   │   │   ├── boutiques/
│   │   │   │   └── [slug]/
│   │   │   ├── products/
│   │   │   │   └── [id]/
│   │   │   ├── occasions/
│   │   │   │   └── [slug]/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── orders/
│   │   │   │   └── [orderId]/
│   │   │   ├── claims/
│   │   │   │   ├── new/
│   │   │   │   └── [claimId]/
│   │   │   └── profile/
│   │   ├── api/
│   │   │   └── webhooks/          # Razorpay redirect fallback
│   │   ├── not-serviceable/       # Region gate page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── BottomNav.tsx      # Mobile navigation
│   │   ├── product/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGallery.tsx
│   │   │   ├── MeasurementMatrix.tsx
│   │   │   └── SizeSelector.tsx
│   │   ├── cart/
│   │   │   ├── CartDrawer.tsx
│   │   │   └── CartItem.tsx
│   │   ├── checkout/
│   │   │   ├── AddressForm.tsx
│   │   │   ├── DeliverySlotPicker.tsx
│   │   │   └── PaymentSummary.tsx
│   │   ├── orders/
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderTimeline.tsx
│   │   │   └── TrackingMap.tsx
│   │   ├── claims/
│   │   │   ├── ClaimForm.tsx
│   │   │   └── EvidenceUploader.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Loader.tsx
│   │       └── RegionGate.tsx
│   ├── hooks/
│   │   ├── useServiceability.ts
│   │   ├── useCart.ts
│   │   └── useGeolocation.ts
│   ├── lib/
│   │   ├── razorpay.ts
│   │   ├── cloudinary.ts
│   │   └── nominatim.ts
│   └── styles/
│       ├── globals.css
│       └── variables.css
├── next.config.ts
└── package.json
```

---

### 2.3 Backend Structure (Convex)

```
convex/
├── schema.ts                      # Full DB schema (all tables)
├── auth.config.ts                 # Clerk JWT config
├── http.ts                        # HTTP action router (webhooks)
│
├── functions/
│   ├── auth/
│   │   ├── getCurrentUser.ts
│   │   └── syncClerkUser.ts
│   │
│   ├── serviceability/
│   │   ├── checkServiceability.ts
│   │   └── getRegions.ts
│   │
│   ├── boutiques/
│   │   ├── createBoutique.ts
│   │   ├── getBoutique.ts
│   │   ├── updateBoutique.ts
│   │   ├── listBoutiques.ts
│   │   └── approveBoutique.ts    # Admin
│   │
│   ├── products/
│   │   ├── createProduct.ts
│   │   ├── updateProduct.ts
│   │   ├── deleteProduct.ts
│   │   ├── getProduct.ts
│   │   ├── listProducts.ts
│   │   ├── searchProducts.ts
│   │   └── approveProduct.ts     # Admin
│   │
│   ├── inventory/
│   │   ├── updateStock.ts
│   │   ├── reserveStock.ts
│   │   └── releaseStock.ts
│   │
│   ├── occasions/
│   │   ├── listOccasions.ts
│   │   └── getOccasionProducts.ts
│   │
│   ├── cart/
│   │   ├── getCart.ts
│   │   ├── addToCart.ts
│   │   ├── updateCartItem.ts
│   │   └── removeFromCart.ts
│   │
│   ├── orders/
│   │   ├── createOrder.ts
│   │   ├── confirmOrder.ts
│   │   ├── getOrder.ts
│   │   ├── listOrders.ts
│   │   ├── cancelOrder.ts
│   │   └── updateOrderStatus.ts  # Boutique / Logistics
│   │
│   ├── payments/
│   │   ├── createRazorpayOrder.ts
│   │   └── verifyPayment.ts
│   │
│   ├── logistics/
│   │   ├── createShipment.ts
│   │   ├── getTrackingStatus.ts
│   │   └── handleWebhook.ts
│   │
│   ├── deliverySlots/
│   │   ├── listSlots.ts
│   │   └── bookSlot.ts
│   │
│   ├── claims/
│   │   ├── submitClaim.ts
│   │   ├── getClaim.ts
│   │   ├── listClaims.ts
│   │   ├── reviewClaim.ts        # Admin
│   │   ├── approveClaim.ts       # Admin
│   │   └── processRefund.ts      # Admin
│   │
│   ├── reviews/
│   │   ├── submitReview.ts
│   │   └── getProductReviews.ts
│   │
│   ├── notifications/
│   │   ├── sendWhatsApp.ts
│   │   ├── sendEmail.ts
│   │   └── getNotifications.ts
│   │
│   └── analytics/
│       ├── trackEvent.ts
│       └── getDashboardMetrics.ts
│
├── webhooks/
│   ├── razorpay.ts               # Payment webhook handler
│   └── logistics.ts              # Shipment status webhook handler
│
└── crons/
    ├── checkOrderSLA.ts           # Alert boutiques on delayed confirmation
    ├── checkClaimDeadlines.ts     # Auto-expire claims past 48h window
    └── retryFailedWebhooks.ts    # Retry unprocessed webhook events
```

---

## 3. Database Design

All tables are Convex documents. Convex uses `_id` (system-generated `Id<"tableName">`) as the primary key. `_creationTime` is auto-set.

---

### 3.1 `users`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"users"> | Auto PK |
| `clerkId` | string | Clerk user ID |
| `email` | string | Nullable for phone-only users |
| `phone` | string | E.164 format |
| `role` | enum | `customer`, `boutique_owner`, `admin` |
| `isActive` | boolean | Soft enable/disable |
| `isPhoneVerified` | boolean | |
| `createdAt` | number | Epoch ms |
| `updatedAt` | number | Epoch ms |

**Indexes:** `by_clerkId` (clerkId), `by_phone` (phone), `by_email` (email)

**Relationships:**
- 1:1 → `customerProfiles`
- 1:1 → `boutiques` (if role = boutique_owner)

---

### 3.2 `customerProfiles`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"customerProfiles"> | Auto PK |
| `userId` | Id<"users"> | FK |
| `displayName` | string | |
| `avatarUrl` | string | Cloudinary URL |
| `defaultAddressId` | Id<"addresses"> | Nullable |
| `regionId` | Id<"regions"> | Last resolved region |
| `hiveScore` | number | Computed reliability score |
| `totalOrders` | number | Denormalised counter |
| `totalClaimsSubmitted` | number | For fraud heuristics |
| `updatedAt` | number | |

**Indexes:** `by_userId` (userId)

---

### 3.3 `addresses`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"addresses"> | Auto PK |
| `userId` | Id<"users"> | FK |
| `label` | string | "Home", "Work", custom |
| `line1` | string | |
| `line2` | string | Nullable |
| `city` | string | |
| `state` | string | |
| `pincode` | string | |
| `lat` | number | |
| `lng` | number | |
| `regionId` | Id<"regions"> | Resolved at save time |
| `isDefault` | boolean | |
| `createdAt` | number | |

**Indexes:** `by_userId` (userId)

---

### 3.4 `regions`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"regions"> | Auto PK |
| `name` | string | e.g., "Banjara Hills" |
| `city` | string | e.g., "Hyderabad" |
| `pincodes` | string[] | Serviceable pincodes |
| `polygonGeoJson` | string | GeoJSON string for boundary |
| `isActive` | boolean | |
| `createdAt` | number | |

**Indexes:** `by_city` (city), `by_isActive` (isActive)

---

### 3.5 `boutiques`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"boutiques"> | Auto PK |
| `userId` | Id<"users"> | Owner FK |
| `name` | string | Display name |
| `slug` | string | URL-safe unique identifier |
| `description` | string | |
| `logoUrl` | string | Cloudinary URL |
| `bannerUrl` | string | Cloudinary URL |
| `phoneNumber` | string | Business contact |
| `email` | string | Business email |
| `address` | object | `{line1, city, state, pincode, lat, lng}` |
| `regionIds` | Id<"regions">[] | Delivery service regions |
| `status` | enum | `pending`, `approved`, `suspended`, `rejected` |
| `commissionRate` | number | Platform % (default 15) |
| `gstNumber` | string | Nullable |
| `hiveScore` | number | Platform reliability score |
| `totalSales` | number | Denormalised |
| `totalOrders` | number | Denormalised |
| `approvedAt` | number | Nullable |
| `approvedBy` | Id<"users"> | Admin FK |
| `createdAt` | number | |
| `updatedAt` | number | |

**Indexes:** `by_slug` (slug), `by_userId` (userId), `by_status` (status), `by_regionIds` (regionIds)

---

### 3.6 `boutiqueDocuments`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"boutiqueDocuments"> | Auto PK |
| `boutiqueId` | Id<"boutiques"> | FK |
| `type` | enum | `gst_certificate`, `pan`, `trade_license`, `bank_proof`, `other` |
| `url` | string | Cloudinary signed URL (private) |
| `publicId` | string | Cloudinary public ID |
| `status` | enum | `pending`, `verified`, `rejected` |
| `verifiedBy` | Id<"users"> | Admin FK |
| `verifiedAt` | number | Nullable |
| `notes` | string | Admin notes |
| `createdAt` | number | |

**Indexes:** `by_boutiqueId` (boutiqueId), `by_status` (status)

---

### 3.7 `occasions`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"occasions"> | Auto PK |
| `name` | string | e.g., "Wedding", "Casual" |
| `slug` | string | URL slug |
| `description` | string | Nullable |
| `iconUrl` | string | Cloudinary URL |
| `sortOrder` | number | Display order |
| `isActive` | boolean | |
| `createdAt` | number | |

**Indexes:** `by_slug` (slug), `by_isActive` (isActive)

---

### 3.8 `products`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"products"> | Auto PK |
| `boutiqueId` | Id<"boutiques"> | FK |
| `name` | string | |
| `slug` | string | Unique |
| `description` | string | |
| `category` | string | e.g., "Saree", "Kurti", "Co-ord" |
| `occasionIds` | Id<"occasions">[] | One or more occasions |
| `priceMin` | number | Lowest variant price (paise) |
| `priceMax` | number | Highest variant price |
| `measurementMatrix` | object | `{bust, waist, hip, length}` per size |
| `careInstructions` | string | |
| `fabricDetails` | string | |
| `tags` | string[] | Searchable keywords |
| `status` | enum | `draft`, `pending_review`, `approved`, `rejected`, `archived` |
| `rejectionReason` | string | Admin-set |
| `isActive` | boolean | Boutique can soft-disable |
| `viewCount` | number | Denormalised |
| `orderCount` | number | Denormalised |
| `approvedAt` | number | |
| `approvedBy` | Id<"users"> | Admin FK |
| `createdAt` | number | |
| `updatedAt` | number | |

**Indexes:**
- `by_boutiqueId` (boutiqueId)
- `by_slug` (slug)
- `by_status` (status)
- `by_occasionIds` (occasionIds)
- `by_category` (category)
- `by_boutiqueId_status` (boutiqueId, status)

---

### 3.9 `productImages`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"productImages"> | Auto PK |
| `productId` | Id<"products"> | FK |
| `cloudinaryPublicId` | string | |
| `url` | string | Cloudinary CDN URL |
| `altText` | string | |
| `sortOrder` | number | Display order |
| `isPrimary` | boolean | First/cover image |
| `createdAt` | number | |

**Indexes:** `by_productId` (productId), `by_productId_isPrimary` (productId, isPrimary)

---

### 3.10 `productVideos`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"productVideos"> | Auto PK |
| `productId` | Id<"products"> | FK |
| `cloudinaryPublicId` | string | |
| `url` | string | Cloudinary streaming URL |
| `thumbnailUrl` | string | Auto-generated thumbnail |
| `durationSeconds` | number | |
| `sortOrder` | number | |
| `createdAt` | number | |

**Indexes:** `by_productId` (productId)

---

### 3.11 `productVariants`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"productVariants"> | Auto PK |
| `productId` | Id<"products"> | FK |
| `size` | string | "XS", "S", "M", "L", "XL", "XXL", "Free" |
| `color` | string | Nullable |
| `sku` | string | Boutique-defined SKU |
| `price` | number | In paise |
| `compareAtPrice` | number | Original/MRP in paise |
| `isActive` | boolean | |
| `createdAt` | number | |
| `updatedAt` | number | |

**Indexes:** `by_productId` (productId), `by_sku` (sku)

---

### 3.12 `inventory`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"inventory"> | Auto PK |
| `variantId` | Id<"productVariants"> | FK (1:1) |
| `productId` | Id<"products"> | Denormalised FK for queries |
| `boutiqueId` | Id<"boutiques"> | Denormalised FK for queries |
| `quantityTotal` | number | Total stock boutique has |
| `quantityReserved` | number | Locked by pending orders |
| `quantityAvailable` | number | `total - reserved` (computed) |
| `lowStockThreshold` | number | Alert trigger (default 2) |
| `lastUpdatedBy` | Id<"users"> | Boutique user |
| `updatedAt` | number | |

**Indexes:**
- `by_variantId` (variantId) — unique
- `by_productId` (productId)
- `by_boutiqueId` (boutiqueId)
- `by_boutiqueId_available` (boutiqueId, quantityAvailable)

> [!NOTE]
> Inventory reservation uses optimistic concurrency — reserve stock on order creation, release on cancellation. Convex's transactional mutations prevent race conditions.

---

### 3.13 `orders`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"orders"> | Auto PK |
| `orderNumber` | string | Human-readable, e.g. `HV-20260601-0042` |
| `customerId` | Id<"users"> | FK |
| `boutiqueId` | Id<"boutiques"> | FK (single-boutique per order) |
| `status` | enum | See state machine §5 |
| `addressId` | Id<"addresses"> | Delivery address FK |
| `deliverySlotId` | Id<"deliverySlots"> | FK |
| `subtotal` | number | Paise |
| `deliveryFee` | number | Paise |
| `discount` | number | Paise |
| `total` | number | Paise |
| `commissionAmount` | number | Platform cut |
| `paymentId` | Id<"payments"> | FK |
| `paymentStatus` | enum | `pending`, `paid`, `refunded`, `failed` |
| `shipmentId` | Id<"shipments"> | FK, nullable |
| `notes` | string | Customer notes |
| `cancelledAt` | number | |
| `cancelReason` | string | |
| `cancelledBy` | Id<"users"> | |
| `confirmedAt` | number | Boutique confirmation time |
| `deliveredAt` | number | |
| `claimWindowExpiresAt` | number | `deliveredAt + 48h` |
| `createdAt` | number | |
| `updatedAt` | number | |

**Indexes:**
- `by_orderNumber` (orderNumber)
- `by_customerId` (customerId)
- `by_boutiqueId` (boutiqueId)
- `by_status` (status)
- `by_customerId_status` (customerId, status)
- `by_boutiqueId_status` (boutiqueId, status)
- `by_createdAt` (createdAt) — for analytics

---

### 3.14 `orderItems`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"orderItems"> | Auto PK |
| `orderId` | Id<"orders"> | FK |
| `productId` | Id<"products"> | FK |
| `variantId` | Id<"productVariants"> | FK |
| `boutiqueId` | Id<"boutiques"> | Denormalised |
| `productName` | string | Snapshot at order time |
| `variantSize` | string | Snapshot |
| `variantColor` | string | Snapshot |
| `imageUrl` | string | Snapshot |
| `sku` | string | Snapshot |
| `priceAtPurchase` | number | Paise, locked at order time |
| `quantity` | number | |
| `subtotal` | number | Paise |

**Indexes:** `by_orderId` (orderId), `by_productId` (productId)

> [!IMPORTANT]
> Product details (name, size, price) are **snapshotted** into orderItems at creation. This ensures order history is immutable even if boutique edits the product later.

---

### 3.15 `deliverySlots`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"deliverySlots"> | Auto PK |
| `regionId` | Id<"regions"> | FK |
| `date` | string | ISO date `YYYY-MM-DD` |
| `startTime` | string | `HH:MM` |
| `endTime` | string | `HH:MM` |
| `capacity` | number | Max orders for slot |
| `bookedCount` | number | Current bookings |
| `isActive` | boolean | |
| `createdAt` | number | |

**Indexes:** `by_regionId_date` (regionId, date), `by_date` (date)

---

### 3.16 `shipments`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"shipments"> | Auto PK |
| `orderId` | Id<"orders"> | FK |
| `provider` | string | e.g., `delhivery`, `shiprocket` |
| `awbNumber` | string | Air waybill / tracking number |
| `providerShipmentId` | string | External ID |
| `status` | enum | `created`, `picked_up`, `in_transit`, `out_for_delivery`, `delivered`, `failed`, `returned` |
| `trackingUrl` | string | Logistics provider tracking URL |
| `labelUrl` | string | Printable label |
| `pickupAddress` | object | Boutique address snapshot |
| `deliveryAddress` | object | Customer address snapshot |
| `estimatedDelivery` | number | Epoch ms |
| `deliveredAt` | number | Nullable |
| `lastWebhookAt` | number | Last update from provider |
| `rawWebhookEvents` | object[] | Append-only event log |
| `createdAt` | number | |
| `updatedAt` | number | |

**Indexes:** `by_orderId` (orderId), `by_awbNumber` (awbNumber), `by_status` (status)

---

### 3.17 `payments`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"payments"> | Auto PK |
| `orderId` | Id<"orders"> | FK |
| `customerId` | Id<"users"> | FK |
| `razorpayOrderId` | string | |
| `razorpayPaymentId` | string | Nullable until captured |
| `amount` | number | Paise |
| `currency` | string | Default `INR` |
| `status` | enum | `created`, `pending`, `captured`, `failed`, `refunded`, `partially_refunded` |
| `method` | string | `upi`, `card`, `netbanking`, `wallet` |
| `refundId` | string | Razorpay refund ID |
| `refundAmount` | number | Paise |
| `refundedAt` | number | |
| `webhookEvents` | object[] | Append-only |
| `createdAt` | number | |
| `updatedAt` | number | |

**Indexes:** `by_orderId` (orderId), `by_razorpayOrderId` (razorpayOrderId), `by_razorpayPaymentId` (razorpayPaymentId)

---

### 3.18 `claims`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"claims"> | Auto PK |
| `claimNumber` | string | Human-readable |
| `orderId` | Id<"orders"> | FK |
| `orderItemId` | Id<"orderItems"> | FK (item-level claim) |
| `customerId` | Id<"users"> | FK |
| `boutiqueId` | Id<"boutiques"> | FK |
| `type` | enum | `damage`, `wrong_item`, `missing_item` |
| `description` | string | Customer description |
| `evidenceVideoUrl` | string | Cloudinary URL (unboxing video) |
| `evidenceVideoPublicId` | string | |
| `additionalImageUrls` | string[] | |
| `status` | enum | `submitted`, `under_review`, `approved`, `rejected`, `replacement_initiated`, `replacement_delivered`, `refund_requested`, `refund_approved`, `refunded`, `closed` |
| `adminNotes` | string | |
| `reviewedBy` | Id<"users"> | Admin FK |
| `reviewedAt` | number | |
| `resolution` | enum | `replacement`, `refund`, `rejected` |
| `replacementOrderId` | Id<"orders"> | FK, nullable |
| `refundAmount` | number | Paise |
| `submittedAt` | number | |
| `windowExpiresAt` | number | 48h from delivery |
| `createdAt` | number | |
| `updatedAt` | number | |

**Indexes:**
- `by_claimNumber` (claimNumber)
- `by_orderId` (orderId)
- `by_customerId` (customerId)
- `by_boutiqueId` (boutiqueId)
- `by_status` (status)

---

### 3.19 `reviews`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"reviews"> | Auto PK |
| `productId` | Id<"products"> | FK |
| `boutiqueId` | Id<"boutiques"> | Denormalised |
| `customerId` | Id<"users"> | FK |
| `orderId` | Id<"orders"> | FK (purchase-verified only) |
| `rating` | number | 1–5 |
| `reviewText` | string | Nullable |
| `isVerifiedPurchase` | boolean | Always true (enforced) |
| `isFlagged` | boolean | Moderation flag |
| `isPublished` | boolean | Admin approval toggle |
| `createdAt` | number | |

**Indexes:** `by_productId` (productId), `by_boutiqueId` (boutiqueId), `by_customerId_orderId` (customerId, orderId)

---

### 3.20 `hiveScores`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"hiveScores"> | Auto PK |
| `entityType` | enum | `customer`, `boutique` |
| `entityId` | Id | FK to users or boutiques |
| `score` | number | 0–100 |
| `components` | object | `{orderCompletion, claimRate, responseSLA, ...}` |
| `calculatedAt` | number | |
| `version` | number | Recalculation version |

**Indexes:** `by_entityType_entityId` (entityType, entityId)

---

### 3.21 `notifications`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"notifications"> | Auto PK |
| `userId` | Id<"users"> | Recipient FK |
| `type` | enum | `order_confirmed`, `order_picked_up`, `order_delivered`, `claim_approved`, `claim_rejected`, `replacement_dispatched`, `refund_processed`, etc. |
| `channel` | enum | `whatsapp`, `email`, `in_app` |
| `title` | string | |
| `body` | string | |
| `data` | object | `{orderId, claimId, ...}` deep-link payload |
| `status` | enum | `pending`, `sent`, `failed` |
| `isRead` | boolean | In-app only |
| `sentAt` | number | |
| `createdAt` | number | |

**Indexes:** `by_userId` (userId), `by_userId_isRead` (userId, isRead), `by_status` (status)

---

### 3.22 `auditLogs`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"auditLogs"> | Auto PK |
| `actorId` | Id<"users"> | Who performed the action |
| `actorRole` | string | Role at time of action |
| `action` | string | e.g., `order.confirmed`, `product.approved` |
| `entityType` | string | `order`, `product`, `claim`, etc. |
| `entityId` | string | ID of affected entity |
| `before` | object | State before change |
| `after` | object | State after change |
| `ipAddress` | string | |
| `userAgent` | string | |
| `createdAt` | number | |

**Indexes:** `by_actorId` (actorId), `by_entityType_entityId` (entityType, entityId), `by_createdAt` (createdAt)

---

### 3.23 `analyticsEvents`

| Field | Type | Notes |
|-------|------|-------|
| `_id` | Id<"analyticsEvents"> | Auto PK |
| `eventName` | string | `product_viewed`, `add_to_cart`, `checkout_started`, `order_placed`, etc. |
| `userId` | Id<"users"> | Nullable (anonymous) |
| `sessionId` | string | |
| `properties` | object | Freeform event payload |
| `regionId` | Id<"regions"> | |
| `createdAt` | number | |

**Indexes:** `by_eventName` (eventName), `by_userId` (userId), `by_createdAt` (createdAt)

---

## 4. User Roles & Permissions

### 4.1 Permission Matrix

| Permission | Customer | Boutique | Admin |
|-----------|----------|---------|-------|
| Browse products | ✅ (own region) | ✅ (all) | ✅ (all) |
| View product details | ✅ | ✅ | ✅ |
| Add to cart / checkout | ✅ | ❌ | ❌ |
| View own orders | ✅ | ❌ | ✅ (all) |
| View boutique orders | ❌ | ✅ (own) | ✅ (all) |
| Cancel order (pre-confirm) | ✅ | ❌ | ✅ |
| Cancel order (post-confirm) | ❌ | ❌ | ✅ |
| Confirm / reject order | ❌ | ✅ (own) | ✅ |
| Create product | ❌ | ✅ | ❌ |
| Edit product | ❌ | ✅ (own, unpublished) | ✅ |
| Approve/reject product | ❌ | ❌ | ✅ |
| Manage own inventory | ❌ | ✅ (own) | ✅ |
| Submit claim | ✅ (own delivered orders) | ❌ | ❌ |
| Review claim | ❌ | ❌ | ✅ |
| Approve/reject claim | ❌ | ❌ | ✅ |
| Process refund | ❌ | ❌ | ✅ |
| Manage boutique profile | ❌ | ✅ (own) | ✅ |
| Approve boutique | ❌ | ❌ | ✅ |
| Suspend boutique | ❌ | ❌ | ✅ |
| View analytics (own) | ❌ | ✅ (own) | ✅ |
| View platform analytics | ❌ | ❌ | ✅ |
| Manage regions | ❌ | ❌ | ✅ |
| Manage delivery slots | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |
| Submit review | ✅ (delivered orders) | ❌ | ❌ |
| Moderate reviews | ❌ | ❌ | ✅ |
| Create logistics shipment | ❌ | ❌ | ✅ (or triggered automatically) |
| Create occasions | ❌ | ❌ | ✅ |

---

### 4.2 Role Enforcement

- **Convex function level**: Every query/mutation checks `ctx.auth` and resolves the user's role from the `users` table before executing.
- **Row-level ownership**: Boutique mutations scope all reads/writes to `boutiqueId === currentUser.boutiqueId`.
- **Admin only**: Sensitive mutations (approve, refund, suspend) guard with `if (user.role !== 'admin') throw new ConvexError("Unauthorized")`.
- **No client trust**: Role is **never** read from the client payload — always from the server-side resolved user record.

---

## 5. Order Lifecycle State Machine

### 5.1 State Definitions

| State | Description |
|-------|-------------|
| `PENDING_PAYMENT` | Order created, awaiting payment capture |
| `PENDING_CONFIRMATION` | Payment captured, awaiting boutique confirmation |
| `CONFIRMED` | Boutique accepted the order |
| `PICKUP_SCHEDULED` | Logistics shipment created, awaiting pickup |
| `PICKED_UP` | Logistics provider picked up package from boutique |
| `IN_TRANSIT` | Package in transit to customer |
| `OUT_FOR_DELIVERY` | Last-mile delivery in progress |
| `DELIVERED` | Delivered to customer; claim window opens |
| `CANCELLED` | Order cancelled (pre-pickup) |
| `CLAIM_SUBMITTED` | Customer submitted a post-delivery claim |
| `REPLACEMENT_REQUESTED` | Claim approved, replacement order initiated |
| `REPLACEMENT_APPROVED` | Boutique confirmed replacement inventory available |
| `REPLACEMENT_DISPATCHED` | Replacement shipment created |
| `REPLACEMENT_DELIVERED` | Replacement delivered |
| `REFUND_REQUESTED` | Replacement unavailable, refund initiated |
| `REFUNDED` | Refund processed via Razorpay |

---

### 5.2 Transition Diagram

```
                       ┌──────────────────┐
                       │  PENDING_PAYMENT  │
                       └────────┬─────────┘
                          Payment captured
                                │
                       ┌────────▼─────────┐
                       │PENDING_CONFIRMATION│◄─── Boutique receives alert
                       └────────┬─────────┘
               ┌────────────────┼──────────────────┐
        Boutique confirms    Boutique rejects    Auto-cancel (SLA breach)
               │                  │                  │
       ┌───────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐
       │  CONFIRMED   │    │  CANCELLED  │    │  CANCELLED  │
       └───────┬──────┘    └─────────────┘    └─────────────┘
      Shipment created
               │
       ┌───────▼──────────┐
       │ PICKUP_SCHEDULED │
       └───────┬──────────┘
      Logistics webhook: picked_up
               │
       ┌───────▼──────┐
       │  PICKED_UP   │
       └───────┬──────┘
      Logistics webhook: in_transit
               │
       ┌───────▼──────┐
       │  IN_TRANSIT  │
       └───────┬──────┘
      Logistics webhook: out_for_delivery
               │
       ┌───────▼──────────────┐
       │  OUT_FOR_DELIVERY    │
       └───────┬──────────────┘
      Logistics webhook: delivered
               │
       ┌───────▼──────┐
       │  DELIVERED   │◄── Claim window: 48h
       └───────┬──────┘
    ┌──────────┴────────────────┐
No claim within 48h          Claim submitted
    │                            │
    │                   ┌────────▼──────────┐
    │                   │  CLAIM_SUBMITTED  │
    │                   └────────┬──────────┘
    │                   Admin reviews claim
    │              ┌─────────────┴──────────────┐
    │          Rejected                      Approved
    │              │                            │
    │          ┌───▼────┐          ┌────────────▼──────────────┐
    │          │Rejected│          │   REPLACEMENT_REQUESTED   │
    │          └────────┘          └────────────┬──────────────┘
    │                              Boutique confirms stock
    │                      ┌───────────────┴──────────────────┐
    │               Stock available              Stock unavailable
    │                      │                            │
    │          ┌────────────▼──────────┐     ┌──────────▼────────┐
    │          │ REPLACEMENT_APPROVED  │     │  REFUND_REQUESTED │
    │          └────────────┬──────────┘     └──────────┬────────┘
    │           Shipment created               Admin processes
    │          ┌────────────▼──────────┐     ┌──────────▼────────┐
    │          │REPLACEMENT_DISPATCHED │     │     REFUNDED      │
    │          └────────────┬──────────┘     └───────────────────┘
    │           Delivered
    │          ┌────────────▼──────────┐
    │          │ REPLACEMENT_DELIVERED │
    │          └───────────────────────┘
    │
[Order closed - no further action]
```

---

### 5.3 Cancellation Rules

| Cancellation By | Allowed When | Refund |
|----------------|-------------|--------|
| Customer | `PENDING_PAYMENT`, `PENDING_CONFIRMATION` | Full refund if paid |
| Boutique | `PENDING_CONFIRMATION` (reject) | Full refund |
| Admin | Any state pre-`PICKED_UP` | Full or partial |
| System (SLA) | `PENDING_CONFIRMATION` > 2h | Full refund |

---

## 6. API Design

> All Convex functions act as the "API layer." Below maps to Convex query/mutation/action names. HTTP clients call via the Convex client SDK or HTTP Actions.

---

### 6.1 Authentication

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `auth.getCurrentUser` | Query | Any | Get own user profile |
| `auth.syncClerkUser` | Mutation | Any | Upsert user record on first login |
| `auth.updateRole` | Mutation | Admin | Assign/change user role |

---

### 6.2 Serviceability

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `serviceability.check` | Query | Public | Check if lat/lng or pincode is serviceable |
| `serviceability.getRegions` | Query | Public | List all active regions with polygons |
| `serviceability.getRegionByPincode` | Query | Public | Map pincode → region |

---

### 6.3 Products

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `products.list` | Query | Public | Paginated product list with filters |
| `products.get` | Query | Public | Single product with variants + images |
| `products.search` | Query | Public | Full-text search across name/tags |
| `products.listByOccasion` | Query | Public | Products filtered by occasion |
| `products.listByBoutique` | Query | Public | Boutique catalog |
| `products.create` | Mutation | Boutique | Create new product (status: draft) |
| `products.update` | Mutation | Boutique | Edit own product |
| `products.delete` | Mutation | Boutique | Soft-delete own product |
| `products.approve` | Mutation | Admin | Approve product for listing |
| `products.reject` | Mutation | Admin | Reject with reason |
| `products.uploadImageToken` | Action | Boutique | Get signed Cloudinary upload token |
| `products.uploadVideoToken` | Action | Boutique | Get signed Cloudinary video upload token |
| `products.reorderImages` | Mutation | Boutique | Change image sort order |

---

### 6.4 Boutiques

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `boutiques.register` | Mutation | Any | Submit boutique application |
| `boutiques.get` | Query | Public | Get boutique public profile |
| `boutiques.list` | Query | Public | List approved boutiques |
| `boutiques.updateProfile` | Mutation | Boutique | Edit own profile |
| `boutiques.uploadDocument` | Action | Boutique | Upload verification document to Cloudinary |
| `boutiques.approve` | Mutation | Admin | Approve boutique |
| `boutiques.reject` | Mutation | Admin | Reject with reason |
| `boutiques.suspend` | Mutation | Admin | Suspend boutique |
| `boutiques.getAnalytics` | Query | Boutique/Admin | Sales + order metrics |

---

### 6.5 Inventory

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `inventory.getByProduct` | Query | Boutique/Admin | Get all variant stock for a product |
| `inventory.update` | Mutation | Boutique | Set quantity for a variant |
| `inventory.bulkUpdate` | Mutation | Boutique | Update multiple variants at once |
| `inventory.reserveStock` | Mutation | System | Lock stock on order creation (internal) |
| `inventory.releaseStock` | Mutation | System | Release stock on cancellation (internal) |

---

### 6.6 Cart

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `cart.get` | Query | Customer | Get current cart |
| `cart.add` | Mutation | Customer | Add item (validates stock, region) |
| `cart.update` | Mutation | Customer | Change quantity |
| `cart.remove` | Mutation | Customer | Remove item |
| `cart.clear` | Mutation | Customer | Empty cart |
| `cart.validate` | Query | Customer | Pre-checkout stock + serviceability check |

---

### 6.7 Orders

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `orders.create` | Mutation | Customer | Create order, reserve stock |
| `orders.get` | Query | Customer/Boutique/Admin | Get single order |
| `orders.listCustomer` | Query | Customer | Own order history |
| `orders.listBoutique` | Query | Boutique | Orders for own boutique |
| `orders.listAdmin` | Query | Admin | All orders with filters |
| `orders.confirmByBoutique` | Mutation | Boutique | Boutique confirms order |
| `orders.rejectByBoutique` | Mutation | Boutique | Boutique rejects order |
| `orders.cancelByCustomer` | Mutation | Customer | Cancel pre-confirmation |
| `orders.cancelByAdmin` | Mutation | Admin | Force cancel any order |
| `orders.updateStatus` | Mutation | Admin/System | Manual status override |

---

### 6.8 Payments

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `payments.createRazorpayOrder` | Action | Customer | Create Razorpay order, return `order_id` |
| `payments.verifySignature` | Mutation | Customer | Verify client-side payment (backup) |
| `payments.getStatus` | Query | Customer/Admin | Get payment status for order |
| `payments.initiateRefund` | Action | Admin | Trigger Razorpay refund |

---

### 6.9 Delivery Slots

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `deliverySlots.list` | Query | Customer | Available slots for region + date |
| `deliverySlots.book` | Mutation | System | Reserve slot on order creation |
| `deliverySlots.manage` | Mutation | Admin | Create/edit/disable slots |

---

### 6.10 Claims

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `claims.submit` | Mutation | Customer | Submit claim with evidence |
| `claims.getUploadToken` | Action | Customer | Signed Cloudinary token for evidence video |
| `claims.get` | Query | Customer/Admin | Get claim details |
| `claims.listCustomer` | Query | Customer | Own claims |
| `claims.listAdmin` | Query | Admin | All claims with filters |
| `claims.review` | Mutation | Admin | Add admin notes |
| `claims.approve` | Mutation | Admin | Approve → initiate replacement |
| `claims.reject` | Mutation | Admin | Reject with reason |
| `claims.escalateRefund` | Mutation | Admin | Move to refund when replacement unavailable |
| `claims.processRefund` | Action | Admin | Trigger Razorpay refund |

---

### 6.11 Analytics

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `analytics.track` | Mutation | Any | Track analytics event |
| `analytics.getDashboard` | Query | Admin | Platform-wide KPI dashboard |
| `analytics.getBoutiqueDashboard` | Query | Boutique | Own sales/order analytics |
| `analytics.getTopProducts` | Query | Admin/Boutique | Best-performing products |

---

### 6.12 Admin

| Function | Type | Role | Description |
|----------|------|------|-------------|
| `admin.getAuditLogs` | Query | Admin | Paginated audit trail |
| `admin.getPlatformMetrics` | Query | Admin | GMV, AOV, active users |
| `admin.manageRegions` | Mutation | Admin | CRUD delivery regions |
| `admin.manageOccasions` | Mutation | Admin | CRUD occasion categories |
| `admin.moderateReview` | Mutation | Admin | Flag/unpublish review |
| `admin.getUserDetails` | Query | Admin | View any user's profile |

---

## 7. Logistics Integration Architecture

### 7.1 Architecture Overview

```
┌─────────────┐   createShipment()    ┌─────────────────────────┐
│  Convex     │ ─────────────────────►│ Logistics Provider API  │
│  (Action)   │◄───── shipmentId ─────│ (Delhivery/Shiprocket)  │
└─────────────┘                       └──────────┬──────────────┘
                                                  │
                                    Status change webhooks
                                                  │
┌─────────────┐   HTTP POST           ┌───────────▼──────────────┐
│  Convex     │◄──────────────────────│  Logistics Webhook        │
│  HTTP Action│                       │  (status updates)         │
└──────┬──────┘                       └───────────────────────────┘
       │
       ├─ Update shipments table
       ├─ Update order status
       ├─ Trigger customer notification
       └─ Set deliveredAt + claimWindowExpiresAt
```

---

### 7.2 Shipment Creation Flow

```
1. Admin or automated trigger calls logistics.createShipment(orderId)
2. Convex Action:
   a. Fetch order + orderItems + boutiqueAddress + customerAddress
   b. Calculate parcel weight/dimensions (from product data or defaults)
   c. POST /shipments to provider API with:
      - pickup_address: boutique address
      - delivery_address: customer address
      - items: [{name, sku, qty, price}]
      - payment_method: PREPAID (always — customer paid online)
      - scheduled_pickup: derived from deliverySlot
   d. Receive AWB number + tracking URL
   e. Save to shipments table
   f. Update order.status → PICKUP_SCHEDULED
   g. Update order.shipmentId
   h. Send WhatsApp notification to customer with tracking link
   i. Send WhatsApp notification to boutique with pickup schedule
```

---

### 7.3 Webhook Handling

Convex exposes an HTTP Action endpoint at `/webhooks/logistics`.

```
POST /webhooks/logistics

Headers:
  X-Provider-Signature: <HMAC-SHA256>
  X-Provider-Name: delhivery

Body:
{
  "awb": "DEL123456789",
  "status": "delivered",
  "timestamp": "2026-06-01T14:30:00Z",
  "location": "Banjara Hills, Hyderabad",
  "remarks": "Delivered to customer"
}
```

**Handler logic:**
1. Verify HMAC-SHA256 signature using provider secret
2. Reject with 401 if signature invalid
3. Find shipment by AWB number
4. Append raw event to `shipment.rawWebhookEvents[]`
5. Map provider status → internal status enum
6. Update `shipment.status`
7. If status = `delivered`:
   - Set `shipment.deliveredAt`
   - Update `order.status` → `DELIVERED`
   - Set `order.deliveredAt`
   - Set `order.claimWindowExpiresAt = deliveredAt + 48h`
8. If status = `failed`:
   - Alert admin via notification
9. Trigger customer notification for all status changes
10. Return `200 OK` immediately (idempotent — duplicate webhooks safe)

---

### 7.4 Tracking Updates

| Method | Mechanism |
|--------|----------|
| Webhook (primary) | Provider pushes status changes to `/webhooks/logistics` |
| Polling fallback | Convex scheduled function polls `/tracking/{awb}` every 30 min for shipments in-transit with no webhook in >1h |
| Customer view | `shipments.getTrackingStatus(orderId)` returns tracking URL + internal status |

---

### 7.5 Delivery Confirmation Flow

```
1. Logistics provider delivers package
2. Provider sends webhook: status = "delivered"
3. Convex handler:
   a. Update shipment.status = "delivered"
   b. Update order.status = "DELIVERED"
   c. Set claimWindowExpiresAt = now + 48h
   d. Send delivery confirmation to customer (WhatsApp + in-app)
   e. Start 48h claim window countdown
4. Cron job (runs every 15 min):
   a. Find DELIVERED orders where claimWindowExpiresAt < now
   b. Mark order as "closed" (claim window expired)
   c. Schedule commission settlement
```

---

### 7.6 Failure & Retry Handling

| Scenario | Handling |
|----------|---------|
| Shipment creation API failure | Retry 3× with exponential backoff; alert admin if all fail |
| Webhook delivery gap | Polling fallback kicks in after 1h silence |
| Invalid webhook signature | Log and discard; alert on high frequency |
| Provider downtime | Manual fallback: admin can update order/shipment status manually |
| Webhook idempotency | Each event checked against `rawWebhookEvents` timestamp before applying |

---

## 8. Non-Functional Requirements

### 8.1 Security

| Area | Requirement | Implementation |
|------|-------------|----------------|
| Authentication | JWT-based, short-lived tokens | Clerk (15-min access tokens, auto-refresh) |
| Authorization | Role-based, server-enforced | Convex function-level role checks |
| Transport | TLS 1.3 everywhere | Vercel + Convex (enforced) |
| Payment | PCI-DSS compliant | Razorpay handles card data; never touches our servers |
| API secrets | Never exposed to client | All API keys in Convex environment variables |
| Media access | Claim evidence is private | Signed Cloudinary URLs with 15-min expiry |
| Webhook security | HMAC-SHA256 signature verification | Per-provider secret, verified before processing |
| Input validation | All inputs validated server-side | Convex `v.` validators on all function arguments |
| SQL injection | N/A — document store | Convex queries are typesafe, no raw query strings |
| Rate limiting | Prevent abuse | Convex built-in + Vercel Edge middleware |
| Fraud prevention | Claim fraud detection | Hive Score, mandatory unboxing video, 48h window |

---

### 8.2 Performance

| Metric | Target | Approach |
|--------|--------|---------|
| Product list load | < 500ms | Convex indexes, paginated queries |
| Product search | < 500ms | Indexed tag/name search |
| Core API responses | < 500ms | Convex serverless, edge-close deployment |
| Shipment status update | < 60s | Webhook-driven (near real-time) |
| Image load | < 2s on 4G | Cloudinary CDN, auto-format (WebP/AVIF), responsive sizing |
| Video load | Adaptive | Cloudinary adaptive streaming |
| Serviceability check | < 200ms | Pincode lookup against indexed regions table |
| Real-time updates | < 1s | Convex reactive queries (WebSocket) |

---

### 8.3 Scalability

| Dimension | Target | Approach |
|-----------|--------|---------|
| Registered users | 50,000+ | Convex auto-scales; Clerk supports millions |
| Products | 100,000+ | Indexed, paginated queries; Cloudinary CDN for media |
| Concurrent users | 1,000+ | Convex serverless (no fixed server capacity) |
| Regions | Multi-city | Region table design supports expansion |
| Logistics providers | Multiple | Provider abstracted behind internal `createShipment()` interface |
| Database | Auto-scaled | Convex manages sharding and replication |

---

### 8.4 Monitoring & Alerting

| Layer | Tool | What to Monitor |
|-------|------|----------------|
| Frontend | Vercel Analytics + Sentry | Web vitals, JS errors, page load |
| Backend | Convex Dashboard | Function errors, p95 latency, DB usage |
| Payments | Razorpay Dashboard | Failed payments, refund success rate |
| Logistics | Internal alerts | Shipments stuck in-transit > 48h |
| SLA | Convex cron | Boutique confirmation SLA, claim deadlines |
| Errors | Sentry | All unhandled exceptions with stack traces |
| Business | Custom admin dashboard | GMV, orders, cancellation rate, claim rate |

**Alerting thresholds (PagerDuty / Slack):**
- Error rate > 1% → P1 alert
- Boutique confirmation SLA > 2h → Boutique + Admin alert
- Payment failure rate > 5% → P1 alert
- Logistics webhook gap > 2h → Admin alert
- Claim submission spike > 10x baseline → Fraud review trigger

---

### 8.5 Audit Logs

Every state-changing action is logged to `auditLogs` with:
- Actor identity + role
- Action performed
- Before/after state snapshot
- Timestamp + IP + user agent
- Entity reference

Retention: 3 years minimum. Exported to Supabase for long-term storage and compliance reporting.

---

## 9. MVP Scope

### 9.1 MVP (Launch — Month 0–3)

**Goal:** Validate marketplace demand and operational viability in one city.

| Module | Scope |
|--------|-------|
| **Auth** | Phone OTP + Google OAuth via Clerk |
| **Serviceability** | Pincode-based region check; non-serviceable gate page |
| **Boutiques** | Onboarding, document upload, admin approval workflow |
| **Products** | Create/edit/delete products; image upload; admin moderation |
| **Occasions** | Admin-managed occasion list; product-occasion mapping; occasion browsing |
| **Inventory** | Manual stock update by boutique; reserve on order |
| **Orders** | Single-boutique orders; full order lifecycle; boutique confirm/reject |
| **Payments** | Razorpay integration (UPI + cards); webhook confirmation |
| **Delivery Slots** | Admin-managed slots; customer picks slot at checkout |
| **Logistics** | Single provider API integration; webhook tracking; manual fallback |
| **Claims** | 48h claim window; video evidence upload; admin review; replacement/refund flow |
| **Notifications** | WhatsApp + email for key order events |
| **Admin Portal** | Boutique moderation, product moderation, claim management, order oversight |
| **Analytics** | Basic admin dashboard: GMV, orders, cancellations, claim rate |
| **Hive Score** | Basic computation (order completion, claim rate) |

---

### 9.2 V1 (Post-Validation — Month 4–9)

| Feature | Description |
|---------|-------------|
| Multi-boutique cart | Allow cart items from multiple boutiques (split orders) |
| Reviews & ratings | Post-delivery verified reviews |
| Advanced search | Filter by size, price range, category |
| Wishlist | Save products for later |
| Boutique analytics | Rich sales dashboard for boutique partners |
| Multi-city expansion | Add new regions without code change |
| Commission automation | Razorpay Route for automated commission splits |
| Push notifications | Web push for order updates |
| Audit log export | Admin CSV export for compliance |
| Supabase read replica | Complex reporting on Postgres |
| Multiple logistics providers | Fallback provider routing |
| Boutique SLA automation | Auto-cancel and alert on 2h breach |

---

### 9.3 Future (Post-Product-Market Fit — Month 10+)

| Feature | Description |
|---------|-------------|
| AI size recommendations | Body measurements → size prediction |
| Personalised recommendations | ML-based product discovery |
| Loyalty program | Points, tiers, rewards |
| Premium memberships | Free delivery, early access perks |
| Advanced fraud detection | ML-based claim fraud scoring |
| Boutique marketing tools | Promoted listings, discount codes |
| Live commerce | Boutique live video + purchase integration |
| B2B / wholesale | Bulk ordering for event organisers |
| Native mobile apps | iOS + Android apps |
| Regional language support | Hindi, Telugu, Tamil UI |

---

*Document version: 1.0 | Author: System Architect | June 2026*
*Based on Hive by TailorBee PRD v2.2*
