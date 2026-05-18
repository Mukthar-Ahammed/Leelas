import { Metadata } from "next";
import { db } from "@/lib/db";
import {
  Calendar,
  Users,
  ShieldCheck,
  UserCheck,
  Mail,
  Phone,
  BarChart2,
  Clock,
} from "lucide-react";

export const metadata: Metadata = { title: "Users | Leelas Admin" };

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
  });

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const wholesaleCount = users.filter((u) => u.role === "WHOLESALE").length;

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
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Users</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
        <div className="bg-[#f4f9ff] rounded-[1.5rem] p-7 border border-blue-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Total Users</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#1e61c7]">{totalUsers}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <Users className="w-4 h-4" />
              <span>Registered</span>
            </div>
          </div>
        </div>

        <div className="bg-[#f3f0ff] rounded-[1.5rem] p-7 border border-purple-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Admins</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#6d28d9]">{adminCount}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <ShieldCheck className="w-4 h-4" />
              <span>Full access</span>
            </div>
          </div>
        </div>

        <div className="bg-[#fef4f1] rounded-[1.5rem] p-7 border border-orange-50/50">
          <h3 className="text-slate-800 font-bold mb-5 text-[15px]">Wholesale</h3>
          <div className="flex items-end gap-5">
            <span className="text-4xl font-black text-[#e14e21]">{wholesaleCount}</span>
            <div className="flex items-center gap-3 pb-1 text-[13px] font-semibold text-slate-500">
              <span className="text-slate-300">|</span>
              <UserCheck className="w-4 h-4" />
              <span>B2B accounts</span>
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
                  <Users className="w-[18px] h-[18px] text-[#6d28d9]" /> Name
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Mail className="w-[18px] h-[18px] text-[#1e61c7]" /> Email
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Phone className="w-[18px] h-[18px] text-[#e14e21]" /> Phone
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-[18px] h-[18px] text-[#22c55e]" /> Role
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-[18px] h-[18px] text-slate-400" /> Orders
                </div>
              </th>
              <th className="pb-6 font-bold">
                <div className="flex items-center gap-2">
                  <Clock className="w-[18px] h-[18px] text-slate-400" /> Joined
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan={6} className="border-b border-slate-100/60 pb-2"></td></tr>
            {users.map((user) => (
              <tr key={user.id} className="group">
                <td className="py-5 font-bold text-slate-800 border-b border-slate-50 group-last:border-0">
                  {user.name}
                </td>
                <td className="py-5 text-slate-500 font-semibold border-b border-slate-50 group-last:border-0">
                  {user.email}
                </td>
                <td className="py-5 text-slate-500 font-semibold border-b border-slate-50 group-last:border-0">
                  {user.phone ?? "—"}
                </td>
                <td className="py-5 border-b border-slate-50 group-last:border-0">
                  <span className={`inline-flex px-3 py-1 rounded-full text-[12px] font-bold ${
                    user.role === "ADMIN"
                      ? "bg-[#f3f0ff] text-[#6d28d9]"
                      : user.role === "WHOLESALE"
                      ? "bg-[#eff6ff] text-[#1e61c7]"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="py-5 font-bold text-slate-700 border-b border-slate-50 group-last:border-0">
                  {user._count.orders}
                </td>
                <td className="py-5 text-slate-500 font-semibold border-b border-slate-50 group-last:border-0">
                  {new Date(user.createdAt).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "2-digit", year: "numeric"
                  })}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-20 text-center font-bold text-slate-400">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
