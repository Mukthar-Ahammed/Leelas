import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { updateVariantSchema } from "@/lib/validations/product";

type Params = { params: Promise<{ slug: string; variantId: string }> };

// ─── PATCH /api/products/[slug]/variants/[variantId] ─────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { slug, variantId } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!product) return apiError("NOT_FOUND", "Product not found.", 404);

  const variant = await db.productVariant.findFirst({
    where: { id: variantId, productId: product.id },
    select: { id: true },
  });
  if (!variant) return apiError("NOT_FOUND", "Variant not found.", 404);

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = updateVariantSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  if (parsed.data.sku) {
    const skuConflict = await db.productVariant.findFirst({
      where: { sku: parsed.data.sku, id: { not: variantId } },
      select: { id: true },
    });
    if (skuConflict) {
      return apiError("SKU_TAKEN", `SKU "${parsed.data.sku}" is already in use.`, 409);
    }
  }

  const updated = await db.productVariant.update({
    where: { id: variantId },
    data: parsed.data,
  });

  await db.auditLog.create({
    data: {
      adminId: guard.adminId,
      action: "VARIANT_UPDATED",
      targetType: "PRODUCT",
      targetId: product.id,
      metadata: { variantId, ...parsed.data },
    },
  });

  return apiSuccess(updated);
}

// ─── DELETE /api/products/[slug]/variants/[variantId] ────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { slug, variantId } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!product) return apiError("NOT_FOUND", "Product not found.", 404);

  const variant = await db.productVariant.findFirst({
    where: { id: variantId, productId: product.id },
    select: { id: true },
  });
  if (!variant) return apiError("NOT_FOUND", "Variant not found.", 404);

  const activeOrderCount = await db.order.count({
    where: {
      status: { notIn: ["DELIVERED", "CANCELLED", "REFUNDED"] },
      items: { some: { variantId } },
    },
  });

  if (activeOrderCount > 0) {
    return apiError(
      "HAS_ACTIVE_ORDERS",
      "Cannot delete variant with active orders.",
      400
    );
  }

  await db.productVariant.delete({ where: { id: variantId } });

  await db.auditLog.create({
    data: {
      adminId: guard.adminId,
      action: "VARIANT_DELETED",
      targetType: "PRODUCT",
      targetId: product.id,
      metadata: { variantId },
    },
  });

  return apiSuccess({ deleted: true });
}
