// convex/adminAuditLogs.ts
// Admin-only paginated audit log queries.

import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { paginationOptsValidator } from "convex/server";

export const getAdminAuditLogs = query({
  args: {
    paginationOpts: paginationOptsValidator,
    entityType: v.optional(v.string()),
    action: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    let queryChain;

    // Check if we can filter by indexed properties in the database query
    if (args.action) {
      queryChain = ctx.db.query("auditLogs").withIndex("by_action", (q) => q.eq("action", args.action!));
    } else {
      queryChain = ctx.db.query("auditLogs").withIndex("by_createdAt");
    }

    // Filter by entityType if provided
    if (args.entityType) {
      queryChain = queryChain.filter((q) => q.eq(q.field("entityType"), args.entityType));
    }

    const result = await queryChain.order("desc").paginate(args.paginationOpts);

    // Enrich page items
    const enrichedPage = await Promise.all(
      result.page.map(async (log) => {
        let actorEmail = "System";
        let actorName = "System Action";

        if (log.actorId) {
          const user = await ctx.db.get(log.actorId);
          if (user) {
            actorEmail = user.email || "No Email";
            const profile = await ctx.db
              .query("customerProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", user._id))
              .unique();
            actorName = profile?.displayName || user.email || "Admin User";
          }
        }

        // Try to get a human-friendly entity name
        let entityName = log.entityId;
        try {
          if (log.entityType === "products") {
            const prod = await ctx.db.get(log.entityId as any);
            if (prod) entityName = (prod as any).name;
          } else if (log.entityType === "boutiques") {
            const btq = await ctx.db.get(log.entityId as any);
            if (btq) entityName = (btq as any).boutiqueName;
          } else if (log.entityType === "categories") {
            const cat = await ctx.db.get(log.entityId as any);
            if (cat) entityName = (cat as any).name;
          } else if (log.entityType === "users") {
            const usr = await ctx.db.get(log.entityId as any);
            if (usr) entityName = (usr as any).email || usr._id;
          } else if (log.entityType === "claims") {
            const clm = await ctx.db.get(log.entityId as any);
            if (clm) entityName = (clm as any).claimNumber;
          }
        } catch {
          // ignore parsing error
        }

        return {
          ...log,
          actorEmail,
          actorName,
          entityName,
        };
      })
    );

    return {
      page: enrichedPage,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Normalized recent activity feed for admin dashboard.
 * Merges audit logs, claims, orders, and boutique applications.
 */
export const getAdminActivityFeed = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    // 1. Fetch top recent events from tables
    const [auditLogs, orders, claims, boutiqueApps] = await Promise.all([
      ctx.db.query("auditLogs").order("desc").take(15),
      ctx.db.query("orders").order("desc").take(10),
      ctx.db.query("claims").order("desc").take(10),
      ctx.db.query("boutiqueApplications").order("desc").take(10),
    ]);

    // 2. Normalize Audit Logs
    const enrichedLogs = await Promise.all(
      auditLogs.map(async (log) => {
        let actorEmail = "System";
        let actorName = "System Action";
        if (log.actorId) {
          const user = await ctx.db.get(log.actorId);
          if (user) {
            actorEmail = user.email || "No Email";
            const profile = await ctx.db
              .query("customerProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", user._id))
              .unique();
            actorName = profile?.displayName || user.email || "Admin User";
          }
        }
        let details = log.entityId;
        try {
          if (log.entityType === "products") {
            const prod = await ctx.db.get(log.entityId as any);
            if (prod) details = (prod as any).name;
          } else if (log.entityType === "boutiques") {
            const btq = await ctx.db.get(log.entityId as any);
            if (btq) details = (btq as any).boutiqueName;
          } else if (log.entityType === "categories") {
            const cat = await ctx.db.get(log.entityId as any);
            if (cat) details = (cat as any).name;
          }
        } catch {}

        let actionLabel = log.action;
        if (log.action === "product.moderated") actionLabel = "Product Hidden";
        else if (log.action === "product.unmoderated") actionLabel = "Product Moderation Lifted";
        else if (log.action === "product.deactivated_admin") actionLabel = "Product Deactivated";
        else if (log.action === "product.reactivated_admin") actionLabel = "Product Reactivated";
        else if (log.action === "boutique.suspended") actionLabel = "Boutique Suspended";
        else if (log.action === "boutique.activated") actionLabel = "Boutique Activated";

        return {
          id: log._id,
          type: "audit_log",
          timestamp: log.createdAt,
          action: actionLabel,
          details,
          actorName,
          actorEmail,
        };
      })
    );

    // 3. Normalize Orders
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const customer = await ctx.db.get(order.customerId);
        const customerProfile = customer
          ? await ctx.db.query("customerProfiles").withIndex("by_userId", (q) => q.eq("userId", customer._id)).unique()
          : null;
        const actorName = customerProfile?.displayName || customer?.email || "Customer";

        let actionLabel = "Order Placed";
        let timestamp = order.createdAt;

        if (order.status === "delivered") {
          actionLabel = "Order Delivered";
          timestamp = order.deliveredAt ?? order.updatedAt ?? order.createdAt;
        } else if (order.status === "cancelled") {
          actionLabel = "Order Cancelled";
          timestamp = order.cancelledAt ?? order.updatedAt ?? order.createdAt;
        } else if (order.status === "refunded") {
          actionLabel = "Refund Issued";
          timestamp = order.updatedAt ?? order.createdAt;
        }

        return {
          id: order._id,
          type: "order",
          timestamp,
          action: actionLabel,
          details: `Order #${order.orderNumber} (₹${((order.total || 0) / 100).toLocaleString("en-IN")})`,
          actorName,
          actorEmail: customer?.email || "",
        };
      })
    );

    // 4. Normalize Claims
    const enrichedClaims = await Promise.all(
      claims.map(async (claim) => {
        let actorId = claim.customerId;
        const isResolution = ["refund_approved", "refunded", "rejected", "closed"].includes(claim.status);
        if (isResolution && claim.reviewedBy) {
          actorId = claim.reviewedBy;
        }

        const user = await ctx.db.get(actorId);
        let actorEmail = "";
        let actorName = "User";
        if (user) {
          actorEmail = user.email || "";
          const profile = await ctx.db
            .query("customerProfiles")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .unique();
          actorName = profile?.displayName || user.email || (isResolution ? "Admin" : "Customer");
        }

        let actionLabel = "Claim Submitted";
        let timestamp = claim.submittedAt;

        if (claim.status === "refund_approved") {
          actionLabel = "Claim Approved";
          timestamp = claim.refundApprovedAt ?? claim.updatedAt ?? claim.submittedAt;
        } else if (claim.status === "refunded") {
          actionLabel = "Refund Issued";
          timestamp = claim.refundedAt ?? claim.updatedAt ?? claim.submittedAt;
        } else if (claim.status === "rejected") {
          actionLabel = "Claim Rejected";
          timestamp = claim.rejectedAt ?? claim.updatedAt ?? claim.submittedAt;
        } else if (claim.status === "closed") {
          actionLabel = "Claim Closed";
          timestamp = claim.closedAt ?? claim.updatedAt ?? claim.submittedAt;
        }

        const order = await ctx.db.get(claim.orderId);
        const details = order ? `Order ${order.orderNumber}` : `Claim ${claim.claimNumber}`;

        return {
          id: claim._id,
          type: "claim",
          timestamp,
          action: actionLabel,
          details,
          actorName,
          actorEmail,
        };
      })
    );

    // 5. Normalize Boutique Applications
    const enrichedBoutiqueApps = await Promise.all(
      boutiqueApps.map(async (app) => {
        let actionLabel = "New Boutique Application";
        let timestamp = app.createdAt;
        let actorId = app.userId;

        if (app.status === "APPROVED") {
          actionLabel = "Boutique App Approved";
          timestamp = app.approvedAt ?? app.createdAt;
          if (app.approvedBy) {
            actorId = app.approvedBy;
          }
        } else if (app.status === "REJECTED") {
          actionLabel = "Boutique App Rejected";
          timestamp = app.createdAt;
        }

        let actorEmail = app.email;
        let actorName = app.ownerName;

        if (app.status === "APPROVED" || app.status === "REJECTED") {
          if (app.approvedBy) {
            const admin = await ctx.db.get(app.approvedBy);
            if (admin) {
              actorEmail = admin.email || "";
              const profile = await ctx.db
                .query("customerProfiles")
                .withIndex("by_userId", (q) => q.eq("userId", admin._id))
                .unique();
              actorName = profile?.displayName || admin.email || "Admin User";
            }
          }
        } else {
          const user = await ctx.db.get(app.userId);
          if (user) {
            actorEmail = user.email || app.email;
            const profile = await ctx.db
              .query("customerProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", user._id))
              .unique();
            actorName = profile?.displayName || app.ownerName;
          }
        }

        return {
          id: app._id,
          type: "boutique_application",
          timestamp,
          action: actionLabel,
          details: app.boutiqueName,
          actorName,
          actorEmail,
        };
      })
    );

    // 6. Merge, Sort & Slice
    const feed = [
      ...enrichedLogs,
      ...enrichedOrders,
      ...enrichedClaims,
      ...enrichedBoutiqueApps,
    ];

    feed.sort((a, b) => b.timestamp - a.timestamp);
    return feed.slice(0, 10);
  },
});
