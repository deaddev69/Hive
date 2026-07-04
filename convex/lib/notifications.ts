// convex/lib/notifications.ts
// Notification Engine — supports deduplication & launch-critical notification templates.

import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";

const formatCurrency = (paise: number) => {
  return `₹${(paise / 100).toFixed(2)}`;
};

function emailLayout(title: string, bodyContent: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f9f9f9;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .wrapper {
      width: 100%;
      background-color: #f9f9f9;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      background-color: #ffffff;
      margin: 0 auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #eef2f5;
    }
    .header {
      background: linear-gradient(135deg, #111827 0%, #1f2937 100%);
      padding: 30px 40px;
      text-align: center;
    }
    .logo {
      color: #f3f4f6;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0;
    }
    .logo span {
      color: #fbbf24;
    }
    .content {
      padding: 40px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      font-size: 15px;
      line-height: 1.6;
      color: #4b5563;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid #eef2f5;
    }
    .footer-text {
      font-size: 13px;
      color: #9ca3af;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo">HIVE<span>.</span></div>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p class="footer-text">© 2026 Hive Marketplace. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function generateEmailContent(template: string, payload: any): { subject: string; html: string } {
  let subject = "";
  let bodyContent = "";

  switch (template) {
    case "payment_received":
      subject = `Payment Received - Order ${payload.orderNumber || ""}`;
      bodyContent = `
        <h1>Payment Received!</h1>
        <p>Hello,</p>
        <p>We have successfully received your payment of <strong>${formatCurrency(payload.amount)}</strong> for Order <strong>${payload.orderNumber}</strong>.</p>
        <p>Thank you for shopping with Hive!</p>
      `;
      break;

    case "payment_refund_pending":
      subject = `Refund Pending - Order ${payload.orderNumber || ""}`;
      bodyContent = `
        <h1>Refund Pending</h1>
        <p>Hello,</p>
        <p>Your payment of <strong>${formatCurrency(payload.amount)}</strong> for Order <strong>${payload.orderNumber || ""}</strong> is pending refund.</p>
        <p><strong>Reason:</strong> ${payload.reason || "Stock depleted during checkout processing"}</p>
        <p>Our operations team has been alerted and will process the refund to your original payment method shortly.</p>
      `;
      break;

    case "payment_refunded":
      subject = `Payment Refunded - Order ${payload.orderNumber || ""}`;
      bodyContent = `
        <h1>Payment Refunded</h1>
        <p>Hello,</p>
        <p>We have successfully refunded <strong>${formatCurrency(payload.amount)}</strong> for Order <strong>${payload.orderNumber || ""}</strong>.</p>
        ${payload.refundId ? `<p><strong>Refund ID:</strong> ${payload.refundId}</p>` : ""}
        <p>The amount should reflect in your account within 5-7 business days depending on your bank.</p>
      `;
      break;

    case "claim_submitted":
      subject = `Claim Submitted - Claim ${payload.claimNumber}`;
      bodyContent = `
        <h1>Claim Submitted Successfully</h1>
        <p>Hello,</p>
        <p>Your claim <strong>${payload.claimNumber}</strong> for Order <strong>${payload.orderNumber}</strong> has been successfully submitted and is under review.</p>
        <p>Our team will inspect the evidence provided and update you on the progress within 24-48 hours.</p>
      `;
      break;

    case "claim_rejected":
      subject = `Claim Update: Rejected - Claim ${payload.claimNumber}`;
      bodyContent = `
        <h1>Claim Rejected</h1>
        <p>Hello,</p>
        <p>Your claim <strong>${payload.claimNumber}</strong> for Order <strong>${payload.orderNumber}</strong> has been reviewed and rejected.</p>
        <p><strong>Reason:</strong> ${payload.reason || "Insufficient evidence provided."}</p>
        <p>If you have any questions, please contact our support team.</p>
      `;
      break;

    case "merchant_application_approved":
      subject = "Welcome to Hive! Boutique Application Approved";
      bodyContent = `
        <h1>Boutique Application Approved!</h1>
        <p>Hello ${payload.ownerName || ""},</p>
        <p>Congratulations! Your boutique <strong>${payload.boutiqueName}</strong> has been approved to join the Hive marketplace.</p>
        <p>You can now log in to the Boutique Dashboard to set up your store and list your products.</p>
      `;
      break;

    case "merchant_application_rejected":
      subject = "Boutique Application Status Update";
      bodyContent = `
        <h1>Boutique Application Status</h1>
        <p>Hello ${payload.ownerName || ""},</p>
        <p>Thank you for applying to join the Hive marketplace.</p>
        <p>Unfortunately, your boutique application for <strong>${payload.boutiqueName}</strong> was not approved at this time.</p>
        <p><strong>Reason:</strong> ${payload.reason || "Criteria mismatch."}</p>
      `;
      break;

    case "order_accepted":
      subject = `Order Confirmed - ${payload.orderNumber}`;
      bodyContent = `
        <h1>Your Order is Confirmed!</h1>
        <p>Hello,</p>
        <p>Great news! Your order <strong>${payload.orderNumber}</strong> has been accepted by the boutique and is now confirmed.</p>
      `;
      break;

    case "order_packed":
      subject = `Your Order is Packed - ${payload.orderNumber}`;
      bodyContent = `
        <h1>Order Packed</h1>
        <p>Hello,</p>
        <p>Your order <strong>${payload.orderNumber}</strong> has been packed and is ready for pickup by our delivery partner.</p>
      `;
      break;

    case "driver_assigned":
      subject = `Delivery Partner Assigned - ${payload.orderNumber}`;
      bodyContent = `
        <h1>Delivery Partner Assigned</h1>
        <p>Hello,</p>
        <p>A delivery partner has been assigned to your order <strong>${payload.orderNumber}</strong>.</p>
        ${payload.driverName ? `<p><strong>Driver Name:</strong> ${payload.driverName}</p>` : ""}
        ${payload.driverPhone ? `<p><strong>Driver Phone:</strong> ${payload.driverPhone}</p>` : ""}
      `;
      break;

    case "out_for_delivery":
      subject = `Out for Delivery - ${payload.orderNumber}`;
      bodyContent = `
        <h1>Out for Delivery</h1>
        <p>Hello,</p>
        <p>Your order <strong>${payload.orderNumber}</strong> is out for delivery! Please ensure someone is available to receive it.</p>
      `;
      break;

    case "delivered":
      subject = `Delivered - ${payload.orderNumber}`;
      bodyContent = `
        <h1>Order Delivered</h1>
        <p>Hello,</p>
        <p>Your order <strong>${payload.orderNumber}</strong> has been successfully delivered. Thank you for shopping with Hive!</p>
      `;
      break;

    case "claim_approved":
      subject = `Claim Approved - Claim ${payload.claimNumber}`;
      bodyContent = `
        <h1>Claim Approved</h1>
        <p>Hello,</p>
        <p>Your claim <strong>${payload.claimNumber}</strong> for Order <strong>${payload.orderNumber}</strong> has been approved.</p>
        <p><strong>Resolution:</strong> ${payload.resolution}</p>
      `;
      break;

    case "refund_processed":
      subject = `Refund Processed - Order ${payload.orderNumber}`;
      bodyContent = `
        <h1>Refund Processed</h1>
        <p>Hello,</p>
        <p>A refund of <strong>${formatCurrency(payload.amount)}</strong> has been processed for Order <strong>${payload.orderNumber}</strong>.</p>
      `;
      break;

    case "payout_released":
      subject = `Payout Released - ${payload.payoutNumber}`;
      bodyContent = `
        <h1>Payout Released</h1>
        <p>Hello,</p>
        <p>A payout of <strong>${formatCurrency(payload.amount)}</strong> has been released to your registered bank account.</p>
        <p><strong>Payout Number:</strong> ${payload.payoutNumber}</p>
      `;
      break;

    default:
      subject = `Notification from Hive`;
      bodyContent = `
        <h1>Notification</h1>
        <p>You have a new update on Hive.</p>
      `;
      break;
  }

  return {
    subject,
    html: emailLayout(subject, bodyContent),
  };
}

export async function triggerNotification(
  ctx: MutationCtx,
  userId: Id<"users">,
  channel: "email" | "sms" | "whatsapp" | "push" | "in_app" | "slack",
  template: string,
  entityType: string,
  entityId: string,
  payloadStr?: string
) {
  const now = Date.now();

  // Deduplication check using unique composite properties
  const existing = await ctx.db
    .query("notificationEvents")
    .withIndex("by_entity_template", (q) =>
      q.eq("entityType", entityType).eq("entityId", entityId).eq("template", template)
    )
    .first();

  if (existing) {
    console.log(`[triggerNotification] Silently ignoring duplicate notification for ${entityType} ${entityId} template ${template}`);
    return existing._id;
  }

  // Insert notification log as queued
  const eventId = await ctx.db.insert("notificationEvents", {
    userId,
    channel,
    template,
    status: "queued",
    entityType,
    entityId,
    payload: payloadStr,
    createdAt: now,
  });

  try {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const payload = payloadStr ? JSON.parse(payloadStr) : {};

    if (channel === "email") {
      const email = user.email || payload.email;
      if (!email) {
        throw new Error(`No email address found for user ${userId}`);
      }

      // Generate Subject and HTML body
      const { subject, html } = generateEmailContent(template, payload);

      // Schedule email sending
      await ctx.scheduler.runAfter(0, internal.emails.sendNotificationEmail, {
        to: email,
        subject,
        html,
      });

      // Mark as sent
      await ctx.db.patch(eventId, {
        status: "sent",
        sentAt: Date.now(),
      });
    } else if (channel === "slack") {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (webhookUrl) {
        let text = `*New Notification: ${template}*\n`;
        if (payload) {
          text += "```\n" + JSON.stringify(payload, null, 2) + "\n```";
        }
        
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        
        if (!res.ok) {
          throw new Error(`Slack webhook failed: ${await res.text()}`);
        }
      } else {
        console.warn("[triggerNotification] Slack webhook URL not configured");
      }
      
      await ctx.db.patch(eventId, {
        status: "sent",
        sentAt: Date.now(),
      });
    } else {
      // Mock SMS/WhatsApp/Push/in_app immediately
      console.log(`[triggerNotification] Sending mock ${channel} for template ${template} to user ${userId}`);
      await ctx.db.patch(eventId, {
        status: "sent",
        sentAt: Date.now(),
      });
    }
  } catch (err: any) {
    console.error(`[triggerNotification] Failed to dispatch notification:`, err);
    await ctx.db.patch(eventId, {
      status: "failed",
    });
  }

  return eventId;
}
