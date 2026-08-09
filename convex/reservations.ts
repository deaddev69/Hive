// convex/reservations.ts
// Next-Day Reservation Flow — handles the complete lifecycle:
// Customer reserves → Store confirms/declines → Customer pays → Order created.
// Uses server-side scheduled functions for 30-minute timers.

import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser, getMyBoutique, getCurrentUserOrNull } from "./lib/auth";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { triggerNotification } from "./lib/notifications";
import { getBoutiqueStatus } from "./shared/boutiqueStatus";

const RESERVATION_TIMER_MS = 30 * 60 * 1000; // 30 minutes
const PAYMENT_TIMER_MS = 30 * 60 * 1000;     // 30 minutes

// ─── Customer: Create a Reservation ──────────────────────────────────────────
export const createReservation = mutation({
  args: {
    productId:    v.id("products"),
    size:         v.string(),
    quantity:     v.number(),
    token:        v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const now = Date.now();

    // 1. Validate product exists and is active
    const product = await ctx.db.get(args.productId);
    if (!product || (product as any).active === false) {
      throw new ConvexError("Product not found or no longer available.");
    }
    if ((product as any).approvalStatus && (product as any).approvalStatus !== "approved") {
      throw new ConvexError("Product is not yet available for purchase.");
    }

    // 2. Get boutique and validate it is closed (reservation only allowed when closed)
    const boutique = await ctx.db.get(product.boutiqueId as Id<"boutiques">);
    if (!boutique) {
      throw new ConvexError("Boutique not found.");
    }

    const boutiqueStatus = getBoutiqueStatus(boutique as any, now);
    if (boutiqueStatus.type === "OPEN") {
      throw new ConvexError("Store is currently open. Please use Buy Now instead.");
    }
    if (boutiqueStatus.type === "PAUSED") {
      throw new ConvexError("Store is temporarily unavailable. Cannot create reservation.");
    }

    // 3. Check stock availability for this size
    const stockMap: Record<string, number> = (product as any).stockBySize ?? {};
    const availableStock = stockMap[args.size] ?? 0;
    if (availableStock <= 0) {
      throw new ConvexError("This size is currently out of stock.");
    }

    // 4. Check existing active reservations for this product+size (stock-based limit)
    const activeReservations = await ctx.db
      .query("reservations")
      .withIndex("by_productId_size_status", (q) =>
        q.eq("productId", args.productId).eq("size", args.size).eq("status", "reservation_active")
      )
      .collect();
    const awaitingConfirmation = await ctx.db
      .query("reservations")
      .withIndex("by_productId_size_status", (q) =>
        q.eq("productId", args.productId).eq("size", args.size).eq("status", "awaiting_store_confirmation")
      )
      .collect();
    const awaitingPayment = await ctx.db
      .query("reservations")
      .withIndex("by_productId_size_status", (q) =>
        q.eq("productId", args.productId).eq("size", args.size).eq("status", "awaiting_payment")
      )
      .collect();

    const totalReserved = activeReservations.length + awaitingConfirmation.length + awaitingPayment.length;
    if (totalReserved >= availableStock) {
      throw new ConvexError("All units of this size are currently reserved. Please try again later.");
    }

    // 5. Prevent duplicate reservation by same customer for same product+size
    const existingUserReservation = activeReservations.find(r => r.customerId === user._id);
    const existingUserAwaiting = awaitingConfirmation.find(r => r.customerId === user._id);
    const existingUserPayment = awaitingPayment.find(r => r.customerId === user._id);
    if (existingUserReservation || existingUserAwaiting || existingUserPayment) {
      throw new ConvexError("You already have an active reservation for this product and size.");
    }

    // 6. Determine next operating day for scheduledConfirmDate
    const nextOperatingDay = (boutiqueStatus as any).nextOperatingDay ||
      new Date(now + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    // 7. Get product image URL
    const productImageUrl = (product as any).imageUrls?.[0] ||
      (product as any).images?.[0] ||
      (product as any).imageUrl || "";

    // 8. Create the reservation record
    const reservationExpiresAt = now + RESERVATION_TIMER_MS;
    const reservationId = await ctx.db.insert("reservations", {
      customerId: user._id,
      boutiqueId: product.boutiqueId as Id<"boutiques">,
      productId: args.productId,
      productName: (product as any).name || (product as any).title || "Product",
      productImageUrl,
      size: args.size,
      quantity: args.quantity,
      priceAtReserve: (product as any).price ?? 0,
      status: "reservation_active",
      reservationExpiresAt,
      scheduledConfirmDate: nextOperatingDay,
      boutiqueName: boutique.boutiqueName || (boutique as any).name || "",
      createdAt: now,
      updatedAt: now,
    });

    // 9. Schedule the expiry function for 30 minutes
    const scheduledId = await ctx.scheduler.runAfter(
      RESERVATION_TIMER_MS,
      internal.reservations.expireReservation,
      { reservationId }
    );

    // Store the scheduler ID for potential cancellation
    await ctx.db.patch(reservationId, {
      expiryScheduledId: scheduledId as unknown as string,
    });

    // 10. Notify store owner via push notification
    if (boutique.ownerUserId) {
      await triggerNotification(
        ctx,
        boutique.ownerUserId,
        "push",
        "reservation_placed",
        "reservation",
        reservationId as string,
        JSON.stringify({
          productName: (product as any).name || (product as any).title,
          size: args.size,
          customerName: user.email || "Customer",
          scheduledConfirmDate: nextOperatingDay,
        })
      );
    }

    return {
      reservationId,
      reservationExpiresAt,
      scheduledConfirmDate: nextOperatingDay,
      productName: (product as any).name || (product as any).title,
      size: args.size,
    };
  },
});

// ─── Internal: Expire a reservation after Timer 1 lapses ─────────────────────
export const expireReservation = internalMutation({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) return;

    // Only expire if still in an active/awaiting state
    if (
      reservation.status === "reservation_active" ||
      reservation.status === "awaiting_store_confirmation"
    ) {
      await ctx.db.patch(args.reservationId, {
        status: "reservation_expired",
        updatedAt: Date.now(),
      });

      // Notify customer
      await triggerNotification(
        ctx,
        reservation.customerId,
        "push",
        "reservation_expired",
        "reservation",
        args.reservationId as string,
        JSON.stringify({
          productName: reservation.productName,
          size: reservation.size,
        })
      );
    }
  },
});

// ─── Internal: Expire payment after Timer 2 lapses ───────────────────────────
export const expirePayment = internalMutation({
  args: { reservationId: v.id("reservations") },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) return;

    if (reservation.status === "awaiting_payment") {
      await ctx.db.patch(args.reservationId, {
        status: "payment_expired",
        updatedAt: Date.now(),
      });

      // Notify customer
      await triggerNotification(
        ctx,
        reservation.customerId,
        "push",
        "payment_expired",
        "reservation",
        args.reservationId as string,
        JSON.stringify({
          productName: reservation.productName,
          size: reservation.size,
        })
      );
    }
  },
});

// ─── Store Owner: Confirm product available ──────────────────────────────────
export const storeConfirmAvailable = mutation({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const boutique = await getMyBoutique(ctx);
    const now = Date.now();

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new ConvexError("Reservation not found.");
    }

    // Verify this reservation belongs to the store owner's boutique
    if (reservation.boutiqueId !== boutique._id) {
      throw new ConvexError("Unauthorized: This reservation does not belong to your store.");
    }

    // Only allow confirmation if in the right state
    if (
      reservation.status !== "reservation_active" &&
      reservation.status !== "awaiting_store_confirmation"
    ) {
      throw new ConvexError(`Cannot confirm: Reservation is in '${reservation.status}' state.`);
    }

    // Check if reservation timer has already expired
    if (now > reservation.reservationExpiresAt) {
      await ctx.db.patch(args.reservationId, {
        status: "reservation_expired",
        updatedAt: now,
      });
      throw new ConvexError("Reservation has already expired.");
    }

    const paymentExpiresAt = now + PAYMENT_TIMER_MS;

    // Update reservation status
    await ctx.db.patch(args.reservationId, {
      status: "awaiting_payment",
      storeConfirmedAt: now,
      paymentExpiresAt,
      updatedAt: now,
    });

    // Schedule payment expiry
    const scheduledId = await ctx.scheduler.runAfter(
      PAYMENT_TIMER_MS,
      internal.reservations.expirePayment,
      { reservationId: args.reservationId }
    );

    await ctx.db.patch(args.reservationId, {
      paymentExpiryScheduledId: scheduledId as unknown as string,
    });

    // Notify customer via push + whatsapp
    await triggerNotification(
      ctx,
      reservation.customerId,
      "push",
      "reservation_item_available",
      "reservation",
      args.reservationId as string,
      JSON.stringify({
        productName: reservation.productName,
        size: reservation.size,
        paymentExpiresAt,
        boutiqueName: reservation.boutiqueName,
      })
    );

    await triggerNotification(
      ctx,
      reservation.customerId,
      "whatsapp",
      "reservation_item_available",
      "reservation",
      args.reservationId as string,
      JSON.stringify({
        productName: reservation.productName,
        size: reservation.size,
        paymentExpiresAt,
        boutiqueName: reservation.boutiqueName,
      })
    );

    return { paymentExpiresAt };
  },
});

// ─── Store Owner: Mark product unavailable ───────────────────────────────────
export const storeDeclineUnavailable = mutation({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const boutique = await getMyBoutique(ctx);
    const now = Date.now();

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new ConvexError("Reservation not found.");
    }

    if (reservation.boutiqueId !== boutique._id) {
      throw new ConvexError("Unauthorized: This reservation does not belong to your store.");
    }

    if (
      reservation.status !== "reservation_active" &&
      reservation.status !== "awaiting_store_confirmation"
    ) {
      throw new ConvexError(`Cannot decline: Reservation is in '${reservation.status}' state.`);
    }

    await ctx.db.patch(args.reservationId, {
      status: "unavailable",
      storeDeclinedAt: now,
      updatedAt: now,
    });

    // Notify customer
    await triggerNotification(
      ctx,
      reservation.customerId,
      "push",
      "reservation_unavailable",
      "reservation",
      args.reservationId as string,
      JSON.stringify({
        productName: reservation.productName,
        size: reservation.size,
      })
    );

    await triggerNotification(
      ctx,
      reservation.customerId,
      "whatsapp",
      "reservation_unavailable",
      "reservation",
      args.reservationId as string,
      JSON.stringify({
        productName: reservation.productName,
        size: reservation.size,
      })
    );

    return { status: "unavailable" };
  },
});

// ─── Customer: Cancel a reservation ──────────────────────────────────────────
export const cancelReservation = mutation({
  args: {
    reservationId: v.id("reservations"),
    token:         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new ConvexError("Reservation not found.");
    }

    if (reservation.customerId !== user._id) {
      throw new ConvexError("Unauthorized: This reservation does not belong to you.");
    }

    if (
      reservation.status !== "reservation_active" &&
      reservation.status !== "awaiting_store_confirmation" &&
      reservation.status !== "awaiting_payment"
    ) {
      throw new ConvexError(`Cannot cancel: Reservation is in '${reservation.status}' state.`);
    }

    await ctx.db.patch(args.reservationId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { status: "cancelled" };
  },
});

// ─── Customer: Mark reservation as order_confirmed (after payment) ───────────
export const completeReservationPayment = mutation({
  args: {
    reservationId: v.id("reservations"),
    orderId:       v.id("orders"),
    token:         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) {
      throw new ConvexError("Reservation not found.");
    }

    if (reservation.status !== "awaiting_payment") {
      throw new ConvexError(`Cannot complete payment: Reservation is in '${reservation.status}' state.`);
    }

    // Server-side atomic check: honor payment if received before expiry (ties go to customer)
    if (reservation.paymentExpiresAt && now > reservation.paymentExpiresAt) {
      await ctx.db.patch(args.reservationId, {
        status: "payment_expired",
        updatedAt: now,
      });
      throw new ConvexError("Payment window has expired.");
    }

    await ctx.db.patch(args.reservationId, {
      status: "order_confirmed",
      paymentCompletedAt: now,
      orderId: args.orderId,
      updatedAt: now,
    });

    return { status: "order_confirmed", orderId: args.orderId };
  },
});

// ─── Customer: Get my reservations ───────────────────────────────────────────
export const getMyReservations = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) return [];

    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_customerId", (q) => q.eq("customerId", user._id))
      .order("desc")
      .take(50);

    return reservations;
  },
});

// ─── Customer: Get active reservations (for cart integration) ────────────────
export const getMyActiveReservations = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) return [];

    const allReservations = await ctx.db
      .query("reservations")
      .withIndex("by_customerId", (q) => q.eq("customerId", user._id))
      .order("desc")
      .collect();

    // Return only reservations that are still "alive"
    const activeStatuses = [
      "reservation_active",
      "awaiting_store_confirmation",
      "reservation_confirmed",
      "awaiting_payment",
    ];

    return allReservations.filter(r => activeStatuses.includes(r.status));
  },
});

// ─── Customer: Get a single reservation by ID ───────────────────────────────
export const getReservationById = query({
  args: {
    reservationId: v.id("reservations"),
    token:         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) return null;

    // Auth check: only the customer or the store owner can see it
    const user = await getCurrentUserOrNull(ctx, args.token);
    if (!user) return null;

    if (reservation.customerId !== user._id) {
      // Check if user is the store owner
      const boutique = await ctx.db.get(reservation.boutiqueId);
      if (!boutique || boutique.ownerUserId !== user._id) {
        return null;
      }
    }

    return reservation;
  },
});

// ─── Boutique: Get pending reservations ──────────────────────────────────────
export const getBoutiqueReservations = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token, true);

    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", boutique._id))
      .order("desc")
      .take(100);

    return reservations;
  },
});

// ─── Boutique: Get count of pending reservations (for badge) ─────────────────
export const getBoutiquePendingReservationCount = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token, true);

    const active = await ctx.db
      .query("reservations")
      .withIndex("by_boutiqueId_status", (q) =>
        q.eq("boutiqueId", boutique._id).eq("status", "reservation_active")
      )
      .collect();

    const awaiting = await ctx.db
      .query("reservations")
      .withIndex("by_boutiqueId_status", (q) =>
        q.eq("boutiqueId", boutique._id).eq("status", "awaiting_store_confirmation")
      )
      .collect();

    return active.length + awaiting.length;
  },
});

// ─── Admin: Get All Reservations ──────────────────────────────────────────────
export const getAllReservations_admin = query({
  args: {
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // We import requireRole dynamically or manually from auth.ts
    // For now we just use the user object to verify admin status if needed, 
    // or rely on the general pattern in the codebase.
    const user = await getAuthenticatedUser(ctx, args.token);
    if (user.role !== "admin") {
      throw new ConvexError("Unauthorized");
    }

    const reservations = await ctx.db.query("reservations").order("desc").collect();
    
    // Enrich with customer and boutique names
    const customerIds = Array.from(new Set(reservations.map((r) => r.customerId)));
    const boutiqueIds = Array.from(new Set(reservations.map((r) => r.boutiqueId)));

    const customers = await Promise.all(
      customerIds.map((id) => ctx.db.query("customerProfiles").withIndex("by_userId", q => q.eq("userId", id)).first())
    );
    const boutiques = await Promise.all(
      boutiqueIds.map((id) => ctx.db.get(id))
    );

    const customerMap = Object.fromEntries(
      customers.filter(Boolean).map((c) => [c!.userId, c!.displayName])
    );
    const boutiqueMap = Object.fromEntries(
      boutiques.filter(Boolean).map((b) => [b!._id, (b as any).name])
    );

    return reservations.map((r) => ({
      ...r,
      customerName: customerMap[r.customerId] || "Unknown Customer",
      boutiqueName: r.boutiqueName || boutiqueMap[r.boutiqueId] || "Unknown Boutique",
    }));
  },
});
