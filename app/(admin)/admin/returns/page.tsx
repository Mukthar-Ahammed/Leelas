import { Metadata } from "next";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Returns | Leelas Admin" };

export default async function AdminReturnsPage() {
  const returns = await db.returnRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      order: { select: { id: true, totalAmount: true } },
    },
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Returns</h1>
      <div className="border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b">
            <tr>
              {["Order", "Customer", "Reason", "Status", "Date", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {returns.map((r) => (
              <tr key={r.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">#{r.orderId.slice(-8).toUpperCase()}</td>
                <td className="px-4 py-3">{r.user.name}</td>
                <td className="px-4 py-3 max-w-xs truncate">{r.reason}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    r.status === "APPROVED" ? "bg-green-100 text-green-700" :
                    r.status === "REJECTED" ? "bg-red-100 text-red-700" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(r.createdAt).toLocaleDateString("en-IN")}
                </td>
                <td className="px-4 py-3 flex gap-2">
                  {r.status === "PENDING" && (
                    <>
                      <button className="text-green-700 hover:underline text-xs">Approve</button>
                      <button className="text-red-700 hover:underline text-xs">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {returns.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No return requests</p>
        )}
      </div>
    </div>
  );
}
