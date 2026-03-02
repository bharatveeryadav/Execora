import { useNavigate, useLocation } from "react-router-dom";
import { Home, Wallet, Package, Users, BarChart3, Settings } from "lucide-react";

const navItems = [
  { label: "Home", icon: Home, path: "/", emoji: "🏠" },
  { label: "Pay", icon: Wallet, path: "/payment", emoji: "💰" },
  { label: "Stock", icon: Package, path: "/inventory", emoji: "📦" },
  { label: "Cust", icon: Users, path: "/customers", emoji: "👥" },
  { label: "Report", icon: BarChart3, path: "/reports", emoji: "📊" },
  { label: "Settings", icon: Settings, path: "/settings", emoji: "⚙️" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card md:hidden">
      <div className="grid grid-cols-6">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
