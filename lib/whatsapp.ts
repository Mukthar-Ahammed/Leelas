const WHATSAPP_URL = `https://graph.facebook.com/v19.0/${process.env.META_WHATSAPP_PHONE_NUMBER_ID}/messages`;

export async function sendWhatsApp(
  phone: string,
  templateName: string,
  components: object[]
): Promise<{ success: boolean }> {
  try {
    const res = await fetch(WHATSAPP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.META_WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: "91" + phone, // Indian numbers — no + prefix
        type: "template",
        template: { name: templateName, language: { code: "en" }, components },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[WhatsApp] API error:", err);
      return { success: false };
    }
    return { success: true };
  } catch (err) {
    console.error("[WhatsApp] Network error:", err);
    return { success: false };
  }
}

// ─── Typed order shape used by all template helpers ───────────────────────────

type WAOrder = {
  id: string;
  totalAmount: number;
  trackingUrl?: string | null;
  user?: { name: string; phone?: string | null } | null;
  shippingAddress: Record<string, string>;
};

function name(o: WAOrder) {
  return o.user?.name ?? o.shippingAddress.name ?? "Customer";
}
function phone(o: WAOrder) {
  return (o.user?.phone ?? o.shippingAddress.phone)!;
}
function ref(o: WAOrder) {
  return o.id.slice(-8).toUpperCase();
}

// ─── Template helpers — pre-register these 5 templates in Meta Business Manager

export function notifyOrderPlaced(order: WAOrder) {
  return sendWhatsApp(phone(order), "order_placed", [
    {
      type: "body",
      parameters: [
        { type: "text", text: name(order) },
        { type: "text", text: `₹${(order.totalAmount / 100).toFixed(2)}` },
        { type: "text", text: ref(order) },
      ],
    },
  ]);
}

export function notifyOrderShipped(order: WAOrder) {
  return sendWhatsApp(phone(order), "order_shipped", [
    {
      type: "body",
      parameters: [
        { type: "text", text: name(order) },
        { type: "text", text: ref(order) },
        { type: "text", text: order.trackingUrl ?? "N/A" },
      ],
    },
  ]);
}

export function notifyOrderDelivered(order: WAOrder) {
  return sendWhatsApp(phone(order), "order_delivered", [
    {
      type: "body",
      parameters: [
        { type: "text", text: name(order) },
        { type: "text", text: ref(order) },
      ],
    },
  ]);
}

export function notifyReturnApproved(order: WAOrder) {
  return sendWhatsApp(phone(order), "return_approved", [
    {
      type: "body",
      parameters: [
        { type: "text", text: name(order) },
        { type: "text", text: ref(order) },
      ],
    },
  ]);
}

export function notifyReturnRejected(order: WAOrder, reason: string) {
  return sendWhatsApp(phone(order), "return_rejected", [
    {
      type: "body",
      parameters: [
        { type: "text", text: name(order) },
        { type: "text", text: ref(order) },
        { type: "text", text: reason },
      ],
    },
  ]);
}
