// convex/lib/whatsappTemplates.ts
// Maps internal Hive templates to Meta WhatsApp Cloud API templates

export function getWhatsAppTemplate(template: string, payload: any): { templateName: string, parameters: string[] } {
  let templateName = "";
  let parameters: string[] = [];
  
  switch (template) {
    case "order_accepted":
      templateName = "hive_order_accepted";
      parameters = [payload.orderNumber || ""];
      break;

    case "out_for_delivery":
      templateName = "hive_out_for_delivery";
      parameters = [
        payload.orderNumber || "",
        payload.driverName || "our delivery partner",
        payload.driverPhone || "support"
      ];
      break;

    case "delivered":
      templateName = "hive_order_delivered";
      parameters = [payload.orderNumber || ""];
      break;
      
    case "payment_received":
      templateName = "hive_payment_received";
      parameters = [
        payload.orderNumber || "",
        payload.amount ? `₹${(payload.amount / 100).toFixed(2)}` : ""
      ];
      break;



    case "reservation_item_available":
      templateName = "hive_reservation_confirmed";
      parameters = [
        payload.productName || "your item",
        payload.paymentExpiresAt ? new Date(payload.paymentExpiresAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "30 minutes"
      ];
      break;

    case "reservation_unavailable":
      templateName = "hive_reservation_unavailable";
      parameters = [
        payload.productName || "your item"
      ];
      break;

    default:
      // Fallback utility template
      templateName = "hive_general_update";
      parameters = [template];
      break;
  }

  return { templateName, parameters };
}
