import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const createLog = internalMutation({
  args: {
    channel: v.union(v.literal("email"), v.literal("whatsapp")),
    template: v.string(),
    recipient: v.string(),
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("delivered"), v.literal("read")),
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
    status: v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"), v.literal("delivered"), v.literal("read")),
    response: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      response: args.response,
      providerMessageId: args.providerMessageId,
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
    languageCode: v.optional(v.string()),
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
        case "hive_merchant_new_order":
          bodyText = `Congratulations ${args.parameters[0] || "Merchant"}! You have received a new order ${args.parameters[1] || ""}. Open your Seller Portal to accept and pack the order.`;
          break;
        case "hive_order_delivered":
          bodyText = `Your order ${args.parameters[0] || ""} has been delivered successfully! 🎉`;
          break;
        case "hive_out_for_delivery":
          bodyText = `Your order ${args.parameters[0] || ""} is out for delivery with our courier! 🚚`;
          break;
        case "hive_reservation_confirmed":
        case "hive_reservation_conf":
          bodyText = `Good news! Your reservation for ${args.parameters[0] || "item"} is confirmed.`;
          break;
        case "hive_reservation_unavailable":
        case "hive_reservation_unav":
          bodyText = `We're sorry, but the item ${args.parameters[0] || ""} is currently unavailable.`;
          break;
        case "hello_world":
          bodyText = `Welcome and congratulations! This is a test WhatsApp message from Hive.`;
          break;
        default:
          bodyText = `[Template: ${args.templateName}] Params: ${args.parameters.join(", ")}`;
          break;
      }
      console.log(`\n--- WHATSAPP MESSAGE (MOCK) SENT TO ${args.recipient} ---`);
      console.log(bodyText);
      console.log(`----------------------------------------------------\n`);

      await ctx.runMutation(internal.whatsapp.updateLog, {
        id: logId,
        status: "sent",
        response: JSON.stringify({ message: "Mock message processed successfully", mock: true, text: bodyText }),
      });
      return { success: true, mock: true, text: bodyText };
    }

    try {
      let cleanPhone = args.recipient.replace(/[^0-9]/g, "");
      // Ensure Indian country code prefix if 10-digit
      if (cleanPhone.length === 10) {
        cleanPhone = `91${cleanPhone}`;
      } else if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
        cleanPhone = `91${cleanPhone.slice(1)}`;
      }

      // Resolve language code: 'en' for English templates, 'en_US' for hello_world
      const lang = args.languageCode || (args.templateName === "hello_world" ? "en_US" : "en");

      const payload: any = {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: args.templateName,
          language: {
            code: lang,
          },
        },
      };

      if (args.parameters.length > 0) {
        payload.template.components = [
          {
            type: "body",
            parameters: args.parameters.map((param) => ({
              type: "text",
              text: param,
            })),
          },
        ];
      }

      const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
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
        providerMessageId: responseData.messages?.[0]?.id,
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

import { action } from "./_generated/server";

/**
 * Public test action for verifying WhatsApp template messages.
 */
export const testSendWhatsApp = action({
  args: {
    recipient: v.string(),
    templateName: v.string(),
    parameters: v.optional(v.array(v.string())),
    languageCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    return await ctx.runAction(internal.whatsapp.sendTemplateMessage, {
      recipient: args.recipient,
      templateName: args.templateName,
      parameters: args.parameters ?? [],
      languageCode: args.languageCode,
    });
  },
});

