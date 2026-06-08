// convex/emails.ts
// Asynchronous email notification triggers using Resend.

import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  getNewOrderBoutiqueTemplate,
  getOrderConfirmedCustomerTemplate,
  getOrderPackedCustomerTemplate,
  getOrderOutForDeliveryCustomerTemplate,
  getOrderDeliveredCustomerTemplate,
  getOrderDeliveredBoutiqueTemplate,
} from "./lib/emailTemplates";

/**
 * Aggregates all data needed for emails in a single database query call.
 */
export const getEmailData = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;

    const boutique = await ctx.db.get(order.boutiqueId);
    const user = await ctx.db.get(order.customerId);
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .unique();

    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .collect();

    return {
      order,
      boutique,
      user,
      invoice,
      orderItems,
    };
  },
});

/**
 * Asynchronously sends email notification through Resend REST API.
 */
export const sendOrderEmail = internalAction({
  args: {
    orderId: v.id("orders"),
    event: v.union(
      v.literal("new_order"),
      v.literal("confirmed"),
      v.literal("packed"),
      v.literal("out_for_delivery"),
      v.literal("delivered")
    ),
  },
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.emails.getEmailData, {
      orderId: args.orderId,
    });

    if (!data || !data.order) {
      console.error(`[sendOrderEmail] No data found for order ID: ${args.orderId}`);
      return;
    }

    const { order, boutique, user, invoice, orderItems } = data;

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("[sendOrderEmail] RESEND_API_KEY is not defined in environment variables. Email dispatch skipped.");
      return;
    }

    // Default Resend sandbox sender
    const fromEmail = "Hive Marketplace <onboarding@resend.dev>";

    // Fallbacks
    const customerName = invoice?.customerName || user?.email || "Hive Customer";
    const boutiqueName = boutique?.boutiqueName || "Boutique Partner";

    // Formatted Address Snapshot
    const deliveryAddressStr = order.deliveryAddress
      ? `${order.deliveryAddress.line1}, ${order.deliveryAddress.line2 ? order.deliveryAddress.line2 + ", " : ""}${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.pincode}`
      : "Not provided";

    const items = orderItems.map((item) => ({
      productName: item.productName,
      size: item.variantSize,
      quantity: item.quantity,
      priceAtPurchase: item.priceAtPurchase,
      imageUrl: item.imageUrl,
    }));

    const templateData = {
      orderNumber: order.orderNumber,
      customerName,
      boutiqueName,
      deliveryAddress: deliveryAddressStr,
      items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      notes: order.notes,
      pdfUrl: invoice?.pdfUrl || undefined,
    };

    let subject = "";
    let html = "";
    let toEmails: string[] = [];

    switch (args.event) {
      case "new_order":
        subject = `New Order Received - ${order.orderNumber}`;
        html = getNewOrderBoutiqueTemplate(templateData);

        const bEmail = boutique?.email || boutique?.ownerEmail;
        if (bEmail) toEmails.push(bEmail);
        break;

      case "confirmed":
        subject = `Your Order ${order.orderNumber} is Confirmed!`;
        html = getOrderConfirmedCustomerTemplate(templateData);

        const cEmailConf = invoice?.customerEmail || user?.email;
        if (cEmailConf) toEmails.push(cEmailConf);
        break;

      case "packed":
        subject = `Your Hive Order ${order.orderNumber} is Packed!`;
        html = getOrderPackedCustomerTemplate(templateData);

        const cEmailPack = invoice?.customerEmail || user?.email;
        if (cEmailPack) toEmails.push(cEmailPack);
        break;

      case "out_for_delivery":
        subject = `Your Hive Order ${order.orderNumber} is Out for Delivery!`;
        html = getOrderOutForDeliveryCustomerTemplate(templateData);

        const cEmailTransit = invoice?.customerEmail || user?.email;
        if (cEmailTransit) toEmails.push(cEmailTransit);
        break;

      case "delivered":
        // Delivered event triggers two separate notifications (Customer & Boutique)
        const custEmail = invoice?.customerEmail || user?.email;
        if (custEmail) {
          const customerSubject = `Your Hive Order ${order.orderNumber} has been Delivered!`;
          const customerHtml = getOrderDeliveredCustomerTemplate(templateData);
          await sendViaResend(apiKey, fromEmail, custEmail, customerSubject, customerHtml);
        }

        const boutEmail = boutique?.email || boutique?.ownerEmail;
        if (boutEmail) {
          const boutiqueSubject = `Hive Order ${order.orderNumber} Delivered`;
          const boutiqueHtml = getOrderDeliveredBoutiqueTemplate(templateData);
          await sendViaResend(apiKey, fromEmail, boutEmail, boutiqueSubject, boutiqueHtml);
        }

        return; // Handled directly
    }

    if (toEmails.length === 0) {
      console.error(`[sendOrderEmail] No recipient email resolved for event ${args.event}`);
      return;
    }

    for (const email of toEmails) {
      await sendViaResend(apiKey, fromEmail, email, subject, html);
    }
  },
});

async function sendViaResend(apiKey: string, from: string, to: string, subject: string, html: string) {
  console.log(`[sendOrderEmail] Sending email to: ${to} (Subject: ${subject})`);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[sendOrderEmail] Resend API error for ${to}: ${res.status} - ${errText}`);
    } else {
      const responseData = await res.json();
      console.log(`[sendOrderEmail] Email sent successfully to ${to}. Resend ID: ${responseData.id}`);
    }
  } catch (err) {
    console.error(`[sendOrderEmail] Network error when sending email to ${to}:`, err);
  }
}
