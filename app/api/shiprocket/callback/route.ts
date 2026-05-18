import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapShiprocketStatus } from "@/lib/shiprocket";
import { sendOrderNotification } from "@/lib/notifications";

// ─── POST /api/shiprocket/callback ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: true });

  // ShipRocket sends order_id (our internal ID) and current_status
  const srOrderId = body.order_id as string | undefined;
  const srStatus = (body.current_status ?? body.status) as string | undefined;

  if (!srOrderId || !srStatus) {
    return NextResponse.json({ ok: true });
  }

  // Attempt lookup by our internal order ID first, then by shiprocketOrderId
  const order = await db.order.findFirst({
    where: {
      OR: [
        { id: srOrderId },
        { shiprocketOrderId: srOrderId },
      ],
    },
    select: { id: true, status: true, shiprocketOrderId: true },
  });

  if (!order) {
    console.warn("[ShipRocket callback] Unknown order:", srOrderId);
    return NextResponse.json({ ok: true });
  }

  const mapped = mapShiprocketStatus(srStatus);
  if (!mapped) {
    return NextResponse.json({ ok: true });
  }

  await db.order.update({
    where: { id: order.id },
    data: { status: mapped.orderStatus as never },
  });

  if (mapped.notificationType) {
    sendOrderNotification(order.id, mapped.notificationType).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}
