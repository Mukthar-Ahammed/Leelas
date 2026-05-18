import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const variantUpdateSchema = z.object({
  id: z.string(),
  retailPrice: z.number().int().positive(),
  wholesalePrice: z.number().int().positive(),
  stock: z.number().int().min(0),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const adminId = session?.user?.id;
  if (!adminId || (session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = variantUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id, retailPrice, wholesalePrice, stock } = parsed.data;
  const variant = await db.productVariant.update({
    where: { id },
    data: { retailPrice, wholesalePrice, stock },
  });

  await db.auditLog.create({
    data: {
      adminId,
      action: "UPDATE_VARIANT",
      targetType: "ProductVariant",
      targetId: id,
      metadata: { retailPrice, wholesalePrice, stock },
    },
  });

  return NextResponse.json(variant);
}
