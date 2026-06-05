# Hive by TailorBee — Backend Business Logic Specification
### Lead Backend Engineer Document · v1.0 · June 2026
### Stack: Next.js · TypeScript · Convex · Clerk · Cloudinary · Razorpay

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [Product Workflow](#2-product-workflow)
3. [Boutique Workflow](#3-boutique-workflow)
4. [Order Lifecycle](#4-order-lifecycle)
5. [Claims Workflow](#5-claims-workflow)
6. [Hive Score Engine](#6-hive-score-engine)
7. [Inventory Rules](#7-inventory-rules)
8. [Logistics Integration](#8-logistics-integration)
9. [Convex Functions Registry](#9-convex-functions-registry)
10. [Error Handling](#10-error-handling)

---

## 1. Authentication Flow

### 1.1 Technology Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Identity Provider | Clerk | Phone OTP, Google OAuth, JWT issuance |
| Backend Validation | Convex Auth + `ctx.auth.getUserIdentity()` | Per-request identity resolution |
| Role Storage | Convex `users.role` table field | Server-authoritative, never trusted from client |
| Session | Clerk JWT (15-min access token, auto-refresh) | Stateless auth |

**Critical Rule:** Role is **always** read from the `users` table in Convex. Role claims in the JWT are used only for initial sync — never as the authorization source.

---

### 1.2 Shared Auth Helper

```
// convex/lib/auth.ts — used by every protected function

getAuthenticatedUser(ctx):
  1. Call ctx.auth.getUserIdentity()
  2. If null → throw ConvexError("UNAUTHENTICATED")
  3. Query users.by_clerkId where clerkId = identity.subject
  4. If no user found → throw ConvexError("USER_NOT_FOUND")
  5. If user.isActive === false → throw ConvexError("ACCOUNT_DISABLED")
  6. Return user document

requireRole(ctx, role):
  1. Call getAuthenticatedUser(ctx)
  2. If user.role !== role → throw ConvexError("FORBIDDEN", { required: role, actual: user.role })
  3. Return user

requireAnyRole(ctx, ...roles):
  1. Call getAuthenticatedUser(ctx)
  2. If !roles.includes(user.role) → throw ConvexError("FORBIDDEN")
  3. Return user

requireBoutiqueOwnership(ctx, boutiqueId):
  1. Call requireRole(ctx, "boutique_owner")
  2. Query boutiques.by_userId where userId = user._id
  3. If not found OR boutique._id !== boutiqueId → throw ConvexError("BOUTIQUE_ACCESS_DENIED")
  4. If boutique.status === "suspended" → throw ConvexError("BOUTIQUE_SUSPENDED")
  5. Return { user, boutique }
```

---

### 1.3 Customer Authentication Flow

```
TRIGGER: Customer opens app for the first time

Step 1 — Clerk Auth (handled by Clerk SDK, not Convex):
  a. Customer enters phone number
  b. Clerk sends OTP via SMS
  c. Customer enters OTP
  d. Clerk issues JWT with subject = clerkId

Step 2 — User Sync (Convex mutation: auth.syncClerkUser):
  Input: { clerkId, phone, email? }
  
  a. Query users.by_clerkId
  b. IF user exists:
     - Update updatedAt
     - Return existing user._id
  c. IF user does not exist:
     - Create users document:
         clerkId  = identity.subject
         phone    = identity.phoneNumber (E.164)
         email    = identity.email (optional)
         role     = "customer"          ← default role
         isActive = true
         isPhoneVerified = true
         createdAt = now()
         updatedAt = now()
     - Create customerProfiles document:
         userId               = user._id
         displayName          = derived from phone / name
         hiveScore            = 50          ← neutral start
         totalOrders          = 0
         totalClaimsSubmitted = 0
         updatedAt            = now()
     - Write auditLog: action="user.created", entityType="users"
     - Return user._id

Step 3 — Serviceability Check (Convex query: serviceability.check):
  - Read last known regionId from customerProfile
  - If regionId is null → redirect to location capture flow
  - If region.isActive = false → redirect to not-serviceable page

Step 4 — Location Capture (if needed):
  a. Browser Geolocation API → lat/lng (client-side)
  b. Convex action: serviceability.checkByCoords({ lat, lng })
     - Nominatim reverse geocode → pincode
     - Query regions where pincode in regions.pincodes
     - If found: update customerProfile.regionId, return { serviceable: true, regionId }
     - If not found: return { serviceable: false, nearbyRegions: [...] }
```

---

### 1.4 Boutique Owner Authentication Flow

```
TRIGGER: Boutique owner registers on boutique portal

Step 1 — Clerk Auth (same as customer — phone OTP or Google)

Step 2 — User Sync (same auth.syncClerkUser):
  - Role defaults to "customer" on first login
  - Role is upgraded to "boutique_owner" when boutique application is submitted

Step 3 — Boutique Application (Convex mutation: boutiques.register):
  Preconditions:
    - User must be authenticated
    - User must NOT already have a boutique (query boutiques.by_userId)
  
  a. Create boutiques document:
       userId         = user._id
       name           = args.name
       slug           = generateSlug(args.name)     ← unique, URL-safe
       status         = "pending"
       commissionRate = 15                           ← default
       hiveScore      = 50
       totalSales     = 0
       totalOrders    = 0
       createdAt      = now()
  
  b. Update users.role = "boutique_owner"
  
  c. Write auditLog: action="boutique.registered"
  
  d. Send notifications:
       - Admin: type="boutique_pending_review", channel="in_app"
       - Boutique owner: type="boutique_application_received", channel="whatsapp"
```

---

### 1.5 Admin Authentication Flow

```
Admin accounts are NOT self-registerable.

Step 1 — Admin user is created manually by a super-admin via:
  Convex mutation: admin.createAdminUser({ clerkId, email })
  - Creates users document with role = "admin"
  - Only callable by existing admin

Step 2 — Admin logs in via Clerk (Google OAuth preferred)

Step 3 — auth.syncClerkUser detects existing user with role="admin"
  - No new document created; existing admin user returned

Step 4 — All admin portals validate role="admin" on every function call
  via requireRole(ctx, "admin")
```

---

### 1.6 Token Refresh & Session Lifecycle

```
Clerk handles token refresh automatically.
Convex validates JWT on every function call via ctx.auth.getUserIdentity().

On user deactivation (admin.disableUser):
  1. Set users.isActive = false
  2. Call Clerk Admin API to revoke all sessions
  3. All subsequent Convex calls will throw ACCOUNT_DISABLED

On role change:
  1. Update users.role in Convex
  2. Existing JWT retains old role claim — this is acceptable because
     Convex always reads role from the DB, not the JWT claim
```

---

## 2. Product Workflow

### 2.1 State Machine

```
[DRAFT] ──submit──► [PENDING_REVIEW] ──approve──► [APPROVED / LIVE]
                                    ──reject───► [REJECTED]
                                                     │
                                            boutique edits
                                                     ▼
[APPROVED] ──archive──► [ARCHIVED] ──unarchive──► [DRAFT]
[REJECTED] ──edit──────► [DRAFT]
```

---

### 2.2 Product Creation (Boutique)

```
Mutation: products.create
Caller: boutique_owner

Preconditions:
  1. requireBoutiqueOwnership(ctx, args.boutiqueId)
  2. boutique.status === "approved"  (cannot list products from pending boutique)

Inputs:
  name, description, category, occasionIds[], measurementMatrix,
  careInstructions, fabricDetails, tags[]

Validation:
  - name: 3–120 characters
  - category: must be one of the allowed enum values
  - occasionIds: at least 1, all must exist in occasions table, all must be isActive
  - tags: max 20 items, each max 30 chars

Steps:
  1. Validate all inputs (throw on failure with field-specific errors)
  2. Generate slug: slugify(name) + "-" + boutique.slug + "-" + timestamp6chars
     Ensure uniqueness: query products.by_slug — if collision, append counter
  3. Create products document:
       status    = "draft"
       isActive  = false
       priceMin  = 0    (set when variants are added)
       priceMax  = 0
       viewCount = 0
       orderCount= 0
  4. Write auditLog: action="product.created"
  5. Return product._id

Next step: boutique adds images, variants, inventory, then submits for review
```

---

### 2.3 Product Variant & Inventory Creation (Boutique)

```
Mutation: products.addVariant
Caller: boutique_owner

Preconditions:
  1. requireBoutiqueOwnership(ctx, product.boutiqueId)
  2. product.status must be "draft" or "rejected"
  
Inputs:
  productId, size, color?, sku, price, compareAtPrice?, initialStock

Validation:
  - size: one of XS|S|M|L|XL|XXL|Free
  - sku: unique within boutique (query productVariants.by_sku)
  - price: > 0, in paise (integer)
  - compareAtPrice: if present, must be >= price
  - initialStock: >= 0

Steps:
  1. Validate all inputs
  2. Create productVariants document (isActive = true)
  3. Create inventory document atomically:
       variantId         = new variant._id
       productId         = product._id
       boutiqueId        = boutique._id
       quantityTotal     = args.initialStock
       quantityReserved  = 0
       quantityAvailable = args.initialStock
       lowStockThreshold = 2
  4. Recompute product.priceMin and product.priceMax:
       - Query all active variants for product
       - priceMin = min(prices), priceMax = max(prices)
       - Update product document
  5. Write auditLog: action="product.variant_added"
```

---

### 2.4 Submit for Review (Boutique)

```
Mutation: products.submitForReview
Caller: boutique_owner

Preconditions:
  1. requireBoutiqueOwnership(ctx, product.boutiqueId)
  2. product.status === "draft" OR product.status === "rejected"

Readiness Checks (all must pass):
  a. At least 1 productImage where isPrimary = true
  b. At least 1 active productVariant
  c. All variants have an inventory record
  d. product.priceMin > 0
  e. product.name length > 2
  f. product.occasionIds.length > 0

Steps:
  1. Run all readiness checks; return specific error if any fail
  2. Update products.status = "pending_review"
  3. Update products.updatedAt
  4. Send notification to admin: type="product_pending_review"
  5. Write auditLog: action="product.submitted_for_review"
```

---

### 2.5 Admin Review (Approve / Reject)

```
Mutation: products.approve
Caller: admin

Steps:
  1. requireRole(ctx, "admin")
  2. Fetch product; assert status === "pending_review"
  3. Update:
       status     = "approved"
       isActive   = true
       approvedAt = now()
       approvedBy = admin._id
  4. Notify boutique: type="product_approved", channel="whatsapp"
  5. Write auditLog: before={status:"pending_review"}, after={status:"approved"}

---

Mutation: products.reject
Caller: admin

Inputs: productId, rejectionReason (required)

Steps:
  1. requireRole(ctx, "admin")
  2. Fetch product; assert status === "pending_review"
  3. Update:
       status          = "rejected"
       rejectionReason = args.rejectionReason
       isActive        = false
  4. Notify boutique: type="product_rejected", channel="whatsapp"
     Include rejectionReason in notification body
  5. Write auditLog
```

---

### 2.6 Archive & Unarchive (Boutique / Admin)

```
Mutation: products.archive
  - Allowed when: status === "approved"
  - Sets: status = "archived", isActive = false
  - Effect: product no longer visible in catalog queries
  - Existing orders with this product are NOT affected

Mutation: products.unarchive
  - Sets: status = "draft"
  - Boutique must re-submit for review before going live
```

---

### 2.7 Product Catalog Query Logic

```
Query: products.list (public)
  Filters applied automatically:
    - status = "approved"
    - isActive = true
    - boutiqueId's boutique.status = "approved"
  
  Supported filter params:
    - regionId: cross-reference boutique.regionIds
    - occasionId: filter by occasionIds array
    - category: exact match
    - priceMin / priceMax: range filter on priceMin/priceMax
    - search: substring match against name + tags
  
  Sorting: createdAt desc (newest first) | orderCount desc (popularity)
  Pagination: cursor-based using Convex pagination

Query: products.get (public)
  - Returns product + all approved images + all active variants + inventory
  - Increments viewCount in a non-blocking scheduled mutation
    (using ctx.scheduler.runAfter(0, ...) to avoid blocking the read)
```

---

## 3. Boutique Workflow

### 3.1 State Machine

```
[PENDING] ──approve──► [APPROVED] ──suspend──► [SUSPENDED]
          ──reject───► [REJECTED]              ──unsuspend──► [APPROVED]

[REJECTED] ──resubmit──► [PENDING]
```

---

### 3.2 Document Verification Flow

```
Mutation: boutiques.uploadDocument
Caller: boutique_owner

Steps:
  1. requireBoutiqueOwnership(ctx, args.boutiqueId)
  2. Call Convex Action: cloudinary.getSignedUploadToken({
       folder: "hive/boutique-docs/" + boutiqueId,
       allowedFormats: ["pdf", "jpg", "png"],
       resourceType: "auto",
       maxBytes: 10 * 1024 * 1024    // 10MB
     })
  3. Return { uploadToken, uploadUrl, publicId_prefix }
  
  [Browser uploads directly to Cloudinary using token]
  
Mutation: boutiques.confirmDocumentUpload
  Inputs: boutiqueId, type, cloudinaryPublicId, url

  Steps:
    1. requireBoutiqueOwnership(ctx, boutiqueId)
    2. Check: no existing verified document of same type (one per type)
    3. Create boutiqueDocuments document:
         status = "pending"
    4. Notify admin: new document requires verification

Mutation: boutiques.verifyDocument (Admin)
  Inputs: documentId, status ("verified" | "rejected"), notes?
  
  Steps:
    1. requireRole(ctx, "admin")
    2. Update boutiqueDocuments:
         status     = args.status
         verifiedBy = admin._id
         verifiedAt = now()
         notes      = args.notes
    3. Write auditLog
```

---

### 3.3 Boutique Approval (Admin)

```
Mutation: boutiques.approve
Caller: admin

Preconditions:
  1. boutique.status === "pending"
  2. At least one boutiqueDocument with status="verified" (configurable rule)

Steps:
  1. requireRole(ctx, "admin")
  2. Validate preconditions
  3. Update boutiques:
       status     = "approved"
       approvedAt = now()
       approvedBy = admin._id
  4. Notify boutique owner:
       type    = "boutique_approved"
       channel = "whatsapp" + "email"
       body    = "Your boutique [name] is now live on Hive!"
  5. Write auditLog

---

Mutation: boutiques.reject
  - status = "rejected" + rejectionReason stored
  - Notify via WhatsApp + email
  - Boutique owner can edit and resubmit

---

Mutation: boutiques.suspend
  Inputs: boutiqueId, reason

  Steps:
    1. requireRole(ctx, "admin")
    2. Update boutiques.status = "suspended"
    3. Set all boutique's products.isActive = false
       (batch update via query by_boutiqueId)
    4. Notify boutique owner: type="boutique_suspended"
    5. Write auditLog with reason

---

Mutation: boutiques.unsuspend
  Steps:
    1. Update boutiques.status = "approved"
    2. Restore all boutique's approved products.isActive = true
    3. Notify boutique owner: type="boutique_reactivated"
```

---

### 3.4 Boutique Active State Rules

```
When boutique.status !== "approved":
  - products cannot be submitted for review
  - orders cannot be placed against boutique
  - existing pending_confirmation orders are auto-cancelled with full refund
    (triggered by a scheduled action when boutique is suspended)
  - catalog queries filter out the boutique
```

---

## 4. Order Lifecycle

### 4.1 Full State Machine

```
PENDING_PAYMENT
    │ [Razorpay webhook: payment.captured]
    ▼
PENDING_CONFIRMATION ──[boutique rejects]──────────────► CANCELLED
    │                 ──[SLA > 2h, no response]────────► CANCELLED
    │ [boutique.confirmOrder]
    ▼
CONFIRMED
    │ [logistics.createShipment]
    ▼
PICKUP_SCHEDULED
    │ [logistics webhook: picked_up]
    ▼
PICKED_UP
    │ [logistics webhook: in_transit]
    ▼
IN_TRANSIT
    │ [logistics webhook: out_for_delivery]
    ▼
OUT_FOR_DELIVERY
    │ [logistics webhook: delivered]
    ▼
DELIVERED ──[no claim in 48h]──► [closed / no action]
    │ [customer submits claim]
    ▼
CLAIM_SUBMITTED (see §5)
```

---

### 4.2 Order Creation

```
Mutation: orders.create
Caller: customer
Transaction: ATOMIC — entire function is a single Convex mutation

Inputs:
  cartItems: [{ variantId, quantity }]
  addressId
  deliverySlotId
  notes?

Preconditions:
  1. requireRole(ctx, "customer")
  2. Customer's address.regionId must not be null (serviceable)

Step 1 — Validate Address & Serviceability:
  a. Fetch address by addressId, assert address.userId = customer._id
  b. Assert address.regionId is not null
  c. Fetch region, assert region.isActive = true

Step 2 — Validate Delivery Slot:
  a. Fetch deliverySlot
  b. Assert slot.isActive = true
  c. Assert slot.date >= today
  d. Assert slot.bookedCount < slot.capacity → if full: throw SLOT_FULL

Step 3 — Validate Cart Items:
  For each cartItem:
    a. Fetch productVariant
    b. Assert variant.isActive = true
    c. Fetch product, assert product.status = "approved" AND product.isActive = true
    d. Assert product.boutiqueId matches (all items from same boutique for MVP)
    e. Fetch boutique, assert boutique.status = "approved"
    f. Fetch inventory for variantId
    g. Assert inventory.quantityAvailable >= cartItem.quantity → if not: throw INSUFFICIENT_STOCK({ variantId, available: inventory.quantityAvailable })
  
  All items must belong to same boutiqueId (MVP constraint)

Step 4 — Calculate Totals:
  subtotal        = sum(variant.price × qty) for each item
  deliveryFee     = 49_00    (₹49 in paise — configurable)
  discount        = 0        (no discounts in MVP)
  total           = subtotal + deliveryFee - discount
  commissionRate  = boutique.commissionRate / 100
  commissionAmount= round(subtotal × commissionRate)

Step 5 — Reserve Inventory (all items, atomic):
  For each cartItem:
    inventory.quantityReserved  += cartItem.quantity
    inventory.quantityAvailable -= cartItem.quantity
    inventory.updatedAt          = now()
  
  IF any reservation fails → rollback all reservations in same mutation

Step 6 — Book Delivery Slot:
  deliverySlot.bookedCount += 1
  deliverySlot.updatedAt   = now()

Step 7 — Snapshot Delivery Address:
  deliveryAddressSnapshot = {
    label:   address.label,
    line1:   address.line1,
    line2:   address.line2,
    city:    address.city,
    state:   address.state,
    pincode: address.pincode,
    lat:     address.lat,
    lng:     address.lng,
  }

Step 8 — Generate Order Number:
  format: "HV-" + YYYYMMDD + "-" + zeroPad(dailySequence, 4)
  dailySequence: count of today's orders + 1

Step 9 — Create Order:
  orders.create({
    orderNumber, customerId, boutiqueId,
    status         = "pending_payment",
    deliveryAddress= deliveryAddressSnapshot,
    addressId, deliverySlotId,
    subtotal, deliveryFee, discount, total, commissionAmount,
    paymentStatus  = "pending",
    createdAt, updatedAt
  })

Step 10 — Create Order Items (snapshots):
  For each cartItem:
    orderItems.create({
      orderId, productId, variantId, boutiqueId,
      productName     = product.name,        // SNAPSHOT
      variantSize     = variant.size,        // SNAPSHOT
      variantColor    = variant.color,       // SNAPSHOT
      imageUrl        = primaryImage.url,    // SNAPSHOT
      sku             = variant.sku,         // SNAPSHOT
      priceAtPurchase = variant.price,       // SNAPSHOT — locked forever
      quantity        = cartItem.quantity,
      subtotal        = variant.price × quantity,
    })

Step 11 — Update Customer Profile:
  customerProfile.totalOrders += 1

Step 12 — Write Audit Log:
  action="order.created", entityType="orders"

Return: { orderId, orderNumber, total }
```

---

### 4.3 Payment Flow

```
Action: payments.createRazorpayOrder
Caller: customer

Steps:
  1. requireRole(ctx, "customer")
  2. Fetch order, assert order.customerId = customer._id
  3. Assert order.status = "pending_payment"
  4. Assert order.paymentStatus = "pending"
  5. Call Razorpay API (via node-razorpay in Convex Action):
       POST /orders
       { amount: order.total, currency: "INR", receipt: order.orderNumber }
  6. Create payments document:
       razorpayOrderId = razorpay_response.id
       amount          = order.total
       status          = "created"
  7. Update order.paymentId = payment._id
  8. Return { razorpayOrderId, amount, currency, key: RAZORPAY_KEY_ID }

---

HTTP Action: webhooks/razorpay
Trigger: POST /webhooks/razorpay

Steps:
  1. Read raw body as string (important for HMAC)
  2. Compute HMAC-SHA256(body, RAZORPAY_WEBHOOK_SECRET)
  3. Compare with X-Razorpay-Signature header
  4. If mismatch → return 401, log warning
  
  5. Parse event body
  6. Check webhookEvents.by_source_eventId:
       source="razorpay", eventId=event.payload.payment.entity.id
       If found AND status="processed" → return 200 (idempotent)
  
  7. Create webhookEvents record (status="received")
  
  8. Route by event.event:
     
     "payment.captured":
       a. Fetch payment by razorpayOrderId
       b. Update payment:
            razorpayPaymentId = entity.id
            status            = "captured"
            method            = entity.method
       c. Update order:
            paymentStatus = "paid"
            status        = "pending_confirmation"
            updatedAt     = now()
       d. Update webhookEvents.status = "processed"
       e. Notify boutique: type="order_confirmed" (new order alert)
       f. Notify customer: type="order_confirmed" (payment success)
       g. Write auditLog: action="order.payment_captured"
     
     "payment.failed":
       a. Fetch payment by razorpayOrderId
       b. Update payment.status = "failed"
       c. Update order.paymentStatus = "failed"
       d. Release all reserved inventory (call releaseStockForOrder)
       e. Release delivery slot booking
       f. Update webhookEvents.status = "processed"
       g. Notify customer: type="payment_failed"
     
     Other events: log, mark as processed, return 200
  
  9. Return 200 immediately (do not let Razorpay timeout)
```

---

### 4.4 Boutique Order Confirmation

```
Mutation: orders.confirmByBoutique
Caller: boutique_owner

Inputs: orderId

Steps:
  1. user = requireRole(ctx, "boutique_owner")
  2. Fetch order
  3. Verify: order.boutiqueId matches user's boutique
  4. Assert order.status === "pending_confirmation"
  
  5. Update order:
       status      = "confirmed"
       confirmedAt = now()
       updatedAt   = now()
  
  6. Decrement actual stock (reservation becomes real sale):
     For each orderItem:
       inventory.quantityTotal    -= orderItem.quantity
       inventory.quantityReserved -= orderItem.quantity
       // quantityAvailable stays same (it was already decremented on reserve)
  
  7. Update boutique counters:
       boutique.totalOrders += 1
       boutique.totalSales  += order.total (paise)
  
  8. Update product counters:
     For each unique productId in orderItems:
       product.orderCount += 1
  
  9. Notify customer: type="order_confirmed", include order summary
  10. Write auditLog: action="order.boutique_confirmed"
  11. Schedule logistics.createShipment action (if automated):
       ctx.scheduler.runAfter(0, "logistics.createShipment", { orderId })

---

Mutation: orders.rejectByBoutique
Caller: boutique_owner

Inputs: orderId, reason

Steps:
  1. Verify boutique ownership of order
  2. Assert order.status === "pending_confirmation"
  3. Update order:
       status       = "cancelled"
       cancelReason = args.reason
       cancelledBy  = user._id
       cancelledAt  = now()
  4. Release all reserved inventory (releaseStockForOrder)
  5. Release delivery slot (bookedCount--)
  6. Trigger refund: payments.initiateRefund(payment._id)
  7. Notify customer: type="order_cancelled" with reason
  8. Write auditLog: action="order.boutique_rejected"
```

---

### 4.5 SLA Monitoring (Cron)

```
Cron: crons/checkOrderSLA.ts
Schedule: every 15 minutes

Logic:
  1. Query orders where:
       status = "pending_confirmation"
       createdAt < now() - 2_hours
  
  2. For each order found:
     a. Send urgent alert to boutique: type="order_sla_breach"
        (if in 2h–4h window — first warning)
     b. If order.createdAt < now() - 4_hours:
        → Auto-cancel:
          - Update order.status = "cancelled"
          - Update order.cancelReason = "sla_breach_auto_cancel"
          - Release inventory
          - Release delivery slot
          - Trigger full refund
          - Notify customer: "Order cancelled — boutique did not respond"
          - Notify admin: "Auto-cancelled order [orderNumber] — boutique SLA breach"
          - Write auditLog: action="order.auto_cancelled_sla"
          
          If boutique has > 3 SLA breaches in 30 days:
            → Flag boutique for admin review
            → Send admin alert
```

---

### 4.6 Order Cancellation Rules

```
cancelByCustomer (Mutation):
  Allowed when: order.status = "pending_payment" OR "pending_confirmation"
  
  If status = "pending_payment":
    - Just cancel; no refund needed (payment not captured)
    - Release inventory + delivery slot
  
  If status = "pending_confirmation":
    - Cancel + trigger full refund
    - Release inventory + delivery slot

cancelByAdmin (Mutation):
  Allowed when: order.status NOT IN ["delivered", "replacement_delivered", "refunded"]
  
  For orders in PICKUP_SCHEDULED or earlier:
    - Full refund
  For orders PICKED_UP or later:
    - Admin decides refund amount (partial or full)
    - Admin enters cancelReason (mandatory)
```

---

## 5. Claims Workflow

### 5.1 Policy Foundation

```
HIVE REPLACEMENT-FIRST POLICY:
  - All eligible claims → replacement attempted first
  - Refund only issued when:
      a. Replacement inventory not available, OR
      b. Admin makes exception

ELIGIBILITY CRITERIA:
  - order.status = "delivered"
  - now() < order.claimWindowExpiresAt (48h from delivery)
  - Evidence includes at least 1 unboxing video (type="unboxing_video")
  - No existing non-closed claim for same orderItemId
  - Products must be unused with original tags/packaging (attested by customer)
```

---

### 5.2 Claim Submission

```
Action: claims.getEvidenceUploadToken
Caller: customer

Steps:
  1. requireRole(ctx, "customer")
  2. Fetch order, assert order.customerId = customer._id, order.status = "delivered"
  3. Assert now() < order.claimWindowExpiresAt
  4. Call cloudinary.getSignedUploadToken:
       folder      = "hive/claim-evidence/" + customer._id
       resource_type = "video" (for unboxing_video) OR "image"
       max_file_size = 500MB (video), 20MB (image)
       moderation  = "manual"   ← prevents public access before review
       type        = "private"  ← signed URL required to access
  5. Return { uploadToken, uploadUrl }

---

Mutation: claims.submit
Caller: customer
Transaction: ATOMIC

Inputs:
  orderId, orderItemId,
  type: "damage" | "wrong_item" | "missing_item",
  description: string,
  evidences: [{ cloudinaryPublicId, url, type, durationSeconds? }]

Steps:
  1. requireRole(ctx, "customer")
  2. Fetch order; assert order.customerId = customer._id
  3. Assert order.status = "delivered"
  4. Assert now() < order.claimWindowExpiresAt → else throw CLAIM_WINDOW_EXPIRED
  5. Fetch orderItem; assert orderItem.orderId = orderId
  6. Check no existing open claim for orderItemId:
       query claims.by_orderId where orderId matches
       filter for status NOT IN ["rejected", "closed"]
       if found → throw CLAIM_ALREADY_EXISTS
  7. Validate evidence:
       - Must include exactly 1 item with type="unboxing_video"
       - If missing → throw UNBOXING_VIDEO_REQUIRED
       - Unboxing video url must be a valid Cloudinary URL in hive/claim-evidence/
  8. Generate claim number: "CLM-" + YYYYMMDD + "-" + zeroPad(dailySeq, 4)
  9. Create claims document:
       claimNumber     = generated
       orderId, orderItemId, customerId, boutiqueId
       type, description
       status          = "submitted"
       submittedAt     = now()
       windowExpiresAt = order.claimWindowExpiresAt
  10. Create claimEvidence documents for each evidence item:
       isPrimary = (evidence.type === "unboxing_video")
       isSigned  = true
  11. Update order.status = "claim_submitted"
  12. Update customerProfile.totalClaimsSubmitted += 1
  13. Notify admin: type="claim_received" with claim details
  14. Notify customer: type="claim_received" — confirmation
  15. Write auditLog: action="claim.submitted"
  
  Return { claimId, claimNumber }
```

---

### 5.3 Admin Claim Review

```
Mutation: claims.startReview
Caller: admin

Steps:
  1. requireRole(ctx, "admin")
  2. Assert claim.status = "submitted"
  3. Update:
       status     = "under_review"
       reviewedBy = admin._id
       reviewedAt = now()
  4. Admin views claimEvidence — evidence URLs are private Cloudinary signed URLs
     (generated on-demand with 15-min expiry)
  5. Write auditLog

---

Action: claims.getEvidenceSignedUrl
Caller: admin

Steps:
  1. requireRole(ctx, "admin")
  2. Fetch claimEvidence
  3. Call Cloudinary Admin API: generate_signed_url(publicId, expiry=900)
  4. Return signed URL (15-min expiry — never stored)

---

Mutation: claims.approve
Caller: admin

Inputs: claimId, adminNotes?

Steps:
  1. requireRole(ctx, "admin")
  2. Assert claim.status = "under_review"
  3. Update claim:
       status     = "approved"
       resolution = "replacement"   ← default: replacement first
       adminNotes = args.adminNotes
  4. Update order.status = "replacement_requested"
  5. Notify boutique:
       type = "replacement_requested"
       body = "Claim [claimNumber] approved. Please confirm replacement availability."
  6. Write auditLog: action="claim.approved"

---

Mutation: claims.reject
Caller: admin

Inputs: claimId, adminNotes (required)

Steps:
  1. requireRole(ctx, "admin")
  2. Assert claim.status IN ["submitted", "under_review"]
  3. Update:
       status     = "rejected"
       resolution = "rejected"
       adminNotes = args.adminNotes   // rejection reason (mandatory)
  4. Update order.status = "cancelled"   // claim rejected = order closed
  5. Notify customer:
       type = "claim_rejected"
       body = "Your claim [claimNumber] has been reviewed. [adminNotes]"
  6. Write auditLog
```

---

### 5.4 Replacement Flow

```
Mutation: boutiques.confirmReplacementStock
Caller: boutique_owner

Inputs: claimId, hasStock: boolean

Steps:
  1. requireBoutiqueOwnership(ctx, claim.boutiqueId)
  2. Assert claim.status = "approved" OR "replacement_initiated"
  
  IF hasStock = true:
    a. Verify actual inventory:
         Fetch original orderItem (variantId, quantity)
         Fetch inventory: assert quantityAvailable >= orderItem.quantity
         Reserve stock for replacement
    b. Update claim:
         status = "replacement_approved"
    c. Update order.status = "replacement_approved"
    d. Schedule: logistics.createShipment for replacement
       - New shipment created
       - New replacement orders document created with status="replacement_dispatched"
    e. Notify customer: type="replacement_dispatched"
    f. Write auditLog: action="claim.replacement_approved"
  
  IF hasStock = false:
    a. Update claim:
         status     = "refund_requested"
         resolution = "refund"
    b. Update order.status = "refund_requested"
    c. Notify admin: "Replacement not available for CLM-[number] — please process refund"
    d. Write auditLog: action="claim.replacement_unavailable"

---

Mutation: claims.approveRefund
Caller: admin

Inputs: claimId, refundAmount (paise)

Steps:
  1. requireRole(ctx, "admin")
  2. Assert claim.status = "refund_requested"
  3. Assert refundAmount > 0 AND refundAmount <= order.total
  4. Update claim:
       status       = "refund_approved"
       refundAmount = args.refundAmount
  5. Update order.status = "refund_requested"
  6. Trigger: payments.initiateRefund({ paymentId, refundAmount })
  7. Notify customer: "Refund of ₹[amount] approved, processing in 5–7 business days"

---

Action: payments.initiateRefund
Caller: admin (triggered from claims flow)

Steps:
  1. Fetch payment record
  2. Assert payment.status = "captured"
  3. Call Razorpay Refunds API:
       POST /payments/{razorpayPaymentId}/refund
       { amount: refundAmount }
  4. On success:
       Update payment: refundId, refundAmount, status="refunded", refundedAt
       Update order.status = "refunded"
       Update order.paymentStatus = "refunded"
       Update claim.status = "refunded"
  5. Notify customer: type="refund_processed"
  6. Write auditLog: action="payment.refunded"
  
  On Razorpay API failure:
    Log error, retry via scheduled function (max 3 attempts)
    Alert admin if all retries fail
```

---

### 5.5 Claim Deadline Cron

```
Cron: crons/checkClaimDeadlines.ts
Schedule: every 15 minutes

Logic:
  1. Find orders where:
       status = "delivered"
       claimWindowExpiresAt < now()
     These orders have passed the 48h window
  
  2. For each: No action needed on the order itself
     (order stays "delivered" — this is terminal for no-claim orders)
  
  3. Find claims where:
       status IN ["submitted"]
       windowExpiresAt < now()
       (Claims submitted but admin hasn't reviewed within the window)
     → This shouldn't happen in normal ops but handled as safety net
     → Alert admin: "Pending claim past delivery window"
  
  4. Find claims where:
       status = "replacement_initiated"
       updatedAt < now() - 24_hours
     Boutique hasn't responded to replacement request
     → Alert boutique + admin
```

---

## 6. Hive Score Engine

### 6.1 Overview

The Hive Score is a **0–100 reliability score** computed for both customers and boutiques. Recalculated by a scheduled Convex function. Stored in `hiveScores` collection. Denormalised into `customerProfiles.hiveScore` and `boutiques.hiveScore` for fast reads.

---

### 6.2 Customer Hive Score

**Formula:**

```
CustomerHiveScore = (
  orderCompletionRate  × 0.50 +
  claimRate            × 0.30 +   // inverted: lower claims = higher score
  fraudSignalScore     × 0.20
) × 100

Clamped to [0, 100]
```

**Component Definitions:**

| Component | Calculation | Weight |
|-----------|------------|--------|
| `orderCompletionRate` | (delivered orders) / (total orders placed) | 0.50 |
| `claimRate` | `1 - (approved_claims / delivered_orders)` — inverted | 0.30 |
| `fraudSignalScore` | 1.0 = no signals, decrements on fraud indicators | 0.20 |

**Fraud Signal Inputs for `fraudSignalScore`:**

| Signal | Penalty |
|--------|---------|
| Claim rejected (evidence invalid) | −0.15 per event |
| Claim submission spike (>2 in 30 days) | −0.10 per extra claim |
| Order cancelled post-confirmation | −0.05 per event |
| Chargeback filed via bank | −0.30 per event |
| Evidence video timestamp mismatch | −0.20 per event |

```
fraudSignalScore = max(0, 1.0 - sum(penalties))
```

---

### 6.3 Boutique Hive Score

**Formula:**

```
BoutiqueHiveScore = (
  orderCompletionRate  × 0.35 +
  responseSlaRate      × 0.25 +
  deliverySuccessRate  × 0.20 +
  repeatCustomerRate   × 0.10 +
  claimRate            × 0.10   // inverted
) × 100

Clamped to [0, 100]
```

**Component Definitions:**

| Component | Calculation | Weight |
|-----------|------------|--------|
| `orderCompletionRate` | (confirmed+delivered) / (total received) | 0.35 |
| `responseSlaRate` | (orders confirmed within 2h) / (total received) | 0.25 |
| `deliverySuccessRate` | (delivered) / (shipped) | 0.20 |
| `repeatCustomerRate` | (customers with ≥2 orders) / (total customers) | 0.10 |
| `claimRate` | `1 - (claims received / orders delivered)` | 0.10 |

---

### 6.4 Score Bands

| Band | Score Range | Effect |
|------|------------|--------|
| Excellent | 85–100 | Featured badge, priority in search results |
| Good | 70–84 | Standard listing |
| Fair | 50–69 | Warning visible to admin |
| Poor | 30–49 | Admin review triggered |
| Critical | 0–29 | Admin intervention required; boutique flagged |

---

### 6.5 Recalculation Rules

```
Scheduled Function: crons/recalculateHiveScores.ts
Schedule: Daily at 02:00 IST (UTC+5:30)

Logic:
  1. Query all boutiques with status="approved"
  2. For each boutique:
     a. Fetch orders in last 90 days (rolling window)
     b. Compute all score components
     c. Compute BoutiqueHiveScore
     d. Upsert hiveScores document (create if first time, else update)
     e. Update boutiques.hiveScore (denormalised)
     f. If score dropped below 30 → trigger admin alert
  
  3. Query all customers with totalOrders >= 3 (min sample size)
  4. For each customer:
     a. Fetch orders in last 90 days
     b. Compute CustomerHiveScore
     c. Upsert hiveScores
     d. Update customerProfiles.hiveScore
     e. If fraudSignalScore < 0.5 → flag customer for admin review
```

---

### 6.6 Penalty Events — Triggered in Real-Time

```
Within relevant mutations, immediately update pending fraud signals:

On claims.reject (claim was fraudulent/invalid):
  Action: hiveScores.recordFraudSignal({
    entityType: "customer",
    entityId: claim.customerId,
    signal: "claim_rejected",
    weight: 0.15
  })
  → Score recalculates on next daily run

On orders.rejectByBoutique (boutique rejects valid order):
  - Logged as SLA event; not a fraud signal
  - Affects responseSlaRate on next recalculation

On orders.auto_cancelled_sla (boutique missed SLA):
  - Affects boutique.orderCompletionRate
  - If > 3 times in 30 days → immediate admin alert
```

---

## 7. Inventory Rules

### 7.1 Reservation Logic (Order Creation)

```
GOAL: Prevent two customers from purchasing the last unit simultaneously

APPROACH: Optimistic locking within a single Convex mutation
  (Convex mutations are serialised — no two mutations execute concurrently
   against the same document, making this safe without explicit locks)

reserveStockForOrder(orderId, items):  // called within orders.create
  For each { variantId, quantity } in items:
    
    1. Fetch inventory by variantId (single document, indexed)
    2. CHECK: inventory.quantityAvailable >= quantity
       If false:
         Throw INSUFFICIENT_STOCK({
           variantId,
           productName: <snapshot>,
           requestedQty: quantity,
           availableQty: inventory.quantityAvailable
         })
         → Entire orders.create mutation rolls back automatically
    
    3. UPDATE inventory (atomic within mutation):
         quantityReserved  += quantity
         quantityAvailable -= quantity
         updatedAt          = now()
    
    4. Check low stock alert:
       IF inventory.quantityAvailable < inventory.lowStockThreshold:
         Schedule notification: type="low_stock_alert" to boutique
         (use ctx.scheduler.runAfter(0) to not block order creation)
```

---

### 7.2 Stock Release Logic (Cancellation)

```
releaseStockForOrder(orderId):  // called on any cancellation path

Steps:
  1. Fetch all orderItems for orderId
  2. For each orderItem:
     a. Fetch inventory by variantId
     b. UPDATE:
          quantityReserved  -= orderItem.quantity
          quantityAvailable += orderItem.quantity
          updatedAt          = now()
     c. Clamp: quantityReserved = max(0, quantityReserved)
              quantityAvailable = min(quantityTotal, quantityAvailable)

Called by:
  - orders.cancelByCustomer
  - orders.rejectByBoutique
  - cron auto-cancel (SLA breach)
  - orders.cancelByAdmin (pre-shipped)
  - payments webhook: payment.failed
```

---

### 7.3 Stock Decrement (Order Confirmation)

```
decrementStockForOrder(orderId):  // called when boutique confirms order

Steps:
  For each orderItem:
    1. Fetch inventory by variantId
    2. UPDATE:
         quantityTotal     -= orderItem.quantity  // physical stock reduced
         quantityReserved  -= orderItem.quantity  // reservation fulfilled
         // quantityAvailable stays SAME (was already decremented on reserve)
         updatedAt          = now()
    3. Clamp all values to >= 0

Called by:
  - orders.confirmByBoutique (atomically within confirmation mutation)
```

---

### 7.4 Manual Stock Update (Boutique)

```
Mutation: inventory.updateStock
Caller: boutique_owner

Inputs: variantId, newTotalQuantity

Steps:
  1. requireBoutiqueOwnership(ctx, inventory.boutiqueId)
  2. Fetch inventory
  3. VALIDATE: newTotalQuantity >= inventory.quantityReserved
     If false → throw CANNOT_REDUCE_BELOW_RESERVED({
       variantId,
       currentReserved: inventory.quantityReserved,
       requestedTotal:  newTotalQuantity
     })
  4. UPDATE:
       quantityTotal     = newTotalQuantity
       quantityAvailable = newTotalQuantity - inventory.quantityReserved
       lastUpdatedBy     = user._id
       updatedAt         = now()
  5. Write auditLog: action="inventory.updated", before/after

---

Mutation: inventory.bulkUpdate
Caller: boutique_owner

Inputs: [{ variantId, newTotalQuantity }]

Steps:
  1. Run all validations first (fail fast — report all errors before updating any)
  2. Apply all updates atomically (single mutation)
```

---

### 7.5 Checkout Lock Sequence

```
FULL CHECKOUT LOCK SEQUENCE:

T=0ms  Customer clicks "Place Order"
       → orders.create mutation begins (single Convex mutation)
       → Inventory reserved atomically
       → Order created with status="pending_payment"
       → Mutation completes: order is in DB

T=100ms Client receives orderId, calls payments.createRazorpayOrder
       → Razorpay order created
       → Client opens Razorpay checkout modal

T=? Customer completes payment OR abandons

IF abandoned (order stays pending_payment):
  Cron: crons/expireAbandonedOrders.ts (runs hourly)
    - Find orders with status="pending_payment" AND createdAt < now() - 30min
    - Release inventory
    - Release delivery slot
    - Mark order "cancelled" with reason="payment_abandoned"

IF payment captured:
  → Razorpay webhook arrives
  → Order moves to pending_confirmation
  → Inventory remains reserved until boutique confirms

GUARANTEE:
  quantityAvailable is always non-negative.
  No order can be confirmed against 0 available stock.
```

---

## 8. Logistics Integration

### 8.1 Provider Abstraction

```
All logistics calls go through an internal adapter:

// convex/lib/logistics/LogisticsAdapter.ts

interface LogisticsProvider {
  createShipment(params: CreateShipmentParams): Promise<ShipmentResponse>
  getTracking(awbNumber: string): Promise<TrackingResponse>
  cancelShipment(awbNumber: string): Promise<void>
  generateLabel(awbNumber: string): Promise<string>  // PDF URL
}

class DelhiveryAdapter implements LogisticsProvider { ... }
class ShiprocketAdapter implements LogisticsProvider { ... }

getProvider(name: string): LogisticsProvider
  - Returns correct adapter based on env config or provider name
  - Enables future multi-provider routing without changing caller code
```

---

### 8.2 Shipment Creation Flow

```
Action: logistics.createShipment
Caller: Admin (manual trigger) OR System (scheduled after order.confirmed)

Inputs: orderId

Steps:
  1. requireAnyRole(ctx, "admin") OR called from scheduled function
  2. Fetch order; assert order.status === "confirmed"
  3. Assert order.shipmentId === null (not already shipped)
  4. Fetch boutique (for pickup address)
  5. Fetch orderItems (for parcel contents)
  
  6. Build shipment payload:
     payload = {
       pickup_address: {
         name:    boutique.name,
         line1:   boutique.address.line1,
         city:    boutique.address.city,
         state:   boutique.address.state,
         pincode: boutique.address.pincode,
         phone:   boutique.phoneNumber,
       },
       delivery_address: {
         name:    order.deliveryAddress.label,  // or customer name
         line1:   order.deliveryAddress.line1,
         line2:   order.deliveryAddress.line2,
         city:    order.deliveryAddress.city,
         state:   order.deliveryAddress.state,
         pincode: order.deliveryAddress.pincode,
         phone:   customer.phone,
       },
       items: orderItems.map(item => ({
         name:     item.productName,
         sku:      item.sku,
         quantity: item.quantity,
         price:    item.priceAtPurchase / 100,  // convert paise to rupees
       })),
       payment_method: "PREPAID",
       order_id:       order.orderNumber,
       weight:         calculateWeight(orderItems),  // kg
       dimensions:     { length: 30, width: 25, height: 5 },  // defaults
     }
  
  7. Call LogisticsProvider.createShipment(payload):
     On success:
       a. Create shipments document:
            orderId            = order._id
            provider           = LOGISTICS_PROVIDER
            awbNumber          = response.awb
            providerShipmentId = response.shipment_id
            status             = "created"
            trackingUrl        = response.tracking_url
            pickupAddress      = boutique address snapshot
            deliveryAddress    = order.deliveryAddress snapshot
            rawWebhookEvents   = []
       
       b. Update order:
            shipmentId = shipment._id
            status     = "pickup_scheduled"
       
       c. Notify boutique:
            type = "pickup_scheduled"
            body = "Pickup scheduled for order [orderNumber]. AWB: [awb]"
       
       d. Notify customer:
            type = "order_picked_up"  (not yet — this is pickup_scheduled)
            body = "Your order is packed and awaiting pickup."
       
       e. Write auditLog: action="shipment.created"
       f. Return { shipmentId, awbNumber, trackingUrl }
     
     On API failure:
       a. Log error with full details
       b. Write auditLog: action="shipment.creation_failed"
       c. Alert admin: "Shipment creation failed for [orderNumber] — manual action needed"
       d. Retry up to 3 times with exponential backoff:
            attempt 1: immediate
            attempt 2: 5 minutes later
            attempt 3: 30 minutes later
       e. After 3 failures: mark order with flag, require admin manual shipment
```

---

### 8.3 Webhook Handling

```
HTTP Action: webhooks/logistics
Route: POST /webhooks/logistics

Steps:
  1. Parse raw body
  2. Identify provider from X-Provider-Name header
  3. Verify HMAC-SHA256 signature:
       compute = HMAC-SHA256(rawBody, LOGISTICS_WEBHOOK_SECRET_[PROVIDER])
       compare with X-Provider-Signature
       If mismatch → log, return 401
  
  4. Parse event:
       { awb, status, timestamp, location?, remarks?, raw_data? }
  
  5. Idempotency check:
       Compute eventId = hash(awb + status + timestamp)
       Query webhookEvents.by_source_eventId where source="logistics" AND eventId=eventId
       If found AND status="processed" → return 200 (already handled)
  
  6. Create webhookEvents record: status="received"
  7. Fetch shipment by awbNumber
  8. If shipment not found → log warning, mark webhook as "failed", return 200
  
  9. Append to shipment.rawWebhookEvents:
       { timestamp, status, location, remarks, rawPayload: JSON.stringify(body) }
  
  10. Map provider status → internal status:
      Provider Status      → Internal Status
      ─────────────────────────────────────
      "pickup_scheduled"   → "pickup_scheduled"
      "picked_up"          → "picked_up"
      "in_transit"         → "in_transit"
      "out_for_delivery"   → "out_for_delivery"
      "delivered"          → "delivered"
      "failed_delivery"    → "failed"
      "returned"           → "returned"
      
  11. Update shipment.status = mappedStatus
      Update shipment.lastWebhookAt = now()
  
  12. Route to order status updater:
  
      "pickup_scheduled":
        order.status = "pickup_scheduled"
      
      "picked_up":
        order.status = "picked_up"
        Notify customer: type="order_picked_up"
        Notify boutique: "Package has been collected by courier"
      
      "in_transit":
        order.status = "in_transit"
        Notify customer: type="order_in_transit"
      
      "out_for_delivery":
        order.status = "out_for_delivery"
        Notify customer: type="order_out_for_delivery"
          body = "Your order is out for delivery today!"
      
      "delivered":
        shipment.deliveredAt        = now()
        order.status                = "delivered"
        order.deliveredAt           = now()
        order.claimWindowExpiresAt  = now() + 48 * 60 * 60 * 1000
        order.paymentStatus         = "paid" (confirm final)
        Notify customer: type="order_delivered"
          body = "Your order has been delivered! You have 48 hours to raise a claim."
        Schedule: settlement task for commission (V1)
      
      "failed":
        Alert admin: "Delivery failed for [orderNumber] — logistics provider returned: [remarks]"
        order.status remains "out_for_delivery" (admin decides next action)
      
      "returned":
        Alert admin: "Shipment returned for [orderNumber]"
        order requires manual resolution
  
  13. Update webhookEvents.status = "processed"
  14. Return 200 OK
```

---

### 8.4 Tracking Status Sync (Polling Fallback)

```
Cron: crons/pollStaleShipments.ts
Schedule: every 30 minutes

Logic:
  1. Find shipments where:
       status IN ["pickup_scheduled", "picked_up", "in_transit"]
       AND lastWebhookAt < now() - 1_hour
  
  2. For each stale shipment:
     a. Call LogisticsProvider.getTracking(awb)
     b. Compare returned status with shipment.status
     c. If different → trigger same logic as webhook handler (step 9-13 above)
     d. If same → update shipment.lastWebhookAt = now()
  
  3. If shipment.status = "in_transit" AND createdAt < now() - 72_hours:
     Alert admin: "Shipment [awb] has been in transit for >72 hours"
```

---

## 9. Convex Functions Registry

### 9.1 Module: `auth`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `auth.syncClerkUser` | mutation | Any (post-login) | Upsert user on first/subsequent logins |
| `auth.getCurrentUser` | query | Any | Return own user + profile |
| `auth.updateRole` | mutation | Admin | Change a user's role |
| `auth.disableUser` | mutation | Admin | Set isActive=false + revoke Clerk session |
| `auth.enableUser` | mutation | Admin | Restore user access |
| `auth.createAdminUser` | mutation | Admin | Create admin-role user |

---

### 9.2 Module: `serviceability`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `serviceability.check` | query | Public | Check pincode → region mapping |
| `serviceability.checkByCoords` | action | Customer | Reverse geocode via Nominatim → check region |
| `serviceability.getRegions` | query | Public | List all active regions with polygons |
| `serviceability.getRegionByPincode` | query | Public | Direct pincode lookup |
| `serviceability.createRegion` | mutation | Admin | Create delivery region |
| `serviceability.updateRegion` | mutation | Admin | Edit region pincodes/polygon |
| `serviceability.toggleRegion` | mutation | Admin | Enable/disable region |

---

### 9.3 Module: `boutiques`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `boutiques.register` | mutation | Any user | Submit boutique application |
| `boutiques.get` | query | Public | Get approved boutique profile |
| `boutiques.getOwn` | query | Boutique | Get own boutique (any status) |
| `boutiques.list` | query | Public | Paginated approved boutiques |
| `boutiques.listAdmin` | query | Admin | All boutiques with all statuses |
| `boutiques.updateProfile` | mutation | Boutique | Edit name, description, contact |
| `boutiques.uploadDocumentToken` | action | Boutique | Get Cloudinary signed token for doc upload |
| `boutiques.confirmDocumentUpload` | mutation | Boutique | Record document after Cloudinary upload |
| `boutiques.approve` | mutation | Admin | Approve boutique |
| `boutiques.reject` | mutation | Admin | Reject boutique with reason |
| `boutiques.suspend` | mutation | Admin | Suspend + disable all products |
| `boutiques.unsuspend` | mutation | Admin | Restore boutique |
| `boutiques.verifyDocument` | mutation | Admin | Verify/reject a boutique document |
| `boutiques.getDocuments` | query | Admin + Boutique | List documents for a boutique |
| `boutiques.getAnalytics` | query | Boutique + Admin | Sales metrics for boutique |

---

### 9.4 Module: `occasions`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `occasions.list` | query | Public | List active occasions sorted by sortOrder |
| `occasions.get` | query | Public | Get occasion by slug |
| `occasions.create` | mutation | Admin | Create occasion |
| `occasions.update` | mutation | Admin | Edit occasion |
| `occasions.toggle` | mutation | Admin | Enable/disable occasion |
| `occasions.reorder` | mutation | Admin | Update sortOrder |

---

### 9.5 Module: `products`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `products.list` | query | Public | Paginated catalog with filters |
| `products.get` | query | Public | Product detail with images + variants |
| `products.search` | query | Public | Search by name/tags |
| `products.listByOccasion` | query | Public | Filter by occasionId |
| `products.listByBoutique` | query | Public | Boutique catalog page |
| `products.listOwn` | query | Boutique | Own products (all statuses) |
| `products.listAdmin` | query | Admin | All products with all statuses |
| `products.create` | mutation | Boutique | Create product (draft) |
| `products.update` | mutation | Boutique | Edit draft/rejected product |
| `products.addVariant` | mutation | Boutique | Add size/color variant |
| `products.updateVariant` | mutation | Boutique | Edit variant price/color |
| `products.deactivateVariant` | mutation | Boutique | Disable a variant |
| `products.reorderImages` | mutation | Boutique | Change image sort order |
| `products.deleteImage` | mutation | Boutique | Remove an image |
| `products.submitForReview` | mutation | Boutique | Move draft → pending_review |
| `products.approve` | mutation | Admin | Approve product |
| `products.reject` | mutation | Admin | Reject with reason |
| `products.archive` | mutation | Boutique + Admin | Archive approved product |
| `products.unarchive` | mutation | Boutique + Admin | Move archived → draft |
| `products.getUploadToken` | action | Boutique | Get Cloudinary signed token for image |
| `products.getVideoUploadToken` | action | Boutique | Get Cloudinary signed token for video |
| `products.confirmImageUpload` | mutation | Boutique | Record image after Cloudinary upload |
| `products.confirmVideoUpload` | mutation | Boutique | Record video after Cloudinary upload |
| `products.incrementView` | mutation | System | Async view counter increment |

---

### 9.6 Module: `inventory`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `inventory.getByProduct` | query | Boutique + Admin | All variant stocks for a product |
| `inventory.getByVariant` | query | System | Stock for a single variant |
| `inventory.update` | mutation | Boutique | Set total stock for variant |
| `inventory.bulkUpdate` | mutation | Boutique | Update multiple variants at once |
| `inventory.reserveStock` | mutation | System (internal) | Lock stock on order creation |
| `inventory.releaseStock` | mutation | System (internal) | Release stock on cancellation |
| `inventory.decrementStock` | mutation | System (internal) | Commit sale on boutique confirm |

---

### 9.7 Module: `cart`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `cart.get` | query | Customer | Get cart with live stock/price validation |
| `cart.add` | mutation | Customer | Add item (validates stock + region) |
| `cart.update` | mutation | Customer | Change quantity |
| `cart.remove` | mutation | Customer | Remove item |
| `cart.clear` | mutation | Customer | Empty cart |
| `cart.validate` | query | Customer | Pre-checkout full validation check |

> **Note:** Cart in MVP is stored client-side (localStorage). The `cart.validate` query is called at checkout to verify all items are still available and region is still serviceable before creating the order.

---

### 9.8 Module: `orders`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `orders.create` | mutation | Customer | Full atomic order creation |
| `orders.get` | query | Customer + Boutique + Admin | Single order detail |
| `orders.listCustomer` | query | Customer | Own order history (paginated) |
| `orders.listBoutique` | query | Boutique | Orders for own boutique |
| `orders.listAdmin` | query | Admin | All orders with status filter |
| `orders.confirmByBoutique` | mutation | Boutique | Confirm order |
| `orders.rejectByBoutique` | mutation | Boutique | Reject order |
| `orders.cancelByCustomer` | mutation | Customer | Cancel pre-confirmation |
| `orders.cancelByAdmin` | mutation | Admin | Force cancel any order |
| `orders.generateOrderNumber` | mutation | System (internal) | Generate sequential order number |

---

### 9.9 Module: `payments`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `payments.createRazorpayOrder` | action | Customer | Create Razorpay order, return key+id |
| `payments.verifySignature` | mutation | Customer | Client-side signature verify (backup) |
| `payments.getStatus` | query | Customer + Admin | Payment status for order |
| `payments.initiateRefund` | action | Admin + System | Call Razorpay refund API |
| `payments.razorpayWebhook` | httpAction | System | Handle Razorpay webhooks |

---

### 9.10 Module: `deliverySlots`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `deliverySlots.list` | query | Customer | Available slots for region + date range |
| `deliverySlots.getAvailability` | query | Customer | Check if specific slot has capacity |
| `deliverySlots.create` | mutation | Admin | Create new slots |
| `deliverySlots.bulkCreate` | mutation | Admin | Create slots for date range |
| `deliverySlots.update` | mutation | Admin | Edit capacity/timing |
| `deliverySlots.disable` | mutation | Admin | Deactivate slot |

---

### 9.11 Module: `logistics`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `logistics.createShipment` | action | Admin + System | Create shipment via provider API |
| `logistics.getTracking` | query | Customer + Admin | Get tracking status + history |
| `logistics.pollShipmentStatus` | action | System (cron) | Poll provider API for updates |
| `logistics.logisticsWebhook` | httpAction | System | Handle logistics webhooks |
| `logistics.cancelShipment` | action | Admin | Cancel shipment with provider |
| `logistics.generateLabel` | action | Admin + Boutique | Get printable label URL |

---

### 9.12 Module: `claims`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `claims.getEvidenceUploadToken` | action | Customer | Signed Cloudinary token for evidence |
| `claims.submit` | mutation | Customer | Submit claim with evidence |
| `claims.get` | query | Customer + Admin | Claim detail |
| `claims.listCustomer` | query | Customer | Own claims |
| `claims.listBoutique` | query | Boutique | Claims affecting own boutique |
| `claims.listAdmin` | query | Admin | All claims with filters |
| `claims.startReview` | mutation | Admin | Move to under_review |
| `claims.approve` | mutation | Admin | Approve → replacement |
| `claims.reject` | mutation | Admin | Reject with reason |
| `claims.getEvidenceSignedUrl` | action | Admin | Generate time-limited evidence URL |
| `claims.confirmReplacementStock` | mutation | Boutique | Confirm/deny replacement inventory |
| `claims.approveRefund` | mutation | Admin | Approve refund when replacement unavailable |

---

### 9.13 Module: `reviews`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `reviews.submit` | mutation | Customer | Submit post-delivery verified review |
| `reviews.getByProduct` | query | Public | Published reviews for product |
| `reviews.getOwn` | query | Customer | Own reviews |
| `reviews.flag` | mutation | Admin | Flag review for moderation |
| `reviews.publish` | mutation | Admin | Publish or unpublish review |

---

### 9.14 Module: `notifications`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `notifications.getInApp` | query | Any | Own unread in-app notifications |
| `notifications.markRead` | mutation | Any | Mark notification(s) as read |
| `notifications.markAllRead` | mutation | Any | Mark all as read |
| `notifications.send` | action | System (internal) | Send WhatsApp/email via provider |
| `notifications.retry` | action | System (cron) | Retry failed notifications |

---

### 9.15 Module: `hiveScores`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `hiveScores.get` | query | Admin + Own entity | Get score + components |
| `hiveScores.recalculate` | action | System (cron) | Recalculate scores for all entities |
| `hiveScores.recalculateOne` | action | Admin | Force recalculate for specific entity |

---

### 9.16 Module: `analytics`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `analytics.track` | mutation | Any | Record analytics event |
| `analytics.getDashboard` | query | Admin | Platform KPIs (GMV, AOV, conversion) |
| `analytics.getBoutiqueDashboard` | query | Boutique + Admin | Boutique sales metrics |
| `analytics.getTopProducts` | query | Admin + Boutique | Best-selling products |
| `analytics.getOrderFunnel` | query | Admin | Checkout conversion funnel |

---

### 9.17 Module: `admin`

| Function | Type | Caller | Description |
|----------|------|--------|-------------|
| `admin.getAuditLogs` | query | Admin | Paginated audit trail |
| `admin.getUserDetails` | query | Admin | Any user's full profile |
| `admin.getPlatformMetrics` | query | Admin | Platform health metrics |
| `admin.manageOccasions` | mutation | Admin | CRUD occasions |
| `admin.moderateReview` | mutation | Admin | Flag/publish review |
| `admin.createAdminUser` | mutation | Admin | Add new admin |

---

### 9.18 Cron Jobs

| Cron | Schedule | Description |
|------|---------|-------------|
| `checkOrderSLA` | Every 15 min | Alert and auto-cancel boutique non-responders |
| `expireAbandonedOrders` | Every 30 min | Cancel orders with failed/abandoned payment |
| `checkClaimDeadlines` | Every 15 min | Monitor 48h claim windows |
| `pollStaleShipments` | Every 30 min | Polling fallback for silent logistics providers |
| `recalculateHiveScores` | Daily 02:00 IST | Recalculate all entity scores |
| `retryFailedNotifications` | Every 1 hour | Retry pending/failed notifications |
| `retryFailedRefunds` | Every 2 hours | Retry failed Razorpay refund calls |

---

## 10. Error Handling

### 10.1 Error Classification

All errors thrown in Convex functions use `ConvexError` with a structured payload:

```typescript
throw new ConvexError({
  code:    "INSUFFICIENT_STOCK",     // machine-readable
  message: "Not enough stock for variant XYZ",  // human-readable
  data:    { variantId, available: 0, requested: 2 }  // context
})
```

---

### 10.2 Error Code Registry

#### Authentication Errors

| Code | Trigger | HTTP Equivalent |
|------|---------|----------------|
| `UNAUTHENTICATED` | No valid JWT | 401 |
| `ACCOUNT_DISABLED` | user.isActive = false | 403 |
| `FORBIDDEN` | Role mismatch | 403 |
| `USER_NOT_FOUND` | Clerk user not synced | 404 |
| `BOUTIQUE_ACCESS_DENIED` | Boutique not owned by user | 403 |
| `BOUTIQUE_SUSPENDED` | Boutique is suspended | 403 |

---

#### Validation Errors

| Code | Trigger |
|------|---------|
| `INVALID_INPUT` | Generic validation failure |
| `REQUIRED_FIELD_MISSING` | Mandatory field absent |
| `INVALID_PINCODE` | Non-Indian or malformed pincode |
| `INVALID_PHONE` | Not E.164 format |
| `SLUG_CONFLICT` | Generated slug already exists |
| `DUPLICATE_SKU` | SKU already exists in boutique |
| `INVALID_PRICE` | Price = 0 or negative |
| `INVALID_REVIEW_RATING` | Rating outside 1–5 |

---

#### Business Logic Errors

| Code | Trigger |
|------|---------|
| `REGION_NOT_SERVICEABLE` | Customer address not in any active region |
| `SLOT_FULL` | Delivery slot at capacity |
| `SLOT_EXPIRED` | Slot date is in the past |
| `INSUFFICIENT_STOCK` | quantityAvailable < requested qty |
| `CART_MULTI_BOUTIQUE` | MVP: items from different boutiques |
| `BOUTIQUE_NOT_APPROVED` | Order against non-approved boutique |
| `PRODUCT_NOT_APPROVED` | Product not in approved+active state |
| `PRODUCT_NOT_READY` | Missing images/variants on review submit |
| `ORDER_STATUS_CONFLICT` | Action not valid for current order status |
| `CLAIM_WINDOW_EXPIRED` | now() > claimWindowExpiresAt |
| `CLAIM_ALREADY_EXISTS` | Non-closed claim for same orderItemId |
| `UNBOXING_VIDEO_REQUIRED` | No unboxing_video in claim evidence |
| `CANNOT_REDUCE_BELOW_RESERVED` | Inventory update below reserved qty |
| `PAYMENT_NOT_CAPTURED` | Order not paid, action requires payment |
| `REFUND_EXCEEDS_AMOUNT` | Refund amount > original payment |
| `DUPLICATE_REVIEW` | Customer already reviewed this orderItem |
| `REVIEW_NOT_PURCHASED` | Attempt to review without delivery |
| `BOUTIQUE_ALREADY_EXISTS` | User already has a boutique |

---

#### External Service Errors

| Code | Trigger | Retry? |
|------|---------|--------|
| `RAZORPAY_ORDER_FAILED` | Razorpay API error on order creation | Yes, 3× |
| `RAZORPAY_REFUND_FAILED` | Refund API call failed | Yes, 3× |
| `CLOUDINARY_TOKEN_FAILED` | Cloudinary sign failed | Yes, 1× |
| `LOGISTICS_CREATION_FAILED` | Shipment API call failed | Yes, 3× |
| `NOMINATIM_GEOCODE_FAILED` | OSM API timeout | Yes, 2× |
| `WEBHOOK_SIGNATURE_INVALID` | HMAC mismatch | No |
| `WEBHOOK_DUPLICATE` | Already processed event ID | No (200) |

---

### 10.3 Input Validation Rules

All mutation inputs validated using Convex `v.` validators at the schema level, plus business-rule validation inside the function body:

```
PHONE VALIDATION:
  - Must match /^\+91[6-9]\d{9}$/ (Indian mobile numbers)
  - Validated in auth.syncClerkUser and addresses.create

PINCODE VALIDATION:
  - Must match /^\d{6}$/ (6-digit Indian PIN)
  - Validated in addresses.create

PRICE VALIDATION:
  - Must be integer (paise)
  - Must be > 0
  - compareAtPrice must be >= price (if provided)

SLUG GENERATION:
  - Input: any string
  - Process: lowercase → strip special chars → replace spaces with "-"
  - Uniqueness: append "-[2|3|...]" suffix on collision

ORDER NUMBER FORMAT:
  - Pattern: HV-YYYYMMDD-NNNN
  - NNNN = daily sequential count (padded to 4 digits)
  - Reset to 0001 each new calendar day (IST)

CLAIM NUMBER FORMAT:
  - Pattern: CLM-YYYYMMDD-NNNN
  - Same sequential logic as orders

EVIDENCE URL VALIDATION:
  - Must start with Cloudinary domain (res.cloudinary.com/[cloud_name]/)
  - For unboxing_video: mimeType must be video/*
  - Max video duration: 10 minutes (validated via durationSeconds field)
```

---

### 10.4 Retry & Resilience Strategy

```
EXTERNAL API RETRY POLICY:

Razorpay Order Creation:
  - Max retries: 3
  - Backoff: 0s, 5s, 30s
  - On total failure: return RAZORPAY_ORDER_FAILED to client

Razorpay Refund:
  - Max retries: 3
  - Backoff: 0s, 5min, 30min (via scheduled functions)
  - On total failure: alert admin; flag payment record with refund_pending_manual

Logistics Shipment Creation:
  - Max retries: 3
  - Backoff: 0s, 5min, 30min (via scheduled functions)
  - On total failure: alert admin; order.status remains "confirmed" for manual processing

Nominatim Geocoding:
  - Max retries: 2
  - Backoff: 0s, 2s
  - On failure: return { serviceable: false } with error context (fail safe)

WEBHOOK IDEMPOTENCY:
  - Every webhook checked against webhookEvents collection before processing
  - Duplicate → return 200 immediately without reprocessing
  - Malformed → log, return 400, alert

NOTIFICATION FAILURES:
  - Failed notifications retried by cron (retryFailedNotifications, hourly)
  - Max 3 retries; after that: mark as permanently_failed
  - Critical notifications (order_confirmed, refund_processed) get Slack/PagerDuty alert
```

---

### 10.5 Audit Trail Coverage

Every state change in the system writes to `auditLogs`. Minimum required actions:

```
user.*          → user.created, user.role_changed, user.disabled
boutique.*      → boutique.registered, boutique.approved, boutique.rejected,
                  boutique.suspended, boutique.unsuspend
                  boutique.document_verified, boutique.document_rejected
product.*       → product.created, product.submitted_for_review, product.approved,
                  product.rejected, product.archived, product.variant_added
order.*         → order.created, order.payment_captured, order.boutique_confirmed,
                  order.boutique_rejected, order.cancelled, order.delivered,
                  order.auto_cancelled_sla
shipment.*      → shipment.created, shipment.status_updated
payment.*       → payment.captured, payment.failed, payment.refunded
claim.*         → claim.submitted, claim.review_started, claim.approved,
                  claim.rejected, claim.replacement_approved,
                  claim.replacement_unavailable, claim.refund_approved, claim.refunded
inventory.*     → inventory.updated, inventory.reserved, inventory.released,
                  inventory.decremented
```

---

*Document version: 1.0 | Lead Backend Engineer | June 2026*
*Based on: HIVE_PRD_V2.2 + HIVE_SYSTEM_ARCHITECTURE v1.0 + HIVE_CONVEX_DATA_MODEL v1.0*
*Stack: Next.js · TypeScript · Convex · Clerk · Cloudinary · Razorpay*
