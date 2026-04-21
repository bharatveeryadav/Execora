import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import {
  LayoutDashboard, Users, Building2, ShoppingCart, FileText,
  Package, CreditCard, Activity, Settings2, Bell, MessageSquare,
  LogOut, Shield, ClipboardList, Crown, Megaphone, Wrench, BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";

const ADMIN_NAV = [
  { to: "/dashboard",  label: "Dashboard",    icon: LayoutDashboard },
  { to: "/health",     label: "Health",        icon: Activity },
  { to: "/tenants",    label: "Tenants",       icon: Building2 },
  { to: "/users",      label: "Users",         icon: Users },
  { to: "/customers",  label: "Customers",     icon: ShoppingCart },
  { to: "/invoices",   label: "Invoices",      icon: FileText },
  { to: "/products",   label: "Products",      icon: Package },
  { to: "/payments",   label: "Payments",      icon: CreditCard },
  { to: "/reminders",  label: "Reminders",     icon: Bell },
  { to: "/messages",   label: "Message Logs",  icon: MessageSquare },
  { to: "/queues",     label: "Queue Stats",   icon: Activity },
  { to: "/activity",   label: "Activity Log",  icon: ClipboardList },
  { to: "/config",     label: "Config",        icon: Settings2 },
];

const SUPER_ADMIN_NAV = [
  { to: "/super/overview",       label: "SA Overview",      icon: BarChart3 },
  { to: "/super/announcements",  label: "Announcements",    icon: Megaphone },
  { to: "/super/maintenance",    label: "Maintenance",      icon: Wrench },
];

export function AdminLayout() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const [impersonating, setImpersonating] = useState(false);
  useEffect(() => {
    setImpersonating(!!localStorage.getItem("execora_impersonation_token"));
  }, []);
  function handleLogout() {
    logout();
    localStorage.removeItem("execora_impersonation_token");
    setImpersonating(false);
    navigate("/login");
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Impersonation banner */}
      {impersonating && (
        <div className="fixed top-0 left-0 w-full z-50 bg-orange-600 text-white text-center py-2 text-sm font-semibold shadow">
          Impersonation Mode — You are acting as a tenant owner. <button onClick={handleLogout} className="underline ml-2">Exit</button>
        </div>
      )}
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-gray-900 border-r border-gray-800">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
          <Shield className="w-5 h-5 text-violet-400" />
          <span className="font-bold text-sm text-white">Execora Admin</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {/* Admin section */}
          <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Admin Panel
          </p>
          {ADMIN_NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-violet-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {/* Super Admin section */}
          <div className="pt-3 pb-1">
            <div className="border-t border-gray-800 pt-3">
              <div className="flex items-center gap-1.5 px-3 pb-1.5">
                <Crown className="w-3 h-3 text-amber-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-500/70">
                  Super Admin
                </p>
              </div>
              {SUPER_ADMIN_NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-amber-600/80 text-white"
                        : "text-amber-200/50 hover:bg-amber-900/30 hover:text-amber-200"
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
        <div className="p-2 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

// ── Reusable page wrapper ──────────────────────────────────────────────────
export function AdminPage({
  title, subtitle, children, actions,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = "violet" }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
    green:  "border-green-500/30  bg-green-500/10  text-green-300",
    red:    "border-red-500/30    bg-red-500/10    text-red-300",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    blue:   "border-blue-500/30   bg-blue-500/10   text-blue-300",
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color] ?? colorMap.violet}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────
export function Badge({ value }: { value: string }) {
  const map: Record<string, string> = {
    ok: "bg-green-500/20 text-green-300",
    active: "bg-green-500/20 text-green-300",
    paid: "bg-green-500/20 text-green-300",
    pending: "bg-yellow-500/20 text-yellow-300",
    draft: "bg-gray-500/20 text-gray-300",
    cancelled: "bg-red-500/20 text-red-300",
    failed: "bg-red-500/20 text-red-300",
    error: "bg-red-500/20 text-red-300",
    degraded: "bg-orange-500/20 text-orange-300",
    inactive: "bg-gray-500/20 text-gray-300",
    partial: "bg-blue-500/20 text-blue-300",
    free: "bg-gray-500/20 text-gray-300",
    pro: "bg-violet-500/20 text-violet-300",
    enterprise: "bg-yellow-500/20 text-yellow-300",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${map[value?.toLowerCase()] ?? "bg-gray-600/20 text-gray-300"}`}>
      {value}
    </span>
  );
}

// ── Table ──────────────────────────────────────────────────────────────────
export function AdminTable({ heads, children }: { heads: string[]; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-800/60">
          <tr>
            {heads.map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">{children}</tbody>
      </table>
    </div>
  );
}

export function TR({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <tr className={`hover:bg-gray-800/40 transition-colors ${className}`}>{children}</tr>;
}

export function TD({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 text-gray-300 ${className}`}>{children}</td>;
}

// ── Pagination ─────────────────────────────────────────────────────────────
export function Pagination({
  page, totalPages, onPage,
}: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}
        className="px-3 py-1 rounded bg-gray-800 disabled:opacity-40 hover:bg-gray-700">Prev</button>
      <span>{page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPage(page + 1)}
        className="px-3 py-1 rounded bg-gray-800 disabled:opacity-40 hover:bg-gray-700">Next</button>
    </div>
  );
}

// ── Loading / error states ─────────────────────────────────────────────────
export function AdminLoading() {
  return <div className="p-8 text-gray-500 animate-pulse">Loading…</div>;
}

export function AdminError({ msg }: { msg: string }) {
  return <div className="p-4 rounded bg-red-900/30 text-red-400 text-sm">{msg}</div>;
}
