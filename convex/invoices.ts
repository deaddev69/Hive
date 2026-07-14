// convex/invoices.ts
// Invoice queries and mutations for the HIVE marketplace application.
// Access is role-scoped and verified.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser, requireRole, getMyBoutique } from "./lib/auth";
import { Id } from "./_generated/dataModel";
import { formatMoney } from "./lib/money";

function formatInvoiceForClient(invoice: any) {
  if (!invoice) return null;
  return {
    ...invoice,
    subtotal: formatMoney(invoice.subtotal),
    deliveryFee: formatMoney(invoice.deliveryFee),
    discount: formatMoney(invoice.discount),
    tax: formatMoney(invoice.tax),
    totalAmount: formatMoney(invoice.totalAmount),
    items: invoice.items.map((item: any) => ({
      ...item,
      unitPrice: formatMoney(item.unitPrice),
      totalPrice: formatMoney(item.totalPrice),
    })),
  };
}

/**
 * Fetch a user-scoped invoice by its Order ID.
 */
export const getInvoiceByOrderId = query({
  args: { orderId: v.id("orders"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .unique();

    if (!invoice) return null;

    // Verify ownership
    if (invoice.userId !== user._id) {
      throw new Error("Unauthorized access to invoice");
    }

    return formatInvoiceForClient(invoice);
  },
});

/**
 * Fetch a user-scoped invoice by its Invoice Number.
 */
export const getInvoiceByInvoiceNumber = query({
  args: { invoiceNumber: v.string(), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_invoice_number", (q) => q.eq("invoiceNumber", args.invoiceNumber))
      .unique();

    if (!invoice) return null;

    // Verify ownership
    if (invoice.userId !== user._id) {
      throw new Error("Unauthorized access to invoice");
    }

    return formatInvoiceForClient(invoice);
  },
});

/**
 * List all invoices for the authenticated user.
 */
export const getUserInvoices = query({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return invoices.map(formatInvoiceForClient);
  },
});

/**
 * Fetch a user-scoped invoice by document ID for downloading.
 */
export const downloadInvoice = query({
  args: { invoiceId: v.id("invoices"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice) return null;

    // Verify ownership
    if (invoice.userId !== user._id) {
      throw new Error("Unauthorized access to invoice");
    }

    return formatInvoiceForClient(invoice);
  },
});

/**
 * Generate a temporary upload URL for file storage.
 */
export const generateUploadUrl = mutation({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await getAuthenticatedUser(ctx, args.token); // Auth check
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
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx, args.token);
    const invoice = await ctx.db.get(args.invoiceId);

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Verify ownership (allow customer, fulfilling boutique owner, or admin)
    const isCustomer = invoice.userId === user._id;
    let isBoutiqueOwner = false;

    if (!isCustomer && (user.role === "boutique" || user.role === "boutique_owner" || user.role === "admin")) {
      if (user.role === "admin") {
        isBoutiqueOwner = true;
      } else {
        const boutique = await ctx.db
          .query("boutiques")
          .withIndex("by_ownerUserId", (q) => q.eq("ownerUserId", user._id))
          .unique();
        if (boutique && invoice.orderId) {
          const order = await ctx.db.get(invoice.orderId);
          if (order && order.boutiqueId === boutique._id) {
            isBoutiqueOwner = true;
          }
        }
      }
    }

    if (!isCustomer && !isBoutiqueOwner) {
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

/**
 * Fetch an invoice by Order ID — BOUTIQUE-scoped.
 * Verifies the authenticated user owns the boutique that fulfilled the order.
 */
export const getInvoiceByOrderId_boutique = query({
  args: { orderId: v.id("orders"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const boutique = await getMyBoutique(ctx, args.token, true);

    // Verify the order belongs to this boutique
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    if (order.boutiqueId !== boutique._id) {
      throw new Error("Unauthorized: Order does not belong to your boutique.");
    }

    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .unique();

    return formatInvoiceForClient(invoice);
  },
});

/**
 * Fetch an invoice by Order ID — ADMIN-scoped.
 * Requires the authenticated user to have the "admin" role.
 */
export const getInvoiceByOrderId_admin = query({
  args: { orderId: v.id("orders"), token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin", args.token);

    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .unique();

    return formatInvoiceForClient(invoice);
  },
});
