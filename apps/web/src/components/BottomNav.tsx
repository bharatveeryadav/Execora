import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Users,
  FileText,
  MoreHorizontal,
  BarChart3,
  Package,
  Wallet,
  BookOpen,
  Settings,
  ShoppingCart,
  X,
  Mic,
  ClipboardList,
} from "lucide-react";
import { useState, useEffect } from "react";
import InvoiceCreation from "@/components/InvoiceCreation";
import GlobalSearch from "@/components/GlobalSearch";

// More drawer items
const MORE_ITEMS = [
  { emoji: "🧾", label: "New Bill", path: "__invoice__", icon: FileText },
  { emoji: "📋", label: "Classic Bill", path: "/billing", icon: ClipboardList },
  { emoji: "🎤", label: "Voice", path: "__voice__", icon: Mic },
  { emoji: "📊", label: "Reports", path: "/reports", icon: BarChart3 },
  { emoji: "📦", label: "Items", path: "/inventory", icon: Package },
  { emoji: "⏰", label: "Expiry", path: "/expiry", icon: Package },
  { emoji: "📒", label: "Day Book", path: "/daybook", icon: BookOpen },
  { emoji: "💵", label: "Cash Book", path: "/cashbook", icon: BookOpen },
  { emoji: "💸", label: "Expenses", path: "/expenses", icon: ShoppingCart },
  { emoji: "💳", label: "Payments", path: "/payment", icon: Wallet },
  { emoji: "⚙️", label: "Settings", path: "/settings", icon: Settings },
  { emoji: "🔄", label: "Recurring", path: "/recurring", icon: BarChart3 },
  { emoji: "⚖️", label: "Balance Sheet", path: "/balance-sheet", icon: BarChart3 },
  { emoji: "🏦", label: "Bank Recon", path: "/bank-reconciliation", icon: BarChart3 },
  { emoji: "📥", label: "Import Data", path: "/import", icon: BarChart3 },
  { emoji: "🧾", label: "E-Invoice", path: "/einvoicing", icon: FileText },
  { emoji: "🧮", label: "GSTR-3B", path: "/gstr3b", icon: BarChart3 },
];

// Main 5 nav items
const NAV_ITEMS = [
  { label: "Home", icon: Home, path: "/" },
  { label: "Parties", icon: Users, path: "/parties" },
  { label: "Items", icon: Package, path: "/inventory" },
  { label: "Bills", icon: FileText, path: "/invoices" },
  { label: "More", icon: MoreHorizontal, path: "__more__" },
];

function getAiEnabled(): boolean {
  try {
    const v = JSON.parse(localStorage.getItem("execora:bizprofile") ?? "{}").aiEnabled;
    return v === false || v === "false" ? false : true;
  } catch {
    return true;
  }
}

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const aiEnabled = getAiEnabled();

  useEffect(() => {
    const handler = () => setInvoiceOpen(true);
    window.addEventListener("shortcut:new-invoice", handler);
    return () => window.removeEventListener("shortcut:new-invoice", handler);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  const visibleMoreItems = MORE_ITEMS.filter(
    (item) => aiEnabled || item.path !== "__voice__"
  );

  return (
    <>
      {/* Bottom nav — label BELOW icon per iOS HIG / Material Design / React Navigation below-icon */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm pb-safe pt-2 overflow-visible">
        <div className="grid grid-cols-5 min-h-[64px]">
          {NAV_ITEMS.map((item) => {
            if (item.path === "__more__") {
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 text-[11px] transition-colors touch-manipulation overflow-visible ${
                    moreOpen ? "text-slate-800 font-semibold" : "text-slate-600"
                  }`}
                  style={{ flexDirection: "column" }}
                >
                  <MoreHorizontal className="h-6 w-6 shrink-0 order-first" />
                  <span className="order-last text-center leading-snug whitespace-nowrap overflow-visible">More</span>
                </button>
              );
            }

            const isActive =
              location.pathname === item.path ||
              (item.path === "/parties" &&
                (location.pathname.startsWith("/parties") ||
                  location.pathname.startsWith("/customers"))) ||
              (item.path === "/inventory" &&
                location.pathname.startsWith("/inventory")) ||
              (item.path === "/invoices" &&
                location.pathname.startsWith("/invoices"));
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-1 min-h-[56px] py-2 text-[11px] transition-colors touch-manipulation overflow-visible ${
                  isActive ? "text-slate-800 font-semibold" : "text-slate-600"
                }`}
                style={{ flexDirection: "column" }}
              >
                <item.icon className="h-6 w-6 shrink-0 order-first" />
                <span className="order-last text-center leading-snug whitespace-nowrap overflow-visible">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* More drawer */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-[60px] left-0 right-0 z-50 rounded-t-2xl border-t bg-card p-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 pb-safe max-h-[70vh] overflow-y-auto">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">More Features</p>
              <button
                onClick={() => setMoreOpen(false)}
                className="rounded-lg p-1 hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {visibleMoreItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => {
                    setMoreOpen(false);
                    if (item.path === "__invoice__") {
                      setInvoiceOpen(true);
                    } else if (item.path === "__voice__") {
                      window.dispatchEvent(new CustomEvent("shortcut:voice"));
                    } else {
                      navigate(item.path);
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border bg-muted/30 min-h-[72px] py-4 text-center transition-colors hover:bg-muted active:scale-95 touch-manipulation ${
                    location.pathname === item.path
                      ? "border-primary/40 bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
            {aiEnabled && (
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Or just say it &mdash;{" "}
                <span className="font-medium text-foreground">
                  &quot;report dikhao&quot;
                </span>{" "}
                &middot;{" "}
                <span className="font-medium text-foreground">
                  &quot;expenses check karo&quot;
                </span>
              </p>
            )}
          </div>
        </>
      )}

      <InvoiceCreation open={invoiceOpen} onOpenChange={setInvoiceOpen} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
};

export default BottomNav;
