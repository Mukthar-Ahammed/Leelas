import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { z } from "zod";

const querySchema = z.object({
  adminId: z.string().optional(),
  action: z.string().optional(),
  targetType: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// ─── GET /api/admin/audit-log ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const { adminId, action, targetType, page, limit } = querySchema.parse(raw);

  const where = {
    ...(adminId ? { adminId } : {}),
    ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}),
    ...(targetType ? { targetType } : {}),
  };

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.auditLog.count({ where }),
  ]);

  return apiSuccess({ logs, total, page, totalPages: Math.ceil(total / limit) });
}
