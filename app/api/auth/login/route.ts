import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-helpers";
import { signToken } from "@/lib/token";
import { loginSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", parsed.error.flatten().fieldErrors as unknown as string, 400);
  }

  const { email, password } = parsed.data;

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true, email: true, phone: true, role: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return apiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return apiError("INVALID_CREDENTIALS", "Invalid email or password.", 401);
  }

  const token = signToken(user.id, user.role);

  return apiSuccess({
    token,
    user: { id: user.id, name: user.name, email: user.email, phone: user.phone ?? "", role: user.role },
  });
}
