import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-helpers";
import { z } from "zod";

const createReturnSchema = z.object({
  orderId: z.string().cuid(),
  reason: z.enum(["Wrong item", "Damaged", "Quality issue", "Changed mind"]),
  description: z.string().max(500).optional(),
});

// ─── POST /api/returns ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError("UNAUTHORIZED", "Login required.", 401);

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = createReturnSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const { orderId, reason, description } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId, userId: session.user.id },
    select: { id: true, status: true, userId: true },
  });

  if (!order) return apiError("NOT_FOUND", "Order not found.", 404);

  if (order.status !== "DELIVERED") {
    return apiError(
      "ORDER_NOT_DELIVERED",
      "Returns can only be requested for delivered orders.",
      400
    );
  }

  const returnRequest = await db.returnRequest.create({
    data: { orderId, userId: session.user.id, reason, description },
  });

  await db.order.update({ where: { id: orderId }, data: { status: "RETURN_REQUESTED" } });

  return apiSuccess(returnRequest, 201);
}
