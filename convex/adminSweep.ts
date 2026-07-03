// convex/adminSweep.ts
// Administrative tools for safely sweeping/resetting database state outside of production.
// CRITICAL: Blocked entirely in production environments.

import { mutation } from "./_generated/server";
import { requireRole } from "./lib/auth";

/**
 * Sweeps/purges all transactional and mock data from the database.
 * Preserves reference configuration, service zones, and diagnostic logs (auditLogs, systemAlerts, cronRuns).
 * STRICT GATING: Throws error immediately if process.env.CONVEX_ENV === "production" or process.env.NODE_ENV === "production".
 */
export const sweepDatabaseAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Production Gating check
    const IS_PRODUCTION =
      process.env.CONVEX_ENV === "production" ||
      process.env.NODE_ENV === "production";

    if (IS_PRODUCTION) {
      throw new Error("Database sweep unavailable in production");
    }

    // 2. Auth Check - Caller must be an admin
    const admin = await requireRole(ctx, "admin");

    // 3. Purge Transactional Data loops

    // Order Data
    const orders = await ctx.db.query("orders").collect();
    for (const r of orders) await ctx.db.delete(r._id);

    const orderItems = await ctx.db.query("orderItems").collect();
    for (const r of orderItems) await ctx.db.delete(r._id);

    const payments = await ctx.db.query("payments").collect();
    for (const r of payments) await ctx.db.delete(r._id);

    const shipments = await ctx.db.query("shipments").collect();
    for (const r of shipments) await ctx.db.delete(r._id);

    const invoices = await ctx.db.query("invoices").collect();
    for (const r of invoices) await ctx.db.delete(r._id);

    // Claims
    const claims = await ctx.db.query("claims").collect();
    for (const r of claims) await ctx.db.delete(r._id);

    const claimEvidence = await ctx.db.query("claimEvidence").collect();
    for (const r of claimEvidence) await ctx.db.delete(r._id);

    const claimEvents = await ctx.db.query("claimEvents").collect();
    for (const r of claimEvents) await ctx.db.delete(r._id);

    // Ledgers & Balances
    const commissionLedger = await ctx.db.query("commissionLedger").collect();
    for (const r of commissionLedger) await ctx.db.delete(r._id);

    const settlementLedger = await ctx.db.query("settlementLedger").collect();
    for (const r of settlementLedger) await ctx.db.delete(r._id);

    const payoutLedger = await ctx.db.query("payoutLedger").collect();
    for (const r of payoutLedger) await ctx.db.delete(r._id);

    const refundLedger = await ctx.db.query("refundLedger").collect();
    for (const r of refundLedger) await ctx.db.delete(r._id);

    // Catalog & Stock
    const products = await ctx.db.query("products").collect();
    for (const r of products) await ctx.db.delete(r._id);

    const productImages = await ctx.db.query("productImages").collect();
    for (const r of productImages) await ctx.db.delete(r._id);

    const productVideos = await ctx.db.query("productVideos").collect();
    for (const r of productVideos) await ctx.db.delete(r._id);

    const productVariants = await ctx.db.query("productVariants").collect();
    for (const r of productVariants) await ctx.db.delete(r._id);

    const inventory = await ctx.db.query("inventory").collect();
    for (const r of inventory) await ctx.db.delete(r._id);

    const inventoryMovements = await ctx.db.query("inventoryMovements").collect();
    for (const r of inventoryMovements) await ctx.db.delete(r._id);

    const inventoryVerifications = await ctx.db.query("inventoryVerifications").collect();
    for (const r of inventoryVerifications) await ctx.db.delete(r._id);

    // Boutique Profile and Document Verification logs
    const boutiqueDocuments = await ctx.db.query("boutiqueDocuments").collect();
    for (const r of boutiqueDocuments) await ctx.db.delete(r._id);

    const boutiqueDocumentEvents = await ctx.db.query("boutiqueDocumentEvents").collect();
    for (const r of boutiqueDocumentEvents) await ctx.db.delete(r._id);

    const boutiqueApplications = await ctx.db.query("boutiqueApplications").collect();
    for (const r of boutiqueApplications) await ctx.db.delete(r._id);

    const boutiques = await ctx.db.query("boutiques").collect();
    for (const r of boutiques) await ctx.db.delete(r._id);

    // Customer & User management
    const customerProfiles = await ctx.db.query("customerProfiles").collect();
    for (const r of customerProfiles) await ctx.db.delete(r._id);

    const addresses = await ctx.db.query("addresses").collect();
    for (const r of addresses) await ctx.db.delete(r._id);

    const userLocations = await ctx.db.query("userLocations").collect();
    for (const r of userLocations) await ctx.db.delete(r._id);

    const cartItems = await ctx.db.query("cartItems").collect();
    for (const r of cartItems) await ctx.db.delete(r._id);



    // Retain only admin users to prevent platform lock-out
    const users = await ctx.db.query("users").collect();
    for (const r of users) {
      if (r.role !== "admin") {
        await ctx.db.delete(r._id);
      }
    }

    // Secondary transactional logs and counters
    const notifications = await ctx.db.query("notifications").collect();
    for (const r of notifications) await ctx.db.delete(r._id);

    const reviews = await ctx.db.query("reviews").collect();
    for (const r of reviews) await ctx.db.delete(r._id);

    const identityLinks = await ctx.db.query("identityLinks").collect();
    for (const r of identityLinks) await ctx.db.delete(r._id);

    const serviceRequests = await ctx.db.query("serviceRequests").collect();
    for (const r of serviceRequests) await ctx.db.delete(r._id);

    const hiveScores = await ctx.db.query("hiveScores").collect();
    for (const r of hiveScores) await ctx.db.delete(r._id);

    const webhookEvents = await ctx.db.query("webhookEvents").collect();
    for (const r of webhookEvents) await ctx.db.delete(r._id);

    const rateLimits = await ctx.db.query("rateLimits").collect();
    for (const r of rateLimits) await ctx.db.delete(r._id);

    const adminRoleProposals = await ctx.db.query("adminRoleProposals").collect();
    for (const r of adminRoleProposals) await ctx.db.delete(r._id);

    // 4. Log the sweep event in audit logs (diagnostic log to preserve)
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: "database.sweep",
      entityType: "database",
      entityId: "all",
      metadata: JSON.stringify({
        sweptAt: Date.now(),
        sweptBy: admin.email || admin.phone || admin._id,
      }),
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "Database sweep completed successfully. Diagnostic logs, catalog config, and regions preserved.",
    };
  },
});
