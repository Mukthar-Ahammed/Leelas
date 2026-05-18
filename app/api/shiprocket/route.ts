import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createShipRocketOrder, trackShipment } from "@/lib/shiprocket";

export async function POST(req: NextRequest) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { orderId } = await req.json();

  await createShipRocketOrder(orderId);

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if ((session?.user as { role?: string })?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const shiprocketOrderId = searchParams.get("orderId");
  if (!shiprocketOrderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const tracking = await trackShipment(shiprocketOrderId);
  return NextResponse.json(tracking);
}
