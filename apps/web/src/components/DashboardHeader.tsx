import { useState } from "react";
import { Bell, User, WifiOff, Sun, Moon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWS } from "@/contexts/WSContext";
import { wsClient } from "@/lib/ws";
import { useTheme } from "@/contexts/ThemeContext";
import VoiceBar from "@/components/VoiceBar";
import NotificationCenter from "@/components/NotificationCenter";

// ── All voice commands, grouped by category (Vyapar + Execora parity) ─────────
const COMMAND_GROUPS = [
  {
    label: "💰 Billing",
    cmds: [
      { hindi: '"नया बिल बनाओ"', english: "New Invoice", action: "New Invoice" },
      { hindi: '"Ramesh को 3 bag"', english: "Invoice Ramesh", action: "Create invoice for Ramesh" },
      { hindi: '"Invoice cancel"', english: "Cancel Invoice", action: "Cancel last invoice" },
    ],
  },
  {
    label: "💸 Payments",
    cmds: [
      { hindi: '"Ramesh ने 500 दिया"', english: "Record Payment", action: "Ramesh paid 500" },
      { hindi: '"आज का collection"', english: "Today's Sales", action: "Today sales report" },
      { hindi: '"बाकी कितना है?"', english: "Pending Dues", action: "Pending payments" },
    ],
  },
  {
    label: "📦 Stock",
    cmds: [
      { hindi: '"चावल कितना बचा?"', english: "Stock Check", action: "Rice stock check" },
      { hindi: '"आटा 100kg add"', english: "Add Stock", action: "Add 100kg atta stock" },
      { hindi: '"Low stock alert"', english: "Low Stock", action: "Show low stock items" },
    ],
  },
  {
    label: "👥 Customers",
    cmds: [
      { hindi: '"Ramesh का balance"', english: "Customer Balance", action: "Ramesh balance" },
      { hindi: '"नया ग्राहक Mohan"', english: "Add Customer", action: "Add customer Mohan 9876543210" },
      { hindi: '"उधार वाले list"', english: "Overdue List", action: "Show overdue customers" },
    ],
  },
  {
    label: "📊 Reports",
    cmds: [
      { hindi: '"आज की report"', english: "Daily Report", action: "Today report" },
      { hindi: '"GSTR-1 download"', english: "GST Report", action: "Download GSTR1" },
      { hindi: '"P&L दिखाओ"', english: "P&L Report", action: "Show profit loss" },
    ],
  },
];

const DashboardHeader = () => {
  const { user } = useAuth();
  const { isConnected, reconnect } = useWS();
  const { theme, toggle } = useTheme();
  const [activeGroup, setActiveGroup] = useState(0);
  const storeName = user?.name ? `${user.name}'s Store` : "Execora Store";
  const openSearch = () => window.dispatchEvent(new CustomEvent("execora:search"));

  return (
    <header className="border-b bg-card px-4 py-3 md:px-6">
      {/* ── Top row ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            <span className="text-primary">EXECORA</span>
            <span className="ml-1.5 hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary md:inline">
              AI AGENT
            </span>
          </h1>
          <span className="hidden text-sm text-muted-foreground md:inline">· {storeName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              isConnected ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-success animate-pulse" : "bg-destructive"}`} />
            {isConnected ? "Live" : "Offline"}
          </span>
          {!isConnected && (
            <Button variant="ghost" size="icon" onClick={reconnect} title="Reconnect">
              <WifiOff className="h-4 w-4 text-destructive" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={openSearch} title="Search (Ctrl+K)">
            <Search className="h-4 w-4" />
          </Button>
          <NotificationCenter />
          <Button variant="ghost" size="icon" onClick={toggle} title="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : <User className="h-4 w-4" />}
            </span>
          </Button>
        </div>
      </div>

      {/* ── VoiceBar ─────────────────────────────────────────── */}
      <VoiceBar />

      {/* ── Voice command panel ───────────────────────────────── */}
      <div className="mt-3">
        {/* Category tabs */}
        <div className="mb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
          {COMMAND_GROUPS.map((g, i) => (
            <button
              key={g.label}
              onClick={() => setActiveGroup(i)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                i === activeGroup
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Command chips */}
        <div className="flex flex-wrap gap-2">
          {COMMAND_GROUPS[activeGroup].cmds.map((cmd) => (
            <button
              key={cmd.english}
              onClick={() => {
                if (wsClient.isConnected) wsClient.send("voice:final", { text: cmd.action });
              }}
              className="flex flex-col items-start rounded-xl border border-border bg-card px-3.5 py-2 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-accent active:scale-95"
            >
              <span className="text-sm font-medium text-foreground">{cmd.hindi}</span>
              <span className="text-[11px] text-muted-foreground">{cmd.english}</span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
