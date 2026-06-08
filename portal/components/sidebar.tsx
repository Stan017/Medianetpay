"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { NotificationBadge } from "@/components/notification-badge";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Link2,
  BarChart3,
  TrendingUp,
  Settings,
  LogOut,
  Bell,
  Store,
} from "lucide-react";

const NAV = [
  { href: "/dashboard",      label: "Dashboard",       icon: LayoutDashboard },
  { href: "/transactions",   label: "Transacciones",   icon: ArrowLeftRight },
  { href: "/links",          label: "Links de Cobro",  icon: Link2 },
  { href: "/vitrina",        label: "Mi Vitrina",      icon: Store },
  { href: "/analytics",      label: "Análisis",        icon: TrendingUp },
  { href: "/reportes",       label: "Reportes",        icon: BarChart3 },
  { href: "/notifications",  label: "Notificaciones",  icon: Bell, dynamicBadge: true },
  { href: "/settings",       label: "Configuración",   icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await api.post("/v1/auth/logout", {});
    router.push("/login");
  }

  return (
    <aside className="w-56 shrink-0 bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="MedianetPay" className="h-6 w-auto brightness-0 invert mb-2" />
        <span className="text-xs px-1.5 py-0.5 rounded font-medium border" style={{background:'#F8993720',color:'#F89937',borderColor:'#F8993740'}}>
          modo prueba
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, dynamicBadge }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                active
                  ? "text-white shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
              )}
              style={active ? { background: "#F89937" } : {}}
            >
              <Icon size={15} className={active ? "text-white" : "text-slate-500"} />
              <span className="flex-1">{label}</span>
              {dynamicBadge && <NotificationBadge />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
