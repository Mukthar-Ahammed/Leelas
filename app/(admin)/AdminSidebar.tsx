"use client";

import {
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Users,
  RotateCcw,
  ClipboardList,
} from "lucide-react";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/admin/dashboard",  label: "Dashboard",  Icon: LayoutDashboard },
  { href: "/admin/products",   label: "Products",   Icon: Package },
  { href: "/admin/categories", label: "Categories", Icon: FolderOpen },
  { href: "/admin/orders",     label: "Orders",     Icon: ShoppingCart },
  { href: "/admin/users",      label: "Users",      Icon: Users },
  { href: "/admin/returns",    label: "Returns",    Icon: RotateCcw },
  { href: "/admin/audit-log",  label: "Audit Log",  Icon: ClipboardList },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
      {NAV_LINKS.map(({ href, label, Icon }) => {
        const isActive = pathname === href || pathname.startsWith(href + "/");
        return (
          <a
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-bold transition-colors group ${
              isActive
                ? "bg-[#f3f0ff] text-[#6d28d9]"
                : "text-slate-500 hover:bg-[#f3f0ff] hover:text-[#6d28d9]"
            }`}
          >
            <Icon
              className={`w-[18px] h-[18px] flex-shrink-0 transition-opacity ${
                isActive ? "opacity-100 text-[#6d28d9]" : "opacity-60 group-hover:opacity-100"
              }`}
            />
            {label}
            {isActive && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#6d28d9]" />
            )}
          </a>
        );
      })}
    </nav>
  );
}
