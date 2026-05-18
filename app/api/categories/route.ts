import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { createCategorySchema } from "@/lib/validations/product";

// ─── GET /api/categories ──────────────────────────────────────────────────────

export async function GET() {
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });

  return apiSuccess(categories);
}

// ─── POST /api/categories ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const existing = await db.category.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return apiError("SLUG_TAKEN", `Category slug "${parsed.data.slug}" is already in use.`, 409);
  }

  const category = await db.category.create({ data: parsed.data });
  return apiSuccess(category, 201);
}
