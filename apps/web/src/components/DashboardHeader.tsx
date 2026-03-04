import { Bell, User, WifiOff, Sun, Moon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWS } from "@/contexts/WSContext";
import { useTheme } from "@/contexts/ThemeContext";
import VoiceBar from "@/components/VoiceBar";
import NotificationCenter from "@/components/NotificationCenter";

// Voice command examples shown in VoiceBar hint — kept minimal

const DashboardHeader = () => {
  const { user } = useAuth();
  const { isConnected, reconnect } = useWS();
  const { theme, toggle } = useTheme();
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
    </header>
  );
};

export default DashboardHeader;
