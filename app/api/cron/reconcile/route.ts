import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { razorpay } from "@/lib/razorpay";
import { sendOrderNotification } from "@/lib/notifications";
import { createShipRocketOrder } from "@/lib/shiprocket";

// Netlify Scheduled Function — runs every hour
export const config = { schedule: "0 * * * *" };

export async function GET() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const pendingOrders = await db.order.findMany({
    where: {
      status: "PENDING",
      paymentMethod: "ONLINE",
      paymentStatus: "PENDING",
      createdAt: { lt: oneHourAgo },
      razorpayOrderId: { not: null },
    },
    select: { id: true, razorpayOrderId: true },
  });

  let reconciled = 0;

  for (const order of pendingOrders) {
    try {
      const rzpOrder = await razorpay.orders.fetch(order.razorpayOrderId!);

      if (rzpOrder.status === "paid") {
        await db.order.update({
          where: { id: order.id },
          data: { status: "CONFIRMED", paymentStatus: "PAID" },
        });

        sendOrderNotification(order.id, "PLACED").catch(console.error);
        createShipRocketOrder(order.id).catch(console.error);

        console.log("Reconciled order", order.id);
        reconciled++;
      }
    } catch (err) {
      console.error("Reconciliation error for order", order.id, ":", err);
    }
  }

  return NextResponse.json({ reconciled, timestamp: new Date().toISOString() });
}
