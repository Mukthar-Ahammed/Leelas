import type { ReactNode } from "react";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen flex bg-[#f3f4f8]">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-white border-r border-slate-100 shadow-[2px_0_12px_rgba(0,0,0,0.03)]">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-slate-100">
          <a href="/" className="flex items-center">
            <Image
              src="/logo/leelas-logo.png"
              alt="Leelas Spices"
              width={180}
              height={72}
              className="object-contain h-16 w-auto"
              priority
            />
          </a>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 pl-0.5">
            Admin Panel
          </p>
        </div>

        {/* Nav — client component to avoid serialising icon refs */}
        <AdminSidebar />

        {/* Footer */}
        <div className="p-4 border-t border-slate-100">
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Store
          </a>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
