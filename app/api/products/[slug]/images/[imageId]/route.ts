import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { deleteProductImage } from "@/lib/cloudinary";

type Params = { params: Promise<{ slug: string; imageId: string }> };

// ─── DELETE /api/products/[slug]/images/[imageId] ────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { slug, imageId } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!product) return apiError("NOT_FOUND", "Product not found.", 404);

  const image = await db.productImage.findFirst({
    where: { id: imageId, productId: product.id },
    select: { id: true, publicId: true },
  });
  if (!image) return apiError("NOT_FOUND", "Image not found.", 404);

  if (image.publicId) {
    await deleteProductImage(image.publicId);
  }

  await db.productImage.delete({ where: { id: imageId } });

  return apiSuccess({ deleted: true });
}
