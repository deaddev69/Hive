// convex/lib/whatsappClient.ts
// Meta WhatsApp Cloud API Client

export async function sendWhatsAppTemplateMessage(
  phoneNumber: string,
  templateName: string,
  components: any[] = []
) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error("Missing WhatsApp configuration (WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID)");
  }

  // Ensure E.164 format without the '+' for Meta API
  const to = phoneNumber.replace("+", "");

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: "en"
      },
      components
    }
  };

  const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`WhatsApp API Error: ${JSON.stringify(data)}`);
  }

  return data; // Typically contains { messaging_product: 'whatsapp', contacts: [...], messages: [{ id: 'wamid...' }] }
}
