import { Metadata } from "next";
import { db } from "@/lib/db";
import {
  Package,
  CheckCircle2,
  XCircle,
  Users,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ArrowUpRight,
  Clock,
  IndianRupee,
} from "lucide-react";

export const metadata: Metadata = { title: "Dashboard | Leelas Admin" };

export default async function DashboardPage() {
  const [
    totalProducts,
    completedOrders,
    cancelledOrders,
    pendingOrders,
    totalUsers,
    revenueResult,
    recentOrders,
    topProducts,
  ] = await Promise.all([
    db.product.count({ where: { isActive: true } }),
    db.order.count({ where: { status: "DELIVERED" } }),
    db.order.count({ where: { status: "CANCELLED" } }),
    db.order.count({ where: { status: "PENDING" } }),
    db.user.count({ where: { role: "USER" } }),
    db.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { totalAmount: true },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        items: {
          take: 1,
          include: { variant: { include: { product: true } } },
        },
      },
    }),
    db.product.findMany({
      where: { isActive: true },
      include: { _count: { select: { reviews: true } }, variants: { select: { stock: true } } },
      take: 4,
    }),
  ]);

  const revenue = revenueResult._sum.totalAmount ?? 0;

  return (
    <div className="bg-white min-h-[calc(100vh-2rem)] p-10 text-slate-800 rounded-[2rem] shadow-sm">

      {/* Page Title */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-slate-400 font-semibold mt-1 text-[15px]">
            Welcome back — here&apos;s what&apos;s happening at Leelas.
          </p>
        </div>
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-[14px]">
          <div className="bg-[#f0ebff] p-1.5 rounded-md">
            <Clock className="w-4 h-4 text-[#6d28d9]" />
          </div>
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
        {/* Total Products */}
        <div className="bg-[#f8f9ff] rounded-[1.5rem] p-6 border border-slate-100 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-400 mb-1">Total products</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-slate-900">{totalProducts}</span>
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#22c55e] bg-green-50 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" /> +2.5%
              </span>
            </div>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="bg-[#f8f9ff] rounded-[1.5rem] p-6 border border-slate-100 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-400 mb-1">Completed order</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-slate-900">{completedOrders}</span>
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#22c55e] bg-green-50 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" /> +2.5%
              </span>
            </div>
          </div>
        </div>

        {/* Cancelled Orders */}
        <div className="bg-[#f8f9ff] rounded-[1.5rem] p-6 border border-slate-100 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-400 mb-1">Canceled order</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-slate-900">{cancelledOrders}</span>
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#ef4444] bg-red-50 px-1.5 py-0.5 rounded-full">
                <TrendingDown className="w-3 h-3" /> -1.5%
              </span>
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-[#f8f9ff] rounded-[1.5rem] p-6 border border-slate-100 flex items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-slate-400 mb-1">Customers</p>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-slate-900">{totalUsers}</span>
              <span className="flex items-center gap-0.5 text-[11px] font-bold text-[#22c55e] bg-green-50 px-1.5 py-0.5 rounded-full">
                <TrendingUp className="w-3 h-3" /> +4%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Report + Quick Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

        {/* Sales Report Card */}
        <div className="lg:col-span-2 bg-[#f8f9ff] rounded-[1.5rem] p-8 border border-slate-100">
          <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-1">Your sales report</p>
          <p className="text-[13px] text-slate-400 mb-6">Look at your revenue</p>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-5xl font-black text-slate-900 mb-2">
                ₹{(revenue / 100).toLocaleString("en-IN")}
              </div>
              <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#22c55e]">
                <TrendingUp className="w-4 h-4" />
                <span>Total revenue from paid orders</span>
              </div>
            </div>
            {/* Mini sparkline visual */}
            <div className="flex items-end gap-1 h-16 pb-1">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                <div
                  key={i}
                  className="w-2 rounded-t-full"
                  style={{
                    height: `${h}%`,
                    backgroundColor: i === 11 ? "#6d28d9" : i % 2 === 0 ? "#c4b5fd" : "#e0d9ff",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-col gap-4">
          <div className="bg-[#f3f0ff] rounded-[1.5rem] p-6 border border-purple-50/50 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-slate-400 mb-1">Pending Orders</p>
              <p className="text-3xl font-black text-[#6d28d9]">{pendingOrders}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#ede9fe] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#6d28d9]" />
            </div>
          </div>

          <div className="bg-[#f0fdf4] rounded-[1.5rem] p-6 border border-green-50/50 flex items-center justify-between">
            <div>
              <p className="text-[13px] font-bold text-slate-400 mb-1">Avg Order Value</p>
              <p className="text-3xl font-black text-[#15803d]">
                ₹{completedOrders > 0 ? Math.round(revenue / 100 / completedOrders).toLocaleString("en-IN") : "0"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#dcfce7] flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-[#15803d]" />
            </div>
          </div>
        </div>
      </div>

      {/* Last Transactions + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Last Transactions Table */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[18px] font-extrabold text-slate-900">Last transactions</h2>
            <a
              href="/admin/orders"
              className="flex items-center gap-1 text-[13px] font-bold text-[#6d28d9] hover:underline"
            >
              View all <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
          <div className="bg-[#f8f9ff] rounded-[1.5rem] border border-slate-100 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-4 font-bold text-slate-400">Order ID</th>
                  <th className="text-left px-5 py-4 font-bold text-slate-400">Product</th>
                  <th className="text-left px-5 py-4 font-bold text-slate-400">Date</th>
                  <th className="text-left px-5 py-4 font-bold text-slate-400">Amount</th>
                  <th className="text-left px-5 py-4 font-bold text-slate-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, idx) => {
                  const productName = order.items[0]?.variant.product.name ?? "Custom Order";
                  const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "2-digit", year: "numeric"
                  });

                  const statusStyle = {
                    DELIVERED: "bg-green-50 text-green-700",
                    PENDING: "bg-yellow-50 text-yellow-700",
                    CANCELLED: "bg-red-50 text-red-700",
                    CONFIRMED: "bg-blue-50 text-blue-700",
                  }[order.status] ?? "bg-slate-100 text-slate-500";

                  return (
                    <tr
                      key={order.id}
                      className={`border-b border-slate-50 last:border-0 ${idx % 2 === 1 ? "bg-white/60" : ""}`}
                    >
                      <td className="px-5 py-4 font-bold text-slate-500">
                        #{order.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700 max-w-[140px] truncate">
                        {productName}
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-semibold">{date}</td>
                      <td className="px-5 py-4 font-bold text-slate-700">
                        ₹{(order.totalAmount / 100).toFixed(0)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusStyle}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center font-bold text-slate-400">
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[18px] font-extrabold text-slate-900">Top products</h2>
            <a
              href="/admin/products"
              className="flex items-center gap-1 text-[13px] font-bold text-[#6d28d9] hover:underline"
            >
              View all <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
          <div className="flex flex-col gap-3">
            {topProducts.map((product, i) => {
              const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);
              const colors = [
                "bg-[#f3f0ff] text-[#6d28d9]",
                "bg-[#fef4f1] text-[#e14e21]",
                "bg-[#f0fdf4] text-[#15803d]",
                "bg-[#eff6ff] text-[#1e61c7]",
              ];
              return (
                <div
                  key={product.id}
                  className="bg-[#f8f9ff] rounded-[1.25rem] p-5 border border-slate-100 flex items-center gap-4"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-[15px] flex-shrink-0 ${colors[i % colors.length]}`}>
                    {(i + 1).toString().padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 text-[14px] truncate">{product.name}</div>
                    <div className="text-[12px] font-semibold text-slate-400 mt-0.5">
                      {totalStock} in stock · {product._count.reviews} reviews
                    </div>
                  </div>
                  <ShoppingBag className="w-4 h-4 text-slate-300 flex-shrink-0" />
                </div>
              );
            })}
            {topProducts.length === 0 && (
              <div className="text-center py-10 font-bold text-slate-400 text-[14px]">
                No products yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
