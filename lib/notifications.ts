import { db } from "@/lib/db";
import { sendEmail } from "@/lib/resend";
import {
  notifyOrderPlaced,
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyReturnApproved,
  notifyReturnRejected,
} from "@/lib/whatsapp";
import { generateAndUploadInvoice, type InvoiceOrder } from "@/lib/invoice";

// ─── Shared order fetch ───────────────────────────────────────────────────────

async function fetchOrder(orderId: string) {
  return db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true, phone: true, name: true } },
      items: {
        include: {
          variant: { include: { product: { select: { name: true } } } },
        },
      },
    },
  });
}

// ─── Email HTML templates ─────────────────────────────────────────────────────

function orderRef(id: string) {
  return id.slice(-8).toUpperCase();
}

function placedHtml(orderId: string, name: string, total: number) {
  const ref = orderRef(orderId);
  const amt = `₹${(total / 100).toFixed(2)}`;
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#c2410c;margin-bottom:4px">Leelas Homemade Spices</h1>
  <p style="color:#6b7280;margin-top:0">Authentic Kerala flavours</p>
  <hr style="border-color:#e5e7eb"/>
  <h2>Order Confirmed! 🎉</h2>
  <p>Hi ${name},</p>
  <p>Your order <strong>#${ref}</strong> has been placed successfully.</p>
  <p>Total paid: <strong>${amt}</strong></p>
  <p>Your GST invoice is attached to this email.</p>
  <p>Track your order at <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://leelas.in"}/account/orders">My Orders</a></p>
  <hr style="border-color:#e5e7eb"/>
  <p style="color:#9ca3af;font-size:12px">Thank you for choosing Leelas!</p>
</div>`;
}

function shippedHtml(orderId: string, name: string, trackingUrl?: string | null) {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#c2410c">Leelas Homemade Spices</h1>
  <h2>Your order has shipped! 🚚</h2>
  <p>Hi ${name}, order <strong>#${orderRef(orderId)}</strong> is on its way.</p>
  ${trackingUrl ? `<p><a href="${trackingUrl}" style="color:#c2410c">Track your shipment</a></p>` : ""}
</div>`;
}

function returnApprovedHtml(orderId: string, name: string) {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#c2410c">Leelas Homemade Spices</h1>
  <h2>Return Approved ✅</h2>
  <p>Hi ${name}, your return request for order <strong>#${orderRef(orderId)}</strong> has been approved.</p>
  <p>Your refund will be processed within 5–7 business days.</p>
</div>`;
}

function returnRejectedHtml(orderId: string, name: string, reason: string) {
  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h1 style="color:#c2410c">Leelas Homemade Spices</h1>
  <h2>Return Update</h2>
  <p>Hi ${name}, unfortunately your return request for order <strong>#${orderRef(orderId)}</strong> could not be approved.</p>
  ${reason ? `<p>Reason: ${reason}</p>` : ""}
  <p>Please contact support@leelas.in for assistance.</p>
</div>`;
}

// ─── Internal: send PLACED notifications (invoice + WhatsApp + email) ─────────

async function sendPlacedNotifications(orderId: string) {
  const order = await fetchOrder(orderId);
  if (!order) return;

  const addr = order.shippingAddress as Record<string, string>;
  const email = order.user?.email ?? order.guestEmail;
  const customerName = order.user?.name ?? addr.name ?? "Customer";

  // Cast to InvoiceOrder
  const invoiceOrder: InvoiceOrder = {
    id: order.id,
    createdAt: order.createdAt,
    shippingAddress: addr,
    subtotal: order.subtotal,
    gstAmount: order.gstAmount,
    discountAmount: order.discountAmount,
    totalAmount: order.totalAmount,
    items: order.items.map((i) => ({
      quantity: i.quantity,
      priceCharged: i.priceCharged,
      variant: { weight: i.variant.weight, product: { name: i.variant.product.name } },
    })),
  };

  // Generate + upload invoice
  let invoicePdfBuffer: Buffer | null = null;
  try {
    const { generateInvoice } = await import("@/lib/invoice");
    invoicePdfBuffer = await generateInvoice(invoiceOrder);
    const invoiceUrl = await generateAndUploadInvoice(invoiceOrder);
    await db.order.update({ where: { id: orderId }, data: { gstInvoiceUrl: invoiceUrl } });
  } catch (err) {
    console.error("[Notifications] Invoice generation failed:", err);
  }

  // WhatsApp
  const phone = order.user?.phone ?? addr.phone;
  if (phone) {
    notifyOrderPlaced({
      id: order.id,
      totalAmount: order.totalAmount,
      user: order.user,
      shippingAddress: addr,
    }).catch(console.error);
  }

  // Email with PDF attachment
  if (email) {
    await sendEmail(
      email,
      `Order Confirmed – #${orderRef(orderId)} | Leelas`,
      placedHtml(orderId, customerName, order.totalAmount),
      invoicePdfBuffer
        ? [{ content: invoicePdfBuffer, filename: `invoice-${orderRef(orderId)}.pdf` }]
        : undefined
    );
  }
}

// ─── Central notification dispatcher ─────────────────────────────────────────

export async function sendOrderNotification(
  orderId: string,
  type:
    | "PLACED"
    | "CONFIRMED"
    | "SHIPPED"
    | "DELIVERED"
    | "OUT_FOR_DELIVERY"
    | "RETURN_APPROVED"
    | "RETURN_REJECTED"
): Promise<void> {
  try {
    const order = await fetchOrder(orderId);
    if (!order) return;

    const addr = order.shippingAddress as Record<string, string>;
    const email = order.user?.email ?? order.guestEmail;
    const customerName = order.user?.name ?? addr.name ?? "Customer";
    const waOrder = {
      id: order.id,
      totalAmount: order.totalAmount,
      trackingUrl: order.trackingUrl,
      user: order.user,
      shippingAddress: addr,
    };

    switch (type) {
      case "PLACED":
        await sendPlacedNotifications(orderId);
        break;

      case "CONFIRMED":
        // Fallback: only send if PLACED notifications haven't been sent yet
        if (!order.gstInvoiceUrl) {
          await sendPlacedNotifications(orderId);
        }
        break;

      case "SHIPPED": {
        const waResult = await notifyOrderShipped(waOrder).catch(() => ({ success: false }));
        // Email fallback if WhatsApp fails
        if (!waResult.success && email) {
          await sendEmail(
            email,
            `Your order has shipped – #${orderRef(orderId)} | Leelas`,
            shippedHtml(orderId, customerName, order.trackingUrl)
          );
        }
        break;
      }

      case "OUT_FOR_DELIVERY":
        notifyOrderDelivered(waOrder).catch(console.error);
        break;

      case "DELIVERED":
        notifyOrderDelivered(waOrder).catch(console.error);
        break;

      case "RETURN_APPROVED": {
        notifyReturnApproved(waOrder).catch(console.error);
        if (email) {
          await sendEmail(
            email,
            `Return Approved – #${orderRef(orderId)} | Leelas`,
            returnApprovedHtml(orderId, customerName)
          );
        }
        break;
      }

      case "RETURN_REJECTED": {
        // Fetch rejection reason from most recent rejected return request
        const returnReq = await db.returnRequest.findFirst({
          where: { orderId, status: "REJECTED" },
          orderBy: { updatedAt: "desc" },
          select: { adminNotes: true },
        });
        const reason = returnReq?.adminNotes ?? "";
        notifyReturnRejected(waOrder, reason).catch(console.error);
        if (email) {
          await sendEmail(
            email,
            `Return Update – #${orderRef(orderId)} | Leelas`,
            returnRejectedHtml(orderId, customerName, reason)
          );
        }
        break;
      }
    }
  } catch (err) {
    // Notification failures must never crash order processing
    console.error(`[Notifications] sendOrderNotification(${orderId}, ${type}) failed:`, err);
  }
}
