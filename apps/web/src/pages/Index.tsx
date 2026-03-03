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

        {/* ── Greeting + quick CTAs ─────────────────────────────── */}
        <DashboardGreeting />

        {/* ── AI Agent Feed — voice commands + real-time execution log ── */}
        <AiAgentFeed />

        {/* ── Today's numbers ───────────────────────────────────── */}
        <KPICards />

        {/* ── Business health overview ──────────────────────────── */}
        <BusinessHealthScore />

        {/* ── Quick UI Actions ──────────────────────────────────── */}
        <QuickActions />

        {/* ── Collections: overdue + upcoming side-by-side ──────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          <OverduePayments />
          <UpcomingPayments />
        </div>

        {/* ── Live activity feed ────────────────────────────────── */}
        <RecentActivity />

        {/* ── Inventory alert strip ─────────────────────────────── */}
        <DashboardLowStock />

      </main>
      <BottomNav />
    </div>
  );
};

export default Index;

