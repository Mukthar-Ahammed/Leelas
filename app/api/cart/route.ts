import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const cartInclude = {
  items: {
    include: {
      variant: {
        include: { product: { include: { images: { take: 1 } } } },
      },
    },
  },
};

async function getCart(userId?: string, sessionId?: string) {
  if (userId) return db.cart.findUnique({ where: { userId }, include: cartInclude });
  if (sessionId) return db.cart.findUnique({ where: { sessionId }, include: cartInclude });
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const sessionId = req.cookies.get("cart_session")?.value;
  const cart = await getCart(session?.user?.id, sessionId);
  return NextResponse.json(cart ?? { items: [] });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const sessionId = req.cookies.get("cart_session")?.value ?? crypto.randomUUID();
  const { variantId, quantity = 1 } = await req.json();

  const variant = await db.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });
  if (variant.stock < quantity) return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });

  const cartWhere = session?.user?.id ? { userId: session.user.id } : { sessionId };
  const cartData = session?.user?.id ? { userId: session.user.id } : { sessionId };

  let cart = await db.cart.findFirst({ where: cartWhere });
  if (!cart) {
    cart = await db.cart.create({ data: cartData });
  }

  const existing = await db.cartItem.findFirst({ where: { cartId: cart.id, variantId } });
  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: existing.quantity + quantity } });
  } else {
    await db.cartItem.create({ data: { cartId: cart.id, variantId, quantity } });
  }

  const res = NextResponse.json({ success: true });
  if (!session?.user?.id) {
    res.cookies.set("cart_session", sessionId, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 });
  }
  return res;
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const sessionId = req.cookies.get("cart_session")?.value;
  const { itemId } = await req.json();

  const item = await db.cartItem.findUnique({ where: { id: itemId }, include: { cart: true } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const authorized =
    (session?.user?.id && item.cart.userId === session.user.id) ||
    (sessionId && item.cart.sessionId === sessionId);

  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await db.cartItem.delete({ where: { id: itemId } });
  return NextResponse.json({ success: true });
}
