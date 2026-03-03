import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import DashboardHeader from "@/components/DashboardHeader";
import DashboardGreeting from "@/components/DashboardGreeting";
import QuickActions from "@/components/QuickActions";
import BusinessHealthScore from "@/components/BusinessHealthScore";
import KPICards from "@/components/KPICards";
import OverduePayments from "@/components/OverduePayments";
import UpcomingPayments from "@/components/UpcomingPayments";
import DashboardLowStock from "@/components/DashboardLowStock";
import FastMovingProducts from "@/components/FastMovingProducts";
import RecentActivity from "@/components/RecentActivity";
import QuickInsights from "@/components/QuickInsights";
import BottomNav from "@/components/BottomNav";
import DashboardFooter from "@/components/DashboardFooter";

const Index = () => {
  useKeyboardShortcuts();

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <DashboardHeader />
      <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
        <DashboardGreeting />
        <QuickActions />
        <BusinessHealthScore />
        <KPICards />
        <OverduePayments />
        <UpcomingPayments />
        <DashboardLowStock />
        <FastMovingProducts />
        <RecentActivity />
        <QuickInsights />
        <DashboardFooter />
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
