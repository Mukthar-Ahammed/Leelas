import { Metadata } from "next";
import { db } from "@/lib/db";
import {
  Calendar,
  RotateCcw,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  FileText,
  BarChart2,
} from "lucide-react";

export const metadata: Metadata = { title: "Returns | Leelas Admin" };

export default async function AdminReturnsPage() {
  const returns = await db.returnRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      order: { select: { id: true, totalAmount: true } },
    },
  });

  const pendingCount = returns.filter((r) => r.status === "PENDING").length;
  const approvedCount = returns.filter((r) => r.status === "APPROVED").length;
  const rejectedCount = returns.filter((r) => r.status === "REJECTED").length;

  return (
    <div className="bg-white min-h-[calc(100vh-2rem)] p-10 text-slate-800 rounded-[2rem] shadow-sm">

      {/* Date Header */}
      <div className="flex items-center gap-2 text-slate-800 font-semibold mb-10">
        <div className="bg-[#f0ebff] p-1.5 rounded-md">
          <Calendar className="w-5 h-5 text-[#6d28d9]" />
        </div>
        <span className="text-[15px]">
          {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>

      {/* Title */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Returns</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
        <div className="bg-[#fffbf0] rounded-[1.5rem] p-7 border border-yellow-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Pending Review</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#d97706]">{pendingCount}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <Clock className="w-4 h-4" />
              <span>Awaiting action</span>
            </div>
          </div>
        </div>

        <div className="bg-[#f0fdf4] rounded-[1.5rem] p-7 border border-green-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Approved</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#15803d]">{approvedCount}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <CheckCircle2 className="w-4 h-4" />
              <span>Refund initiated</span>
            </div>
          </div>
        </div>

        <div className="bg-[#fef4f1] rounded-[1.5rem] p-7 border border-orange-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Rejected</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#e14e21]">{rejectedCount}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <XCircle className="w-4 h-4" />
              <span>Declined</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full px-2">
        <table className="w-full text-[14px] text-left border-separate border-spacing-y-2">
          <thead>
            <tr className="text-slate-800">
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-[18px] h-[18px] text-[#6d28d9]" /> Order
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <User className="w-[18px] h-[18px] text-[#1e61c7]" /> Customer
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <FileText className="w-[18px] h-[18px] text-[#e14e21]" /> Reason
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-[18px] h-[18px] text-slate-400" /> Status
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Clock className="w-[18px] h-[18px] text-slate-400" /> Date
                </div>
              </th>
              <th className="pb-6 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={6} className="border-b border-slate-100/60 pb-2"></td></tr>
            {returns.map((r) => (
              <tr key={r.id} className="group">
                <td className="py-5 font-bold text-slate-700 border-b border-slate-50 group-last:border-0">
                  #{r.orderId.slice(-6).toUpperCase()}
                </td>
                <td className="py-5 font-bold text-slate-700 border-b border-slate-50 group-last:border-0">
                  <div>{r.user.name}</div>
                  <div className="text-[12px] font-semibold text-slate-400">{r.user.email}</div>
                </td>
                <td className="py-5 text-slate-500 font-semibold max-w-[200px] truncate border-b border-slate-50 group-last:border-0">
                  {r.reason}
                </td>
                <td className="py-5 border-b border-slate-50 group-last:border-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold ${
                    r.status === "APPROVED"
                      ? "bg-[#f0fdf4] text-[#15803d]"
                      : r.status === "REJECTED"
                      ? "bg-[#fef4f1] text-[#e14e21]"
                      : "bg-[#fffbf0] text-[#d97706]"
                  }`}>
                    {r.status === "APPROVED" && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {r.status === "REJECTED" && <XCircle className="w-3.5 h-3.5" />}
                    {r.status === "PENDING" && <Clock className="w-3.5 h-3.5" />}
                    {r.status}
                  </span>
                </td>
                <td className="py-5 text-slate-500 font-semibold border-b border-slate-50 group-last:border-0">
                  {new Date(r.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "2-digit", year: "numeric"
                  })}
                </td>
                <td className="py-5 text-right border-b border-slate-50 group-last:border-0">
                  {r.status === "PENDING" ? (
                    <div className="flex items-center justify-end gap-3">
                      <button className="px-3 py-1.5 rounded-xl bg-[#f0fdf4] text-[#15803d] text-[12px] font-bold hover:bg-green-100 transition-colors">
                        Approve
                      </button>
                      <button className="px-3 py-1.5 rounded-xl bg-[#fef4f1] text-[#e14e21] text-[12px] font-bold hover:bg-red-100 transition-colors">
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-300 text-sm font-bold">—</span>
                  )}
                </td>
              </tr>
            ))}
            {returns.length === 0 && (
              <tr>
                <td colSpan={6} className="py-20 text-center font-bold text-slate-400">
                  No return requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
