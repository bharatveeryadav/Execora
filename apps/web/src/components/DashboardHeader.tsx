import { Bell, User, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWS } from "@/contexts/WSContext";
import { wsClient } from "@/lib/ws";
import VoiceBar from "@/components/VoiceBar";

const voiceCommands = [
  { hindi: '"नया बिल"', english: "New Invoice" },
  { hindi: '"पेमेंट"', english: "Record Pay" },
  { hindi: '"स्टॉक"', english: "Check Stock" },
  { hindi: '"रिपोर्ट"', english: "Daily Report" },
  { hindi: '"ग्राहक"', english: "Find Cust" },
];

const DashboardHeader = () => {
  const { user } = useAuth();
  const { isConnected, pendingCount, reconnect } = useWS();

  const storeName = user?.name ? `${user.name}'s Store` : "Execora Store";

  return (
    <header className="border-b bg-card px-4 py-3 md:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">
            <span className="text-primary">EXECORA</span>
          </h1>
          <span className="hidden text-sm text-muted-foreground md:inline">
            · {storeName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* WS connection indicator */}
          <span
            className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              isConnected ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-success" : "bg-destructive"}`} />
            {isConnected ? "Live" : "Offline"}
          </span>

          {!isConnected && (
            <Button variant="ghost" size="icon" onClick={reconnect} title="Reconnect">
              <WifiOff className="h-4 w-4 text-destructive" />
            </Button>
          )}

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {pendingCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {user?.name ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : <User className="h-4 w-4" />}
            </span>
          </Button>
        </div>
      </div>

      <VoiceBar />

      {/* Quick Voice Commands */}
      <div className="mt-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          🎤 Quick Voice Commands
        </h3>
        <div className="flex flex-wrap gap-2">
          {voiceCommands.map((cmd) => (
            <button
              key={cmd.english}
              onClick={() => { if (wsClient.isConnected) wsClient.send("voice:final", { text: cmd.english }); }}
              className="flex flex-col items-center rounded-lg border border-border bg-card px-4 py-2.5 text-center shadow-sm transition-colors hover:bg-accent"
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
