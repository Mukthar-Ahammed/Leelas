import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { reorderImagesSchema } from "@/lib/validations/product";

type Params = { params: Promise<{ slug: string }> };

// ─── PATCH /api/products/[slug]/images/reorder ───────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
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

  const parsed = reorderImagesSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  // Verify all image IDs belong to this product
  const imageIds = parsed.data.images.map((i) => i.id);
  const owned = await db.productImage.count({
    where: { id: { in: imageIds }, productId: product.id },
  });
  if (owned !== imageIds.length) {
    return apiError("INVALID_IMAGE_IDS", "One or more image IDs do not belong to this product.", 400);
  }

  await db.$transaction(
    parsed.data.images.map(({ id, order }) =>
      db.productImage.update({ where: { id }, data: { order } })
    )
  );

  const images = await db.productImage.findMany({
    where: { productId: product.id },
    orderBy: { order: "asc" },
  });

  return apiSuccess(images);
}
