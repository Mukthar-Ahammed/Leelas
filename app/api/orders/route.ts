import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { apiSuccess, apiError, assertCustomer, isAuthError } from "@/lib/api-helpers";
import { orderCreateSchema } from "@/lib/validations/checkout";
import { calculateGST } from "@/lib/gst";
import { createRazorpayOrder } from "@/lib/razorpay";
import { sendOrderNotification } from "@/lib/notifications";
import { createShipRocketOrder } from "@/lib/shiprocket";

// Simple module-level idempotency cache (24 hr TTL per key)
const idempotencyCache = new Map<string, Record<string, unknown>>();

// ─── GET /api/orders ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const guard = await assertCustomer(req);
  if (isAuthError(guard)) return guard;

  const orders = await db.order.findMany({
    where: { userId: guard.userId },
    include: {
      items: {
        include: {
          variant: {
            include: { product: { select: { name: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(orders);
}

// ─── POST /api/orders ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const guard = await assertCustomer(req);
  if (isAuthError(guard)) return guard;

  const idempotencyKey = req.headers.get("Idempotent-Key");
  if (!idempotencyKey) {
    return apiError("MISSING_IDEMPOTENCY_KEY", "Idempotent-Key header is required.", 400);
  }

  const cached = idempotencyCache.get(idempotencyKey);
  if (cached) return apiSuccess(cached);

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = orderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const { shippingAddress, paymentMethod } = parsed.data;

  if (guard.role === "WHOLESALE" && paymentMethod === "COD") {
    return apiError("WHOLESALE_COD_NOT_ALLOWED", "Wholesale orders require online payment.", 400);
  }

  const cart = await db.cart.findFirst({
    where: { userId: guard.userId },
    include: { items: { include: { variant: true } } },
  });

  if (!cart || cart.items.length === 0) {
    return apiError("CART_EMPTY", "Your cart is empty.", 400);
  }

  const isWholesale = guard.role === "WHOLESALE";
  const lineItems = cart.items.map((item) => {
    const priceCharged = isWholesale
      ? item.variant.wholesalePrice
      : item.variant.retailPrice;
    return {
      variantId: item.variantId,
      quantity: item.quantity,
      retailPrice: item.variant.retailPrice,
      wholesalePrice: item.variant.wholesalePrice,
      priceCharged,
    };
  });

  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.priceCharged * item.quantity,
    0
  );

  const { gstAmount, total } = calculateGST(subtotal);

  // ── Transaction: stock check → order create → stock decrement → cart clear ──
  let orderId: string;
  try {
    orderId = await db.$transaction(async (tx) => {
      // Stock check (read then decrement atomically within serializable tx)
      for (const item of cart.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { id: true, stock: true },
        });
        if (!variant || variant.stock < item.quantity) {
          throw Object.assign(new Error("OUT_OF_STOCK"), {
            variantId: item.variantId,
          });
        }
      }

      const order = await tx.order.create({
        data: {
          userId: guard.userId,
          paymentMethod,
          shippingAddress: shippingAddress as object,
          subtotal,
          gstAmount,
          totalAmount: total,
          items: { create: lineItems },
        },
        select: { id: true },
      });

      for (const item of lineItems) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return order.id;
    });
  } catch (err) {
    const e = err as Error;
    if (e.message === "OUT_OF_STOCK") {
      return apiError("OUT_OF_STOCK", "One or more items are out of stock.", 400);
    }
    throw err;
  }

  // ── OUTSIDE transaction: Razorpay order (avoids long-held DB locks) ──────
  let razorpayOrderId: string | undefined;
  if (paymentMethod === "ONLINE") {
    const rzpOrder = await createRazorpayOrder(total, orderId);
    razorpayOrderId = rzpOrder.id as string;
    await db.order.update({ where: { id: orderId }, data: { razorpayOrderId } });
  } else {
    // COD confirmed immediately
    await db.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
    sendOrderNotification(orderId, "PLACED").catch(console.error);
    createShipRocketOrder(orderId).catch(console.error);
  }

  const result = {
    orderId,
    totalAmount: total,
    status: paymentMethod === "ONLINE" ? "PENDING" : "CONFIRMED",
    ...(razorpayOrderId ? { razorpayOrderId } : {}),
  };

  idempotencyCache.set(idempotencyKey, result);
  setTimeout(() => idempotencyCache.delete(idempotencyKey), 24 * 60 * 60 * 1000);

  return apiSuccess(result, 201);
}
