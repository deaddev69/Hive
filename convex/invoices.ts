// convex/invoices.ts
// Invoice queries and mutations for the HIVE marketplace application.
// All access is user-scoped and verified.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";
import { Id } from "./_generated/dataModel";

/**
 * Fetch a user-scoped invoice by its Order ID.
 */
export const getInvoiceByOrderId = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .unique();

    if (!invoice) return null;

    // Verify ownership
    if (invoice.userId !== user._id) {
      throw new Error("Unauthorized access to invoice");
    }

    return invoice;
  },
});

/**
 * Fetch a user-scoped invoice by its Invoice Number.
 */
export const getInvoiceByInvoiceNumber = query({
  args: { invoiceNumber: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_invoice_number", (q) => q.eq("invoiceNumber", args.invoiceNumber))
      .unique();

    if (!invoice) return null;

    // Verify ownership
    if (invoice.userId !== user._id) {
      throw new Error("Unauthorized access to invoice");
    }

    return invoice;
  },
});

/**
 * List all invoices for the authenticated user.
 */
export const getUserInvoices = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

/**
 * Fetch a user-scoped invoice by document ID for downloading.
 */
export const downloadInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice) return null;

    // Verify ownership
    if (invoice.userId !== user._id) {
      throw new Error("Unauthorized access to invoice");
    }

    return invoice;
  },
});

/**
 * Generate a temporary upload URL for file storage.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUser(ctx); // Auth check
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Set the resolved public PDF storage URL on an invoice record.
 */
export const updateInvoicePdfUrl = mutation({
  args: {
    invoiceId: v.id("invoices"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Verify ownership
    if (invoice.userId !== user._id) {
      throw new Error("Unauthorized to update invoice");
    }

    const pdfUrl = await ctx.storage.getUrl(args.storageId);
    if (!pdfUrl) {
      throw new Error("Failed to retrieve file storage URL");
    }

    await ctx.db.patch(args.invoiceId, { pdfUrl });
    return { pdfUrl };
  },
});
