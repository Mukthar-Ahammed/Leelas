import { Metadata } from "next";
import { db } from "@/lib/db";
import {
  Calendar,
  ShieldAlert,
  Activity,
  User,
  FileText,
  Clock,
  Layers,
} from "lucide-react";

export const metadata: Metadata = { title: "Audit Log | Leelas Admin" };

export default async function AdminAuditLogPage() {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      admin: { select: { name: true, email: true } },
    },
  });

  const todayCount = logs.filter((l) => {
    const logDate = new Date(l.createdAt).toDateString();
    return logDate === new Date().toDateString();
  }).length;

  const uniqueAdmins = new Set(logs.map((l) => l.adminId)).size;
  const uniqueActions = new Set(logs.map((l) => l.action)).size;

  function actionColor(action: string) {
    if (action.startsWith("CREATE")) return "bg-[#f0fdf4] text-[#15803d]";
    if (action.startsWith("DELETE")) return "bg-[#fef4f1] text-[#e14e21]";
    if (action.startsWith("UPDATE")) return "bg-[#eff6ff] text-[#1e61c7]";
    return "bg-slate-100 text-slate-500";
  }

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
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Audit Log</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
        <div className="bg-[#f4f9ff] rounded-[1.5rem] p-7 border border-blue-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Today&apos;s Actions</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#1e61c7]">{todayCount}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <Activity className="w-4 h-4" />
              <span>Events today</span>
            </div>
          </div>
        </div>

        <div className="bg-[#f3f0ff] rounded-[1.5rem] p-7 border border-purple-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Active Admins</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#6d28d9]">{uniqueAdmins}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <ShieldAlert className="w-4 h-4" />
              <span>In this log</span>
            </div>
          </div>
        </div>

        <div className="bg-[#fef4f1] rounded-[1.5rem] p-7 border border-orange-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Action Types</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#e14e21]">{uniqueActions}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <Layers className="w-4 h-4" />
              <span>Distinct ops</span>
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
                  <Activity className="w-[18px] h-[18px] text-[#6d28d9]" /> Action
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Layers className="w-[18px] h-[18px] text-[#1e61c7]" /> Target
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <FileText className="w-[18px] h-[18px] text-[#e14e21]" /> Target ID
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <User className="w-[18px] h-[18px] text-[#22c55e]" /> Admin
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Clock className="w-[18px] h-[18px] text-slate-400" /> Time
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={5} className="border-b border-slate-100/60 pb-2"></td></tr>
            {logs.map((log) => (
              <tr key={log.id} className="group">
                <td className="py-5 border-b border-slate-50 group-last:border-0">
                  <span className={`inline-flex px-3 py-1 rounded-full text-[12px] font-bold ${actionColor(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td className="py-5 font-bold text-slate-700 border-b border-slate-50 group-last:border-0">
                  {log.targetType}
                </td>
                <td className="py-5 font-mono text-[12px] text-slate-400 border-b border-slate-50 group-last:border-0">
                  #{log.targetId.slice(-8).toUpperCase()}
                </td>
                <td className="py-5 border-b border-slate-50 group-last:border-0">
                  <div className="font-bold text-slate-700">{log.admin.name}</div>
                  <div className="text-[12px] font-semibold text-slate-400">{log.admin.email}</div>
                </td>
                <td className="py-5 text-slate-500 font-semibold border-b border-slate-50 group-last:border-0">
                  {new Date(log.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "2-digit", year: "numeric"
                  })}{" "}
                  <span className="text-slate-400 text-[12px]">
                    {new Date(log.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit", minute: "2-digit"
                    })}
                  </span>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-20 text-center font-bold text-slate-400">
                  No audit events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
