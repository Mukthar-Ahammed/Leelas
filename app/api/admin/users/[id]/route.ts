import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("deactivate") }),
  z.object({ action: z.literal("activate") }),
  z.object({
    action: z.literal("changeRole"),
    role: z.enum(["USER", "WHOLESALE", "ADMIN"]),
    adminPassword: z.string().min(1, "Admin password is required for role changes"),
  }),
]);

// ─── PATCH /api/admin/users/[id] ──────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const target = await db.user.findUnique({
    where: { id },
    select: { id: true, isActive: true, role: true },
  });
  if (!target) return apiError("NOT_FOUND", "User not found.", 404);

  const data = parsed.data;

  if (data.action === "deactivate") {
    if (id === guard.adminId) {
      return apiError("CANNOT_DEACTIVATE_SELF", "You cannot deactivate your own account.", 400);
    }

    await db.user.update({ where: { id }, data: { isActive: false } });

    await db.auditLog.create({
      data: {
        adminId: guard.adminId,
        action: "USER_DEACTIVATED",
        targetType: "User",
        targetId: id,
      },
    });

    return apiSuccess({ id, isActive: false });
  }

  if (data.action === "activate") {
    await db.user.update({ where: { id }, data: { isActive: true } });

    await db.auditLog.create({
      data: {
        adminId: guard.adminId,
        action: "USER_ACTIVATED",
        targetType: "User",
        targetId: id,
      },
    });

    return apiSuccess({ id, isActive: true });
  }

  // changeRole — requires re-auth: verify admin's own password
  const adminUser = await db.user.findUnique({
    where: { id: guard.adminId },
    select: { passwordHash: true },
  });

  if (!adminUser) return apiError("INTERNAL_ERROR", "Admin user not found.", 500);

  const passwordValid = await bcrypt.compare(data.adminPassword, adminUser.passwordHash);
  if (!passwordValid) {
    return apiError("INVALID_PASSWORD", "Admin password confirmation failed.", 401);
  }

  await db.user.update({ where: { id }, data: { role: data.role } });

  await db.auditLog.create({
    data: {
      adminId: guard.adminId,
      action: "USER_ROLE_CHANGED",
      targetType: "User",
      targetId: id,
      metadata: { from: target.role, to: data.role },
    },
  });

  return apiSuccess({ id, role: data.role });
}
