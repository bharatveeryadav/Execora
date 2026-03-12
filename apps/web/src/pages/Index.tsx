import { useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardGreeting from "@/components/DashboardGreeting";
import QuickActions from "@/components/QuickActions";
import KPICards from "@/components/KPICards";
import BusinessHealthScore from "@/components/BusinessHealthScore";
import AiAgentFeed from "@/components/AiAgentFeed";
import DashboardLowStock from "@/components/DashboardLowStock";
import DashboardExpiryAlert from "@/components/DashboardExpiryAlert";
import RecentActivity from "@/components/RecentActivity";
import BottomNav from "@/components/BottomNav";
import { wsClient } from "@/lib/ws";
import { toast } from "@/hooks/use-toast";
import { fireConfetti } from "@/components/ConfettiOverlay";
import { useWsInvalidation } from "@/hooks/useWsInvalidation";

const Index = () => {
  useKeyboardShortcuts();
  useWsInvalidation("all");

  // Real-time WS push notifications
  useEffect(() => {
    const offs = [
      wsClient.on("invoice:confirmed", (payload) => {
        const p = payload as { invoiceNo?: string; customerName?: string };
        toast({
          title: "🧾 Invoice Confirmed",
          description: p.invoiceNo
            ? `${p.invoiceNo}${p.customerName ? ` · ${p.customerName}` : ""}`
            : "New invoice confirmed",
        });
      }),
      wsClient.on("payment:recorded", (payload) => {
        const p = payload as { amount?: number; customerName?: string };
        fireConfetti();
        toast({
          title: "💰 Payment Received!",
          description:
            p.amount && p.customerName
              ? `₹${parseFloat(String(p.amount)).toLocaleString("en-IN")} from ${p.customerName}`
              : "Payment recorded successfully",
        });
      }),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <DashboardHeader />
      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        {/* 1 ── Greeting ───────────────────────────────────────── */}
        <DashboardGreeting />

        {/* 2 ── Business health snapshot ───────────────────────── */}
        <BusinessHealthScore />

        {/* 3 ── AI voice feed / command log ────────────────────── */}
        <AiAgentFeed />

        {/* 4 ── Quick actions ──────────────────────────────────── */}
        <QuickActions />

        {/* 5 ── Today's numbers ────────────────────────────────── */}
        <KPICards />

        {/* 8 ── Recent activity ────────────────────────────────── */}
        <RecentActivity />

        {/* 9 ── Low stock alerts ───────────────────────────────── */}
        <DashboardLowStock />

        {/* 10 ── Expiry alerts ─────────────────────────────────── */}
        <DashboardExpiryAlert />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
