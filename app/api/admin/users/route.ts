import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  role: z.enum(["USER", "WHOLESALE", "ADMIN"]).optional(),
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["USER", "WHOLESALE"]),
  phone: z.string().optional(),
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const { page, limit, role } = querySchema.parse(raw);

  const where = role ? { role } : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  return apiSuccess({ users, total, page, totalPages: Math.ceil(total / limit) });
}

// ─── POST /api/admin/users ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const { name, email, password, role, phone } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return apiError("EMAIL_TAKEN", "A user with this email already exists.", 409);

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: { name, email, passwordHash, role, phone },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  await db.auditLog.create({
    data: {
      adminId: guard.adminId,
      action: "USER_CREATED",
      targetType: "User",
      targetId: user.id,
      metadata: { role, email },
    },
  });

  return apiSuccess(user, 201);
}
