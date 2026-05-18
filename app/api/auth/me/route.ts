import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError, assertCustomer, isAuthError } from "@/lib/api-helpers";

const userSelect = {
  id: true, name: true, email: true, phone: true, role: true,
} as const;

export async function GET(req: NextRequest) {
  const guard = await assertCustomer(req);
  if (isAuthError(guard)) return guard;

  const user = await db.user.findUnique({ where: { id: guard.userId }, select: userSelect });
  if (!user) return apiError("NOT_FOUND", "User not found.", 404);

  return apiSuccess(user);
}

export async function PUT(req: NextRequest) {
  const guard = await assertCustomer(req);
  if (isAuthError(guard)) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const user = await db.user.update({
    where: { id: guard.userId },
    data: {
      ...(body.name ? { name: String(body.name) } : {}),
      ...(body.phone ? { phone: String(body.phone) } : {}),
    },
    select: userSelect,
  });

  return apiSuccess(user);
}
