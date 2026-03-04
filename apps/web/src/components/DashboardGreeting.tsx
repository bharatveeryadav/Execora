import { useAuth } from "@/contexts/AuthContext";
import { useWS } from "@/contexts/WSContext";

const DashboardGreeting = () => {
  const { user } = useAuth();
  const { isConnected } = useWS();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning ☀️" : hour < 17 ? "Good afternoon 🙏" : "Good evening 🌙";
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const dateStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{greeting}, {firstName} Ji!</h2>
        <span
          title={isConnected ? "Live" : "Connecting…"}
          className={`inline-flex h-2 w-2 rounded-full transition-colors ${
            isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-400 animate-ping"
          }`}
        />
      </div>
      <p className="text-sm text-muted-foreground">📅 {dateStr}</p>
    </div>
  );
};

export default DashboardGreeting;
