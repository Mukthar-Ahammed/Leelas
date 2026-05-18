import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-6 border-b">
          <a href="/" className="text-xl font-bold text-orange-700">Leelas</a>
          <p className="text-xs text-muted-foreground mt-1">Admin Panel</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { href: "/admin/dashboard", label: "Dashboard" },
            { href: "/admin/products", label: "Products" },
            { href: "/admin/categories", label: "Categories" },
            { href: "/admin/orders", label: "Orders" },
            { href: "/admin/users", label: "Users" },
            { href: "/admin/returns", label: "Returns" },
            { href: "/admin/audit-log", label: "Audit Log" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="block px-4 py-2 rounded-lg text-sm hover:bg-orange-50 hover:text-orange-700 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
