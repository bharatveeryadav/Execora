import { useAuth } from "@/contexts/AuthContext";

const DashboardGreeting = () => {
  const { user } = useAuth();
  const now = new Date();
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
    hour12: true,
  });

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">👋 {greeting}, {firstName} Ji!</h2>
      <div className="text-right text-sm text-muted-foreground">
        <p>📅 {dateStr}</p>
        <p>⏰ {timeStr}</p>
      </div>
    </div>
  );
};

export default DashboardGreeting;
