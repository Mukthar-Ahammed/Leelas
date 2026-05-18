import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteProductImage } from "@/lib/cloudinary";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: { orderBy: { retailPrice: "asc" } },
      images: { orderBy: { order: "asc" } },
      seo: true,
    },
  });

  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const adminId = session?.user?.id;
  if (!adminId || (session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const hasOrders = await db.orderItem.count({ where: { variant: { productId: id } } });
  if (hasOrders > 0) {
    return NextResponse.json(
      { error: "Cannot delete: this product has order history. Deactivate it instead." },
      { status: 409 }
    );
  }

  const images = await db.productImage.findMany({ where: { productId: id }, select: { publicId: true } });

  await db.$transaction([
    db.wishlist.deleteMany({ where: { variant: { productId: id } } }),
    db.cartItem.deleteMany({ where: { variant: { productId: id } } }),
    db.review.deleteMany({ where: { productId: id } }),
    db.productImage.deleteMany({ where: { productId: id } }),
    db.productSEO.deleteMany({ where: { productId: id } }),
    db.productVariant.deleteMany({ where: { productId: id } }),
    db.product.delete({ where: { id } }),
  ]);

  for (const img of images) {
    if (img.publicId) await deleteProductImage(img.publicId).catch(() => {});
  }

  await db.auditLog.create({
    data: { adminId, action: "HARD_DELETE_PRODUCT", targetType: "Product", targetId: id },
  });

  return NextResponse.json({ success: true });
}
