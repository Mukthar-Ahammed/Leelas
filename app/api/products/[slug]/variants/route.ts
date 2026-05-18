import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { createVariantSchema } from "@/lib/validations/product";

type Params = { params: Promise<{ slug: string }> };

// ─── POST /api/products/[slug]/variants ───────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!product) return apiError("NOT_FOUND", "Product not found.", 404);

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = createVariantSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const skuExists = await db.productVariant.findFirst({
    where: { sku: parsed.data.sku },
    select: { id: true },
  });
  if (skuExists) {
    return apiError("SKU_TAKEN", `SKU "${parsed.data.sku}" is already in use.`, 409);
  }

  const variant = await db.productVariant.create({
    data: { ...parsed.data, productId: product.id },
  });

  await db.auditLog.create({
    data: {
      adminId: guard.adminId,
      action: "VARIANT_CREATED",
      targetType: "PRODUCT",
      targetId: product.id,
      metadata: parsed.data,
    },
  });

  return apiSuccess(variant, 201);
}
