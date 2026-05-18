import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { z } from "zod";

const querySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ─── GET /api/admin/orders ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const { status, page, limit } = querySchema.parse(raw);

  const where = status ? { status: status as never } : {};

  const [orders, total] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.order.count({ where }),
  ]);

  return apiSuccess({ orders, total, page, totalPages: Math.ceil(total / limit) });
}
