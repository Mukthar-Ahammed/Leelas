import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError, assertCustomer, isAuthError } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/orders/[id] ─────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const guard = await assertCustomer(req);
  if (isAuthError(guard)) return guard;

  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id, userId: guard.userId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: { include: { images: { take: 1, orderBy: { order: "asc" } } } },
            },
          },
        },
      },
    },
  });

  // Return 404 for both "not found" and "belongs to someone else" — don't reveal existence
  if (!order) return apiError("NOT_FOUND", "Order not found.", 404);

  return apiSuccess(order);
}
