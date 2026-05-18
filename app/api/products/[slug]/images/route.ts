import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import { uploadProductImage } from "@/lib/cloudinary";

type Params = { params: Promise<{ slug: string }> };

// ─── POST /api/products/[slug]/images ────────────────────────────────────────

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!product) return apiError("NOT_FOUND", "Product not found.", 404);

  const formData = await req.formData().catch(() => null);
  if (!formData) return apiError("INVALID_BODY", "Request must be multipart/form-data.", 400);

  const file = formData.get("image");
  if (!file || !(file instanceof Blob)) {
    return apiError("MISSING_FILE", "Field 'image' is required.", 400);
  }

  const variantLabel = (formData.get("variant") as string | null) ?? "";

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { url, publicId, altText } = await uploadProductImage(
    buffer,
    product.name,
    variantLabel
  );

  const maxOrderRow = await db.productImage.findFirst({
    where: { productId: product.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const nextOrder = (maxOrderRow?.order ?? -1) + 1;

  const image = await db.productImage.create({
    data: {
      productId: product.id,
      url,
      publicId,
      altText,
      order: nextOrder,
    },
  });

  return apiSuccess(image, 201);
}
