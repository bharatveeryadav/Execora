import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSAAuth } from "@/contexts/SAAuthContext";
import {
  BarChart3, Building2, Users, Settings2, Megaphone,
  Wrench, ClipboardList, Activity, LogOut, Crown, CreditCard,
  Mail, Shield,
} from "lucide-react";

const NAV = [
  { to: "/overview",       label: "Overview",        icon: BarChart3,     section: "platform" },
  { to: "/tenants",        label: "Tenants",          icon: Building2,     section: "platform" },
  { to: "/users",          label: "Users",            icon: Users,         section: "platform" },
  { to: "/activity",       label: "Activity Log",     icon: ClipboardList, section: "platform" },
  { to: "/billing",        label: "Billing",          icon: CreditCard,    section: "ops" },
  { to: "/announcements",  label: "Announcements",    icon: Megaphone,     section: "ops" },
  { to: "/maintenance",    label: "Maintenance",      icon: Wrench,        section: "ops" },
  { to: "/queues",         label: "Queue Stats",      icon: Activity,      section: "ops" },
  { to: "/config",         label: "Platform Config",  icon: Settings2,     section: "ops" },
];

const SUPER_ADMIN_NAV = [
  { to: "/super/overview",       label: "SA Overview",      icon: BarChart3 },
  { to: "/super/announcements",  label: "Announcements",    icon: Megaphone },
  { to: "/super/maintenance",    label: "Maintenance",      icon: Wrench },
  { to: "/super/comms",          label: "Comms",            icon: Mail },
];

export function SALayout() {
  const { logout } = useSAAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const platformNav = NAV.filter((n) => n.section === "platform");
  const opsNav      = NAV.filter((n) => n.section === "ops");

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-gray-900 border-r border-amber-900/40">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-amber-900/40 bg-amber-900/10">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Crown className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Super Admin</p>
            <p className="text-[10px] text-amber-400/70">Execora Platform</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {/* Platform section */}
          <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Platform
          </p>
          {platformNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-amber-600/80 text-white"
                    : "text-gray-400 hover:bg-amber-900/20 hover:text-amber-100"
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {/* Operations section */}
          <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
            Operations
          </p>
          {opsNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-amber-600/80 text-white"
                    : "text-gray-400 hover:bg-amber-900/20 hover:text-amber-100"
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-amber-900/40 space-y-1">
          <a
            href="http://localhost:3008"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
          >
            <Shield className="w-4 h-4" />
            Open Admin Panel
          </a>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

// ── Shared UI components ───────────────────────────────────────────────────

export function SAPage({
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

export function StatCard({ label, value, sub, color = "amber" }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  const colorMap: Record<string, string> = {
    amber:  "border-amber-500/30  bg-amber-500/10  text-amber-300",
    green:  "border-green-500/30  bg-green-500/10  text-green-300",
    red:    "border-red-500/30    bg-red-500/10    text-red-300",
    yellow: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    blue:   "border-blue-500/30   bg-blue-500/10   text-blue-300",
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  };
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color] ?? colorMap.amber}`}>
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export function SATable({ heads, children }: { heads: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-900/50">
            {heads.map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">{children}</tbody>
      </table>
    </div>
  );
}

export function TR({ children }: { children: React.ReactNode }) {
  return <tr className="hover:bg-gray-900/40 transition-colors">{children}</tr>;
}

export function TD({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-gray-300 ${className}`}>{children}</td>;
}

export function Badge({ value }: { value: string }) {
  const map: Record<string, string> = {
    active:    "bg-green-500/15 text-green-400 border-green-500/30",
    inactive:  "bg-gray-500/15  text-gray-400  border-gray-500/30",
    suspended: "bg-red-500/15   text-red-400   border-red-500/30",
    trial:     "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    pro:       "bg-violet-500/15 text-violet-400 border-violet-500/30",
    enterprise:"bg-amber-500/15  text-amber-400  border-amber-500/30",
    owner:     "bg-amber-500/15  text-amber-300  border-amber-500/30",
    admin:     "bg-violet-500/15 text-violet-300 border-violet-500/30",
    manager:   "bg-blue-500/15   text-blue-300   border-blue-500/30",
    staff:     "bg-gray-500/15   text-gray-300   border-gray-500/30",
    viewer:    "bg-gray-500/10   text-gray-500   border-gray-700",
    info:      "bg-blue-500/15   text-blue-400   border-blue-500/30",
    warning:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    critical:  "bg-red-500/15    text-red-400    border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[value] ?? "bg-gray-700 text-gray-300 border-gray-600"}`}>
      {value}
    </span>
  );
}

export function Pagination({ page, totalPages, onPage }: {
  page: number; totalPages: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30"
      >
        ←
      </button>
      <span className="text-xs text-gray-500 px-2">{page} / {totalPages}</span>
      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30"
      >
        →
      </button>
    </div>
  );
}

export function SALoading() {
  return <div className="py-10 text-center text-gray-600 text-sm">Loading…</div>;
}

export function SAError({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-red-900/20 border border-red-800/40 px-4 py-3 text-sm text-red-400">
      {msg}
    </div>
  );
}
