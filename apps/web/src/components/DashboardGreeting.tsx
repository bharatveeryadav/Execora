import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWS } from "@/contexts/WSContext";

const DashboardGreeting = () => {
  const { user } = useAuth();
  const { isConnected } = useWS();
  const [now, setNow] = useState(() => new Date());

  // Tick every second for live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const dateStr = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">👋 {greeting}, {firstName} Ji!</h2>
        <span
          title={isConnected ? "Live — real-time updates active" : "Connecting…"}
          className={`inline-flex h-2 w-2 rounded-full transition-colors ${
            isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-400 animate-ping"
          }`}
        />
      </div>
      <div className="text-right text-sm text-muted-foreground">
        <p className="hidden xs:block">📅 {dateStr}</p>
        <p className="font-mono tabular-nums">⏰ {timeStr}</p>
      </div>
    </div>
  );
};

export default DashboardGreeting;
