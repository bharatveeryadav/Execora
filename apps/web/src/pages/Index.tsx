import { useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardGreeting from "@/components/DashboardGreeting";
import QuickActions from "@/components/QuickActions";
import KPICards from "@/components/KPICards";
import BusinessHealthScore from "@/components/BusinessHealthScore";
import AiAgentFeed from "@/components/AiAgentFeed";
import OverduePayments from "@/components/OverduePayments";
import UpcomingPayments from "@/components/UpcomingPayments";
import DashboardLowStock from "@/components/DashboardLowStock";
import RecentActivity from "@/components/RecentActivity";
import BottomNav from "@/components/BottomNav";
import { wsClient } from "@/lib/ws";
import { toast } from "@/hooks/use-toast";
import { fireConfetti } from "@/components/ConfettiOverlay";

const Index = () => {
  useKeyboardShortcuts();

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

        {/* ── Greeting ─────────────────────────────────────────── */}
        <DashboardGreeting />

        {/* ── AI Voice feed — rotating hints + live activity ───── */}
        <AiAgentFeed />

        {/* ── Today's numbers (2×2 on mobile) ──────────────────── */}
        <KPICards />

        {/* ── Quick actions ─────────────────────────────────────── */}
        <QuickActions />

        {/* ── Collections: overdue + upcoming ──────────────────── */}
        <div className="grid gap-4 md:grid-cols-2">
          <OverduePayments />
          <UpcomingPayments />
        </div>

        {/* ── Inventory alert strip ─────────────────────────────── */}
        <DashboardLowStock />

        {/* ── Live activity feed ────────────────────────────────── */}
        <RecentActivity />

        {/* ── Business health (analytics, below the fold) ───────── */}
        <BusinessHealthScore />

      </main>
      <BottomNav />
    </div>
  );
};

export default Index;

