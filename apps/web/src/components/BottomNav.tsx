import { useNavigate, useLocation } from "react-router-dom";
import { Home, Wallet, Package, BarChart3, Settings, Plus } from "lucide-react";
import { useState } from "react";
import InvoiceCreation from "@/components/InvoiceCreation";

const navItems = [
  { label: "Home",    icon: Home,      path: "/",          emoji: "🏠" },
  { label: "Pay",     icon: Wallet,    path: "/payment",   emoji: "💰" },
  { label: "__FAB__", icon: Plus,      path: "",           emoji: "" },
  { label: "Report",  icon: BarChart3, path: "/reports",   emoji: "📊" },
  { label: "Settings",icon: Settings,  path: "/settings",  emoji: "⚙️" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            if (item.label === "__FAB__") {
              return (
                <button
                  key="fab"
                  onClick={() => setInvoiceOpen(true)}
                  className="flex flex-col items-center justify-center py-1"
                >
                  <div className="flex h-12 w-12 -mt-5 items-center justify-center rounded-full bg-primary shadow-lg ring-4 ring-background">
                    <Plus className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <span className="mt-0.5 text-[10px] text-primary font-semibold">Invoice</span>
                </button>
              );
            }
            const isActive = location.pathname === item.path;
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
      <InvoiceCreation open={invoiceOpen} onOpenChange={setInvoiceOpen} />
    </>
  );
};

export default BottomNav;
