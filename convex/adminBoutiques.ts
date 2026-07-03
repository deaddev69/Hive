// convex/adminBoutiques.ts
// Admin boutique onboarding compliance verification queries and mutations.

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

/**
 * Fetch compliance documents for a boutique, enriched with their timeline events.
 */
export const getBoutiqueDocumentsAdmin = query({
  args: { boutiqueId: v.id("boutiques") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const docs = await ctx.db
      .query("boutiqueDocuments")
      .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", args.boutiqueId))
      .collect();

    return await Promise.all(
      docs.map(async (doc) => {
        const events = await ctx.db
          .query("boutiqueDocumentEvents")
          .withIndex("by_documentId", (q) => q.eq("documentId", doc._id))
          .collect();

        // Sort events chronologically (oldest first)
        events.sort((a, b) => a.createdAt - b.createdAt);

        // Resolve fresh signed URL at query-time (prevents expired URL issues)
        const freshUrl = await ctx.storage.getUrl(doc.publicId);

        return {
          ...doc,
          url: freshUrl ?? doc.url, // fallback to stored value if resolution fails
          events,
        };
      })
    );
  },
});

/**
 * Mutation to approve or reject a boutique compliance document.
 * Enforces status transition guards:
 * - Current status 'verified' cannot change to 'pending' or 'rejected' without an explicit override.
 */
export const updateBoutiqueDocumentStatusAdmin = mutation({
  args: {
    documentId: v.id("boutiqueDocuments"),
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
    notes: v.optional(v.string()),
    override: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    const fromStatus = doc.status;
    const toStatus = args.status;

    if (fromStatus === toStatus) return args.documentId;

    // Enforce transition guards
    if (fromStatus === "verified" && !args.override) {
      throw new Error("Transition Guard: Document is already VERIFIED. Explicit override is required to modify it.");
    }

    const now = Date.now();
    await ctx.db.patch(args.documentId, {
      status: toStatus,
      verifiedBy: toStatus === "verified" ? admin._id : undefined,
      verifiedAt: toStatus === "verified" ? now : undefined,
      notes: args.notes,
    });

    // Log to document events timeline
    await ctx.db.insert("boutiqueDocumentEvents", {
      documentId: doc._id,
      boutiqueId: doc.boutiqueId,
      action: toStatus, // "verified" | "rejected" | "pending"
      actorId: admin._id,
      note: args.notes,
      createdAt: now,
    });

    // Log to system audit logs
    await ctx.db.insert("auditLogs", {
      actorId: admin._id,
      actorRole: "admin",
      action: `boutique_document.${toStatus}`,
      entityType: "boutiqueDocuments",
      entityId: doc._id,
      metadata: JSON.stringify({
        boutiqueId: doc.boutiqueId,
        type: doc.type,
        fromStatus,
        toStatus,
        notes: args.notes,
      }),
      createdAt: now,
    });

    return args.documentId;
  },
});

/**
 * Query the count of unverified (pending status) boutique documents.
 */
export const getPendingDocumentsCountAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const pendingDocs = await ctx.db
      .query("boutiqueDocuments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return pendingDocs.length;
  },
});

/**
 * Retrieve the boutiques compliance queue with completion stats.
 */
export const getComplianceQueueAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const boutiques = await ctx.db.query("boutiques").collect();

    return await Promise.all(
      boutiques.map(async (b) => {
        const docs = await ctx.db
          .query("boutiqueDocuments")
          .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", b._id))
          .collect();

        const pendingCount = docs.filter((d) => d.status === "pending").length;
        const verifiedCount = docs.filter((d) => d.status === "verified").length;
        const rejectedCount = docs.filter((d) => d.status === "rejected").length;
        const totalCount = docs.length;

        const gst = docs.find((d) => d.type === "gst_certificate")?.status || "missing";
        const pan = docs.find((d) => d.type === "pan")?.status || "missing";
        const tradeLicense = docs.find((d) => d.type === "trade_license")?.status || "missing";
        const bankProof = docs.find((d) => d.type === "bank_proof")?.status || "missing";
        const other = docs.find((d) => d.type === "other")?.status || "missing";

        return {
          _id: b._id,
          boutiqueName: b.boutiqueName,
          ownerName: b.ownerName,
          status: b.status, // PENDING, APPROVED, SUSPENDED, etc.
          compliance: {
            pendingCount,
            verifiedCount,
            rejectedCount,
            totalCount,
            gst,
            pan,
            tradeLicense,
            bankProof,
            other,
          },
        };
      })
    );
  },
});

/**
 * Log when an administrator views a document to record it in the compliance timeline.
 */
export const logDocumentViewedAdmin = mutation({
  args: { documentId: v.id("boutiqueDocuments") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    const now = Date.now();

    // Check if viewed event already exists to prevent spamming
    const existingEvents = await ctx.db
      .query("boutiqueDocumentEvents")
      .withIndex("by_documentId", (q) => q.eq("documentId", args.documentId))
      .collect();

    const alreadyViewed = existingEvents.some((e) => e.action === "viewed" && e.actorId === admin._id);
    if (alreadyViewed) return args.documentId;

    await ctx.db.insert("boutiqueDocumentEvents", {
      documentId: doc._id,
      boutiqueId: doc.boutiqueId,
      action: "viewed",
      actorId: admin._id,
      createdAt: now,
    });

    return args.documentId;
  },
});

/**
 * Developer mutation to seed mock compliance documents for boutiques that do not have them.
 */
export const seedBoutiqueDocumentsAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.ENABLE_DEBUG_TOOLS !== "true") {
      throw new Error("Seeding mock compliance documents is disabled in this environment.");
    }
    await requireRole(ctx, "admin");

    const boutiques = await ctx.db.query("boutiques").collect();
    const docTypes: Array<"gst_certificate" | "pan" | "trade_license" | "bank_proof"> = [
      "gst_certificate",
      "pan",
      "trade_license",
      "bank_proof",
    ];

    let seededCount = 0;
    const now = Date.now();

    for (const b of boutiques) {
      const existing = await ctx.db
        .query("boutiqueDocuments")
        .withIndex("by_boutiqueId", (q) => q.eq("boutiqueId", b._id))
        .collect();

      if (existing.length > 0) continue;

      for (const type of docTypes) {
        let url = "";
        if (type === "gst_certificate") {
          url = "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600";
        } else if (type === "pan") {
          url = "https://images.unsplash.com/photo-1543185377-b75222ac7b30?auto=format&fit=crop&q=80&w=600";
        } else if (type === "trade_license") {
          url = "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&q=80&w=600";
        } else if (type === "bank_proof") {
          url = "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?auto=format&fit=crop&q=80&w=600";
        }

        const docId = await ctx.db.insert("boutiqueDocuments", {
          boutiqueId: b._id,
          type,
          url,
          publicId: `mock_${type}_${b._id}`,
          status: "pending",
          createdAt: now - 30 * 60 * 1000,
        });

        await ctx.db.insert("boutiqueDocumentEvents", {
          documentId: docId,
          boutiqueId: b._id,
          action: "uploaded",
          createdAt: now - 30 * 60 * 1000,
        });

        seededCount++;
      }
    }

    return { seededCount };
  },
});
