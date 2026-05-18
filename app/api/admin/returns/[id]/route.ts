import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { sendOrderNotification } from "@/lib/notifications";
import { razorpay } from "@/lib/razorpay";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const actionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  adminNotes: z.string().optional(),
});

// ─── PATCH /api/admin/returns/[id] ────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const { action, adminNotes } = parsed.data;

  const returnReq = await db.returnRequest.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          paymentMethod: true,
          paymentStatus: true,
          totalAmount: true,
          razorpayPaymentId: true,
        },
      },
    },
  });

  if (!returnReq) return apiError("NOT_FOUND", "Return request not found.", 404);

  if (action === "APPROVE") {
    await db.returnRequest.update({ where: { id }, data: { status: "APPROVED", adminNotes } });

    const isOnlinePaid =
      returnReq.order.paymentMethod === "ONLINE" &&
      returnReq.order.paymentStatus === "PAID" &&
      returnReq.order.razorpayPaymentId;

    if (isOnlinePaid) {
      try {
        await razorpay.payments.refund(returnReq.order.razorpayPaymentId!, {
          amount: returnReq.order.totalAmount,
        });
      } catch (err) {
        console.error("[Razorpay] Refund failed:", err);
      }
      await db.order.update({
        where: { id: returnReq.orderId },
        data: { status: "REFUNDED", paymentStatus: "REFUNDED" },
      });
    } else {
      // COD: mark for manual bank transfer, no paymentStatus change
      await db.order.update({
        where: { id: returnReq.orderId },
        data: { status: "REFUND_INITIATED" },
      });
    }

    sendOrderNotification(returnReq.orderId, "RETURN_APPROVED").catch(console.error);

    await db.auditLog.create({
      data: {
        adminId: guard.adminId,
        action: "RETURN_APPROVED",
        targetType: "ReturnRequest",
        targetId: id,
        metadata: { adminNotes },
      },
    });
  } else {
    await db.returnRequest.update({ where: { id }, data: { status: "REJECTED", adminNotes } });

    sendOrderNotification(returnReq.orderId, "RETURN_REJECTED").catch(console.error);

    await db.auditLog.create({
      data: {
        adminId: guard.adminId,
        action: "RETURN_REJECTED",
        targetType: "ReturnRequest",
        targetId: id,
        metadata: { adminNotes },
      },
    });
  }

  const updated = await db.returnRequest.findUnique({ where: { id } });
  return apiSuccess(updated);
}
