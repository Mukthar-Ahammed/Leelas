import { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Dashboard | Leelas Admin" };

export default async function DashboardPage() {
  const [totalOrders, totalUsers, pendingOrders, revenueResult] = await Promise.all([
    db.order.count(),
    db.user.count({ where: { role: "USER" } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { totalAmount: true },
    }),
  ]);

  const revenue = revenueResult._sum.totalAmount ?? 0;

  const stats = [
    { label: "Total Orders", value: totalOrders.toString() },
    { label: "Revenue", value: `₹${(revenue / 100).toLocaleString("en-IN")}` },
    { label: "Customers", value: totalUsers.toString() },
    { label: "Pending Orders", value: pendingOrders.toString() },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="border rounded-2xl p-6">
            <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
