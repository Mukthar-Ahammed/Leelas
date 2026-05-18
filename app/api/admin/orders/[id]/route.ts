import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { sendOrderNotification } from "@/lib/notifications";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

// ─── Valid status-machine transitions ─────────────────────────────────────────
const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED"],
  CONFIRMED: ["PACKED", "CANCELLED"],
  PACKED: ["SHIPPED"],
  SHIPPED: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
};

const updateSchema = z.object({
  status: z.enum([
    "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY",
    "DELIVERED", "CANCELLED",
  ]),
  trackingUrl: z.string().url().optional(),
});

// ─── GET /api/admin/orders/[id] ───────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      items: {
        include: {
          variant: { include: { product: { select: { name: true } } } },
        },
      },
    },
  });

  if (!order) return apiError("NOT_FOUND", "Order not found.", 404);
  return apiSuccess(order);
}

// ─── PATCH /api/admin/orders/[id] ─────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const { status: newStatus, trackingUrl } = parsed.data;

  // Fetch current order
  const current = await db.order.findUnique({
    where: { id },
    include: { items: { select: { variantId: true, quantity: true } } },
  });
  if (!current) return apiError("NOT_FOUND", "Order not found.", 404);

  // State machine validation
  const allowed = TRANSITIONS[current.status] ?? [];
  if (!allowed.includes(newStatus)) {
    return apiError(
      "INVALID_TRANSITION",
      `Cannot transition from ${current.status} to ${newStatus}.`,
      422
    );
  }

  // SHIPPED requires trackingUrl
  if (newStatus === "SHIPPED" && !trackingUrl) {
    return apiError("TRACKING_URL_REQUIRED", "trackingUrl is required when shipping an order.", 400);
  }

  // CANCELLED → restore stock
  if (newStatus === "CANCELLED") {
    await db.$transaction(
      current.items.map((item) =>
        db.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        })
      )
    );
  }

  const order = await db.order.update({
    where: { id },
    data: {
      status: newStatus,
      ...(trackingUrl ? { trackingUrl } : {}),
    },
  });

  await db.auditLog.create({
    data: {
      adminId: guard.adminId,
      action: "UPDATE_ORDER_STATUS",
      targetType: "Order",
      targetId: id,
      metadata: { from: current.status, to: newStatus, trackingUrl },
    },
  });

  // Fire-and-forget notifications
  if (newStatus === "SHIPPED") sendOrderNotification(id, "SHIPPED").catch(console.error);
  if (newStatus === "OUT_FOR_DELIVERY") sendOrderNotification(id, "OUT_FOR_DELIVERY").catch(console.error);
  if (newStatus === "DELIVERED") sendOrderNotification(id, "DELIVERED").catch(console.error);

  return apiSuccess(order);
}
