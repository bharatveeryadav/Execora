import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, Users, FileText, MoreHorizontal,
  BarChart3, Package, Wallet, BookOpen, Settings, ShoppingCart, X, Mic,
} from "lucide-react";
import { useState, useEffect } from "react";
import InvoiceCreation from "@/components/InvoiceCreation";
import GlobalSearch from "@/components/GlobalSearch";

// ── More drawer items ─────────────────────────────────────────────────────────
const MORE_ITEMS = [
  { emoji: "🧾", label: "New Bill",  path: "__invoice__", icon: FileText },
  { emoji: "📊", label: "Reports",   path: "/reports",   icon: BarChart3 },
  { emoji: "📦", label: "Inventory", path: "/inventory", icon: Package },
  { emoji: "📒", label: "Day Book",  path: "/daybook",   icon: BookOpen },
  { emoji: "💵", label: "Cash Book", path: "/cashbook",  icon: BookOpen },
  { emoji: "💸", label: "Expenses",  path: "/expenses",  icon: ShoppingCart },
  { emoji: "💳", label: "Payments",  path: "/payment",   icon: Wallet },
  { emoji: "⚙️", label: "Settings",  path: "/settings",  icon: Settings },
];

// ── Main 5 nav items ──────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Home",      icon: Home,          path: "/" },
  { label: "Customers", icon: Users,         path: "/customers" },
  { label: "__FAB__",   icon: Mic,           path: "" },
  { label: "Invoices",  icon: FileText,      path: "/invoices" },
  { label: "More",      icon: MoreHorizontal,path: "__more__" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = () => setInvoiceOpen(true);
    window.addEventListener("shortcut:new-invoice", handler);
    return () => window.removeEventListener("shortcut:new-invoice", handler);
  }, []);

  // Close More drawer when navigating
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  return (
    <>
      {/* ── Bottom navigation bar ────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden">
        <div className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            // Centre FAB — new invoice
            if (item.label === "__FAB__") {
              return (
                <button
                  key="fab"
                  onClick={() => window.dispatchEvent(new CustomEvent("shortcut:voice"))}
                  className="flex flex-col items-center justify-center py-1"
                >
                  <div className="flex h-14 w-14 -mt-6 items-center justify-center rounded-full bg-primary shadow-xl ring-4 ring-background">
                    <Mic className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <span className="mt-0.5 text-[10px] text-primary font-bold">बोलो</span>
                </button>
              );
            }

            // More → opens drawer
            if (item.path === "__more__") {
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                    moreOpen ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span>More</span>
                </button>
              );
            }

            const isActive = location.pathname === item.path ||
              (item.path === "/customers" && location.pathname.startsWith("/customers"));
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                  isActive ? "text-primary font-semibold" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── More drawer (slide up) ────────────────────────────────── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-[56px] left-0 right-0 z-50 rounded-t-2xl border-t bg-card p-4 shadow-2xl md:hidden animate-in slide-in-from-bottom-4 duration-200">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">More Features</p>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MORE_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    setMoreOpen(false);
                    if (item.path === "__invoice__") { setInvoiceOpen(true); }
                    else { navigate(item.path); }
                  }}
                  className={`flex flex-col items-center gap-2 rounded-xl border bg-muted/30 py-4 text-center transition-colors hover:bg-muted active:scale-95 ${
                    location.pathname === item.path ? "border-primary/40 bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
                </button>
              ))}
            </div>
            {/* Voice hint in drawer */}
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              🎤 Or just say it — <span className="font-medium text-foreground">"report dikhao"</span> · <span className="font-medium text-foreground">"expenses check karo"</span>
            </p>
          </div>
        </>
      )}

      <InvoiceCreation open={invoiceOpen} onOpenChange={setInvoiceOpen} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
};

export default BottomNav;
