import { Metadata } from "next";
import { db } from "@/lib/db";
import Link from "next/link";
import { 
  Calendar, 
  Menu, 
  Archive, 
  Tag, 
  BarChart2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowUp,
  ArrowDown
} from "lucide-react";

export const metadata: Metadata = { title: "Orders | Leelas Admin" };

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const currentTab = typeof resolvedParams.tab === 'string' ? resolvedParams.tab : 'all';

  const tabToStatus: Record<string, any> = {
    'all': undefined,
    'pending': 'PENDING',
    'delivered': 'DELIVERED',
    'booked': 'CONFIRMED',
    'cancelled': 'CANCELLED'
  };

  const statusFilter = tabToStatus[currentTab];

  const orders = await db.order.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    include: { 
      items: {
        include: { variant: { include: { product: true } } }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const newOrdersCount = await db.order.count();
  const pendingOrdersCount = await db.order.count({ where: { status: 'PENDING' } });
  const deliveredOrdersCount = await db.order.count({ where: { status: 'DELIVERED' } });

  const tabs = [
    { name: "All Orders", value: "all" },
    { name: "Pending Orders", value: "pending" },
    { name: "Delivered Orders", value: "delivered" },
    { name: "Booked Orders", value: "booked" },
    { name: "Cancelled Orders", value: "cancelled" },
  ];

  return (
    <div className="bg-white min-h-[calc(100vh-2rem)] p-10 text-slate-800 rounded-[2rem] shadow-sm">
      
      {/* Top Date Header */}
      <div className="flex items-center gap-2 text-slate-800 font-semibold mb-10">
        <div className="bg-[#f0ebff] p-1.5 rounded-md">
          <Calendar className="w-5 h-5 text-[#6d28d9]" />
        </div>
        <span className="text-[15px]">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>

      {/* Title & Toggle */}
      <div className="flex items-center gap-6 mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Orders</h1>
        <div className="flex bg-[#f8fafc] p-1 rounded-xl shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
          <button className="px-5 py-2 text-sm font-bold bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] rounded-lg text-slate-800">
            Daily
          </button>
          <button className="px-5 py-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
            Monthly
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
        {/* New Orders */}
        <div className="bg-[#f4f9ff] rounded-[1.5rem] p-7 border border-blue-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">New Orders</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#1e61c7]">{newOrdersCount}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-600">
              <span className="text-slate-300">|</span>
              <span>Impression · 20%</span>
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[#1e61c7] shadow-sm">
                <ArrowUp className="w-3 h-3 stroke-[3]" />
              </span>
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-[#f3f0ff] rounded-[1.5rem] p-7 border border-purple-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Pending Orders</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#6d28d9]">{pendingOrdersCount}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-600">
              <span className="text-slate-300">|</span>
              <span>Impression · 11%</span>
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[#6d28d9] shadow-sm">
                <ArrowDown className="w-3 h-3 stroke-[3]" />
              </span>
            </div>
          </div>
        </div>

        {/* Delivered Orders */}
        <div className="bg-[#fef4f1] rounded-[1.5rem] p-7 border border-orange-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Delivered Orders</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#e14e21]">{deliveredOrdersCount}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-600">
              <span className="text-slate-300">|</span>
              <span>Impression · 18%</span>
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[#e14e21] shadow-sm">
                <ArrowUp className="w-3 h-3 stroke-[3]" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-10 border-b border-slate-100 mb-8 px-2">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.value;
          return (
            <Link
              key={tab.value}
              href={`?tab=${tab.value}`}
              className={`pb-4 text-[15px] font-bold transition-colors relative ${
                isActive ? "text-[#6d28d9]" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.name}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6d28d9] rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="w-full px-2">
        <table className="w-full text-[14px] text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-slate-800 border-b border-slate-100">
              <th className="pb-6 font-bold flex items-center gap-2">
                <Menu className="w-[18px] h-[18px] text-[#6d28d9]" /> Order ID
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Calendar className="w-[18px] h-[18px] text-[#e14e21]" /> Ordered Date
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Archive className="w-[18px] h-[18px] text-[#1e61c7]" /> Product Name
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Tag className="w-[18px] h-[18px] text-[#22c55e]" /> Product Price
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-[18px] h-[18px] text-slate-400" /> Status
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={5} className="border-b border-slate-100/60 pb-2"></td></tr>
            {orders.map((order) => {
              const productName = order.items[0]?.variant.product.name || "Custom Order";
              const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              }).replace(/\//g, '-');
              
              return (
                <tr key={order.id} className="group relative">
                  <td className="py-6 font-bold text-slate-600 border-b border-slate-50 group-last:border-0">
                    #{order.id.slice(-6).toUpperCase()}
                  </td>
                  <td className="py-6 text-slate-600 font-bold border-b border-slate-50 group-last:border-0">
                    {date}
                  </td>
                  <td className="py-6 text-slate-600 font-bold border-b border-slate-50 group-last:border-0">
                    {productName}
                    {order.items.length > 1 && <span className="text-slate-400 text-xs ml-2 font-semibold">+{order.items.length - 1} more</span>}
                  </td>
                  <td className="py-6 text-slate-600 font-bold border-b border-slate-50 group-last:border-0">
                    ₹{(order.totalAmount / 100).toFixed(0)} INR
                  </td>
                  <td className="py-6 border-b border-slate-50 group-last:border-0">
                    <div className="flex items-center gap-2 font-bold">
                      {order.status === 'DELIVERED' && (
                        <>
                          <CheckCircle2 className="w-[18px] h-[18px] text-[#10b981]" />
                          <span className="text-slate-700">Delivered</span>
                        </>
                      )}
                      {(order.status === 'CANCELLED' || order.status === 'RETURNED') && (
                        <>
                          <XCircle className="w-[18px] h-[18px] text-[#ef4444]" />
                          <span className="text-slate-700">Cancelled</span>
                        </>
                      )}
                      {(order.status === 'PENDING' || order.status === 'CONFIRMED' || order.status === 'PROCESSING') && (
                        <>
                          <Clock className="w-[18px] h-[18px] text-[#3b82f6]" />
                          <span className="text-slate-700 capitalize">{order.status.toLowerCase()}</span>
                        </>
                      )}
                      {(!['DELIVERED', 'CANCELLED', 'RETURNED', 'PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status)) && (
                        <>
                          <CheckCircle2 className="w-[18px] h-[18px] text-slate-400" />
                          <span className="text-slate-700 capitalize">{order.status.toLowerCase()}</span>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center font-bold text-slate-400">
                  No orders found for this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
