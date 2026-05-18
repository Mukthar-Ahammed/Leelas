import type { OrderStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";

// ─── GET /api/admin/analytics ─────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Statuses that represent confirmed revenue (excludes PENDING and CANCELLED)
  const revenueStatuses: OrderStatus[] = [
    "CONFIRMED", "PROCESSING", "PACKED", "SHIPPED",
    "OUT_FOR_DELIVERY", "DELIVERED",
    "RETURN_REQUESTED", "RETURNED", "REFUND_INITIATED", "REFUNDED",
  ];

  const [
    totalOrders,
    todayOrders,
    weekOrders,
    monthOrders,
    todayRevenue,
    weekRevenue,
    monthRevenue,
    pendingOrders,
    newUsers,
    topVariantGroups,
  ] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: todayStart } } }),
    db.order.count({ where: { createdAt: { gte: weekAgo } } }),
    db.order.count({ where: { createdAt: { gte: monthAgo } } }),
    db.order.aggregate({
      where: { status: { in: revenueStatuses }, createdAt: { gte: todayStart } },
      _sum: { totalAmount: true },
    }),
    db.order.aggregate({
      where: { status: { in: revenueStatuses }, createdAt: { gte: weekAgo } },
      _sum: { totalAmount: true },
    }),
    db.order.aggregate({
      where: { status: { in: revenueStatuses }, createdAt: { gte: monthAgo } },
      _sum: { totalAmount: true },
    }),
    db.order.count({ where: { status: { in: ["PENDING", "CONFIRMED"] } } }),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.orderItem.groupBy({
      by: ["variantId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  // Resolve product names for top variants
  const variantIds = topVariantGroups.map((g) => g.variantId);
  const variants = await db.productVariant.findMany({
    where: { id: { in: variantIds } },
    select: {
      id: true,
      weight: true,
      product: { select: { name: true, slug: true } },
    },
  });

  const topProducts = topVariantGroups.map((g) => {
    const v = variants.find((x) => x.id === g.variantId);
    return {
      variantId: g.variantId,
      orderCount: g._count.id,
      productName: v?.product.name ?? "Unknown",
      productSlug: v?.product.slug ?? "",
      weight: v?.weight ?? "",
    };
  });

  return apiSuccess({
    totalOrders,
    todayOrders,
    weekOrders,
    monthOrders,
    todayRevenue: todayRevenue._sum.totalAmount ?? 0,
    weekRevenue: weekRevenue._sum.totalAmount ?? 0,
    monthRevenue: monthRevenue._sum.totalAmount ?? 0,
    pendingOrders,
    newUsers,
    topProducts,
  });
}
