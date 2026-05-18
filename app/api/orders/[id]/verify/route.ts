import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-helpers";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { sendOrderNotification } from "@/lib/notifications";
import { createShipRocketOrder } from "@/lib/shiprocket";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const verifySchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
});

// ─── POST /api/orders/[id]/verify ────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return apiError("UNAUTHORIZED", "Login required.", 401);

  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  const order = await db.order.findUnique({
    where: { id },
    select: { id: true, userId: true, razorpayOrderId: true, paymentStatus: true },
  });

  // 404 for both "not found" and ownership mismatch
  if (!order || order.userId !== session.user.id) {
    return apiError("NOT_FOUND", "Order not found.", 404);
  }

  if (order.razorpayOrderId !== razorpayOrderId) {
    return apiError("INVALID_ORDER", "Razorpay order ID does not match.", 400);
  }

  if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
    return apiError("INVALID_SIGNATURE", "Payment signature verification failed.", 400);
  }

  // Idempotent: already confirmed
  if (order.paymentStatus === "PAID") {
    return apiSuccess({
      orderId: order.id,
      status: "CONFIRMED",
      redirectTo: `/account/orders/${order.id}`,
    });
  }

  await db.order.update({
    where: { id: order.id },
    data: {
      status: "CONFIRMED",
      paymentStatus: "PAID",
      razorpayPaymentId,
    },
  });

  // Fire and forget — don't block the response
  sendOrderNotification(order.id, "PLACED").catch((err) =>
    console.error("Notification failed:", err)
  );
  createShipRocketOrder(order.id).catch((err) =>
    console.error("ShipRocket failed:", err)
  );

  return apiSuccess({
    orderId: order.id,
    status: "CONFIRMED",
    redirectTo: `/account/orders/${order.id}`,
  });
}
