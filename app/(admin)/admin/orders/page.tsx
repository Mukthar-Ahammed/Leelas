import { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Orders | Leelas Admin" };

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Orders</h1>
      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b">
            <tr>
              {["Order ID", "Customer", "Date", "Status", "Payment", "Total"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">#{order.id.slice(-8).toUpperCase()}</td>
                <td className="px-4 py-3">
                  {order.user?.name ?? order.guestEmail ?? "Guest"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700">
                    {order.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      order.paymentStatus === "PAID"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium">₹{(order.totalAmount / 100).toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No orders yet</p>
        )}
      </div>
    </div>
  );
}
