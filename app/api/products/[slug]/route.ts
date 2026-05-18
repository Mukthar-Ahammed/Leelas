import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { updateProductSchema } from "@/lib/validations/product";
import { generateProductMeta } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

const PRODUCT_INCLUDE = {
  images: { orderBy: { order: "asc" as const } },
  variants: { orderBy: { retailPrice: "asc" as const } },
  category: true,
  seo: true,
  reviews: {
    where: { isApproved: true },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  _count: { select: { reviews: { where: { isApproved: true } } } },
} as const;

// ─── GET /api/products/[slug] ─────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug, isActive: true },
    include: PRODUCT_INCLUDE,
  });

  if (!product) {
    return apiError("NOT_FOUND", "Product not found.", 404);
  }

  // Attach generated meta when not overridden
  const generatedMeta =
    !product.seo?.isOverridden && product.variants[0]
      ? generateProductMeta(product, product.variants[0])
      : null;

  return apiSuccess({ ...product, generatedMeta });
}

// ─── PATCH /api/products/[slug] ───────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { slug } = await params;

  const existing = await db.product.findUnique({ where: { slug }, select: { id: true } });
  if (!existing) return apiError("NOT_FOUND", "Product not found.", 404);

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const { metaTitle, metaDescription, ...productFields } = parsed.data;
  const hasSeoUpdate = metaTitle !== undefined || metaDescription !== undefined;

  const product = await db.product.update({
    where: { id: existing.id },
    data: {
      ...productFields,
      ...(hasSeoUpdate && {
        seo: {
          upsert: {
            create: { metaTitle, metaDescription, isOverridden: true },
            update: { metaTitle, metaDescription, isOverridden: true },
          },
        },
      }),
    },
    include: PRODUCT_INCLUDE,
  });

  await db.auditLog.create({
    data: {
      adminId: guard.adminId,
      action: "PRODUCT_UPDATED",
      targetType: "PRODUCT",
      targetId: existing.id,
      metadata: parsed.data,
    },
  });

  return apiSuccess(product);
}

// ─── DELETE /api/products/[slug] (soft-delete / archive) ─────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });
  if (!product) return apiError("NOT_FOUND", "Product not found.", 404);

  // Block archive if the product has variants in active orders
  const activeOrderCount = await db.order.count({
    where: {
      status: { notIn: ["DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"] },
      items: { some: { variant: { productId: product.id } } },
    },
  });

  if (activeOrderCount > 0) {
    return apiError(
      "HAS_ACTIVE_ORDERS",
      "Cannot archive product with active orders.",
      400
    );
  }

  await db.product.update({ where: { id: product.id }, data: { isActive: false } });

  await db.auditLog.create({
    data: {
      adminId: guard.adminId,
      action: "PRODUCT_ARCHIVED",
      targetType: "PRODUCT",
      targetId: product.id,
    },
  });

  return apiSuccess({ archived: true });
}
