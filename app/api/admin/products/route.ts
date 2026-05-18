import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { productSchema } from "@/lib/validations/product";

export async function POST(req: NextRequest) {
  const session = await auth();
  const adminId = session?.user?.id;
  if (!adminId || (session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { variants, seo, ...productData } = parsed.data;

  const product = await db.product.create({
    data: {
      ...productData,
      variants: { create: variants },
      seo: seo ? { create: seo } : undefined,
    },
    include: { variants: true, seo: true },
  });

  await db.auditLog.create({
    data: { adminId, action: "CREATE_PRODUCT", targetType: "Product", targetId: product.id },
  });

  return NextResponse.json(product, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const adminId = session?.user?.id;
  if (!adminId || (session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, seo } = body;

    // Explicitly pick known Product fields so unknown keys never reach Prisma
    const allowedFields = [
      "name", "slug", "description", "ingredients", "usageSuggestions",
      "categoryId", "isActive", "offerPercent", "offerStartsAt", "offerEndsAt",
    ] as const;

    type AllowedKey = typeof allowedFields[number];
    const data: Partial<Record<AllowedKey, unknown>> = {};
    for (const key of allowedFields) {
      if (key in body) data[key] = body[key] ?? null;
    }

    // Convert date strings to Date objects for DateTime fields
    if (data.offerStartsAt) data.offerStartsAt = new Date(data.offerStartsAt as string);
    if (data.offerEndsAt) data.offerEndsAt = new Date(data.offerEndsAt as string);

    const product = await db.product.update({
      where: { id },
      data: {
        ...data,
        ...(seo !== undefined && {
          seo: { upsert: { create: seo, update: seo } },
        }),
      },
    });

    await db.auditLog.create({
      data: { adminId, action: "UPDATE_PRODUCT", targetType: "Product", targetId: id },
    });

    return NextResponse.json(product);
  } catch (err) {
    console.error("[PATCH /api/admin/products]", err);
    const message = err instanceof Error ? err.message : "Failed to update product";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const adminId = session?.user?.id;
  if (!adminId || (session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await req.json();
  await db.product.update({ where: { id }, data: { isActive: false } });

  await db.auditLog.create({
    data: { adminId, action: "DELETE_PRODUCT", targetType: "Product", targetId: id },
  });

  return NextResponse.json({ success: true });
}
