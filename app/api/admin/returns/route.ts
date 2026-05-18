import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const returns = await db.returnRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      order: { select: { id: true, totalAmount: true } },
    },
  });

  return NextResponse.json(returns);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const adminId = session?.user?.id;
  if (!adminId || (session?.user as { role?: string } | undefined)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, status, adminNotes } = await req.json();
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const returnReq = await db.returnRequest.update({
    where: { id },
    data: { status, adminNotes },
  });

  await db.auditLog.create({
    data: { adminId, action: `RETURN_${status}`, targetType: "ReturnRequest", targetId: id, metadata: { adminNotes } },
  });

  return NextResponse.json(returnReq);
}
