import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const createLog = internalMutation({
  args: {
    channel: v.union(v.literal("email"), v.literal("whatsapp")),
    template: v.string(),
    recipient: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notificationLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const updateLog = internalMutation({
  args: {
    id: v.id("notificationLogs"),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed")),
    response: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      response: args.response,
      sentAt: args.status === "sent" ? Date.now() : undefined,
    });
  },
});

import { checkRateLimit } from "./lib/rateLimit";

export const checkWhatsAppRateLimitInternal = internalMutation({
  args: { recipient: v.string() },
  handler: async (ctx, args) => {
    await checkRateLimit(ctx, `whatsapp:${args.recipient}`, 5, 60 * 60 * 1000);
  },
});

export const sendTemplateMessage = internalAction({
  args: {
    recipient: v.string(),
    templateName: v.string(),
    parameters: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Check rate limit first (throws if exceeded)
    await ctx.runMutation(internal.whatsapp.checkWhatsAppRateLimitInternal, {
      recipient: args.recipient,
    });

    // 1. Log pending status
    const logId = await ctx.runMutation(internal.whatsapp.createLog, {
      channel: "whatsapp",
      template: args.templateName,
      recipient: args.recipient,
      status: "pending",
    });

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // Local Development/Mock check
    const isMock = !accessToken || accessToken === "mock_token" || !phoneNumberId;

    if (isMock) {
      let bodyText = "";
      switch (args.templateName) {
        case "merchant_invite":
          bodyText = `Welcome to Hive 🎉\nYour merchant account is ready.\nClaim your account:\n${args.parameters[0] || ""}\nThis invite expires in 14 days.`;
          break;
        case "merchant_welcome":
          bodyText = `Welcome to Hive 🎉\n\nYour store has been activated.\n\nComplete these steps:\n✓ Add logo\n✓ Add store hours\n✓ Add first product\n\nSeller Center:\nseller.hive.in`;
          break;
        case "first_product_approved":
          bodyText = `Great news 🎉\n\nYour first product is now live on Hive.\n\nCustomers can now discover your store.`;
          break;
        case "first_order_arrived":
          bodyText = `Congratulations 🎉\n\nYou received your first Hive order.\nOrder #${args.parameters[0] || ""}\n\nOpen Seller Center to manage it.`;
          break;
        default:
          bodyText = `[Template: ${args.templateName}] Params: ${args.parameters.join(", ")}`;
          break;
      }
      console.log(`\n--- WHATSAPP MESSAGE SENT TO ${args.recipient} ---`);
      console.log(bodyText);
      console.log(`-----------------------------------------------\n`);

      await ctx.runMutation(internal.whatsapp.updateLog, {
        id: logId,
        status: "sent",
        response: JSON.stringify({ message: "Mock message processed successfully", mock: true, text: bodyText }),
      });
      return { success: true, mock: true };
    }

    try {
      const cleanPhone = args.recipient.replace(/[^0-9]/g, "");

      const payload = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: args.templateName,
          language: {
            code: "en_US",
          },
          components: [
            {
              type: "body",
              parameters: args.parameters.map(param => ({
                type: "text",
                text: param,
              })),
            },
          ],
        },
      };

      const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[WhatsApp API Error] Meta returned status ${response.status}: ${errorText}`);
        await ctx.runMutation(internal.whatsapp.updateLog, {
          id: logId,
          status: "failed",
          response: `Meta Status ${response.status}: ${errorText}`,
        });
        return { success: false, status: response.status, error: errorText };
      }

      const responseData = await response.json();
      console.log(`[WhatsApp Sent] Message ID: ${responseData.messages?.[0]?.id || "unknown"}`);
      await ctx.runMutation(internal.whatsapp.updateLog, {
        id: logId,
        status: "sent",
        response: JSON.stringify(responseData),
      });
      return { success: true, messageId: responseData.messages?.[0]?.id };

    } catch (err: any) {
      console.error(`[WhatsApp Network Error] Failed to send message:`, err);
      await ctx.runMutation(internal.whatsapp.updateLog, {
        id: logId,
        status: "failed",
        response: err.message || String(err),
      });
      return { success: false, error: err.message || String(err) };
    }
  },
});
