import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { sendOrderNotification } from "@/lib/notifications";
import { createShipRocketOrder } from "@/lib/shiprocket";

// Always respond 200 — Razorpay retries on non-200, causing double processing
function ok() {
  return new Response("ok", { status: 200 });
}

// ─── POST /api/webhooks/razorpay ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    console.error("Razorpay webhook: invalid signature");
    return ok(); // still 200 — never return error to Razorpay
  }

  let event: {
    event: string;
    payload: { payment: { entity: { id: string; order_id: string } } };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return ok();
  }

  const payment = event.payload?.payment?.entity;
  const razorpayPaymentId = payment?.id;
  const razorpayOrderId = payment?.order_id;

  if (event.event === "payment.captured") {
    const order = await db.order.findFirst({
      where: { razorpayOrderId },
      select: { id: true, paymentStatus: true },
    });

    if (!order) return ok();

    // Replay protection: already processed
    if (order.paymentStatus === "PAID") return ok();

    await db.order.update({
      where: { id: order.id },
      data: {
        status: "CONFIRMED",
        paymentStatus: "PAID",
        razorpayPaymentId,
      },
    });

    // Fire and forget — webhook must respond fast
    sendOrderNotification(order.id, "PLACED").catch(console.error);
    createShipRocketOrder(order.id).catch(console.error);
  }

  if (event.event === "payment.failed") {
    const order = await db.order.findFirst({
      where: { razorpayOrderId },
      select: { id: true, items: { select: { variantId: true, quantity: true } } },
    });

    if (!order) return ok();

    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "FAILED", status: "CANCELLED" },
    });

    // Restore stock
    for (const item of order.items) {
      await db.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    }
  }

  if (event.event === "refund.created") {
    const order = await db.order.findFirst({
      where: { razorpayPaymentId },
      select: { id: true },
    });

    if (!order) return ok();

    await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: "REFUNDED", status: "REFUNDED" },
    });
  }

  return ok();
}
