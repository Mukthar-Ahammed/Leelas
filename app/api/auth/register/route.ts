import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { apiSuccess, apiError } from "@/lib/api-helpers";
import { signToken } from "@/lib/token";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const { name, email, password, phone, referralCode } = parsed.data;

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return apiError("EMAIL_TAKEN", "An account with this email already exists.", 409);
  }

  let referredById: string | undefined;
  if (referralCode) {
    const referrer = await db.user.findUnique({ where: { referralCode } });
    if (referrer) referredById = referrer.id;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newReferralCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  const user = await db.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone,
      referralCode: newReferralCode,
      referredById,
    },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });

  const token = signToken(user.id, user.role);

  return apiSuccess({ token, user: { ...user, phone: user.phone ?? "" } }, 201);
}
