import { db } from "@/lib/db";

const SHIPROCKET_BASE = "https://apiv2.shiprocket.in/v1/external";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function authenticateShipRocket(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });

  const data = await res.json();
  if (!data.token) throw new Error("ShipRocket auth failed");

  cachedToken = { token: data.token, expiresAt: Date.now() + 24 * 60 * 60 * 1000 };
  return cachedToken.token;
}

// Private — takes raw ShipRocket payload
async function postShiprocketOrder(payload: Record<string, unknown>) {
  const token = await authenticateShipRocket();
  const res = await fetch(`${SHIPROCKET_BASE}/orders/create/adhoc`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return res.json();
}

// ─── createShipRocketOrder — fetch order from DB, submit to ShipRocket ────────

export async function createShipRocketOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { variant: { include: { product: true } } } },
    },
  });
  if (!order) throw new Error(`Order ${orderId} not found`);

  const addr = order.shippingAddress as Record<string, string>;

  const srOrder = await postShiprocketOrder({
    order_id: order.id,
    order_date: order.createdAt.toISOString(),
    pickup_location: "Primary",
    billing_customer_name: addr.name ?? addr.fullName,
    billing_phone: addr.phone,
    billing_address: addr.addressLine1,
    billing_city: addr.city,
    billing_state: addr.state ?? "Kerala",
    billing_country: "India",
    billing_pincode: addr.pincode,
    shipping_is_billing: true,
    order_items: order.items.map((item) => ({
      name: item.variant.product.name,
      sku: item.variant.sku,
      units: item.quantity,
      selling_price: item.priceCharged / 100,
    })),
    payment_method: order.paymentMethod === "COD" ? "COD" : "Prepaid",
    sub_total: order.subtotal / 100,
    length: 15,
    breadth: 15,
    height: 10,
    weight: 0.5,
  });

  if (srOrder?.order_id) {
    await db.order.update({
      where: { id: orderId },
      data: {
        shiprocketOrderId: String(srOrder.order_id),
        status: "PROCESSING",
      },
    });
  } else {
    console.error("[ShipRocket] Order creation failed:", srOrder);
  }
}

// ─── checkPincodeServiceability ───────────────────────────────────────────────

export async function checkPincodeServiceability(
  deliveryPincode: string
): Promise<{ serviceable: boolean; codAvailable: boolean }> {
  const token = await authenticateShipRocket();
  const pickup = process.env.LEELAS_PICKUP_PINCODE ?? "682001";

  const res = await fetch(
    `${SHIPROCKET_BASE}/courier/serviceability/?pickup_postcode=${pickup}&delivery_postcode=${deliveryPincode}&cod=1&weight=0.5`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return { serviceable: false, codAvailable: false };

  const data = await res.json();
  const companies: { cod: number }[] = data?.data?.available_courier_companies ?? [];

  return {
    serviceable: companies.length > 0,
    codAvailable: companies.some((c) => c.cod === 1),
  };
}

// ─── trackShipment (admin use) ────────────────────────────────────────────────

export async function trackShipment(shiprocketOrderId: string) {
  const token = await authenticateShipRocket();
  const res = await fetch(
    `${SHIPROCKET_BASE}/courier/track?order_id=${shiprocketOrderId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.json();
}

// ─── ShipRocket status → our OrderStatus mapping ─────────────────────────────

export type MappedShipRocketStatus = {
  orderStatus: string;
  notificationType?: "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED";
};

export function mapShiprocketStatus(
  srStatus: string
): MappedShipRocketStatus | null {
  const s = srStatus.toLowerCase();
  if (s.includes("delivered") && !s.includes("out for")) {
    return { orderStatus: "DELIVERED", notificationType: "DELIVERED" };
  }
  if (s.includes("out for delivery")) {
    return { orderStatus: "OUT_FOR_DELIVERY", notificationType: "OUT_FOR_DELIVERY" };
  }
  if (s.includes("shipped") || s.includes("in transit") || s.includes("pickup")) {
    return { orderStatus: "SHIPPED", notificationType: "SHIPPED" };
  }
  if (s.includes("cancelled") || s.includes("rto")) {
    return { orderStatus: "CANCELLED" };
  }
  return null;
}
