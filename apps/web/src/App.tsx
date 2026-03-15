import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { SettingsLayout } from "@/components/SettingsLayout";
import Index from "./pages/Index";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import BillingSettings from "./pages/BillingSettings";
import Payment from "./pages/Payment";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Parties from "./pages/Parties";
import CustomerDetail from "./pages/CustomerDetail";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Expenses from "./pages/Expenses";
import Purchases from "./pages/Purchases";
import CashBook from "./pages/CashBook";
import DayBook from "./pages/DayBook";
import OverduePage from "./pages/OverduePage";
import ExpiryPage from "./pages/Expiry";
import NotFound from "./pages/NotFound";
import ComingSoon from "./pages/ComingSoon";
import CreditNotes from "./pages/CreditNotes";
import SettingsSection from "./pages/SettingsSection";
import LoginPage from "./pages/LoginPage";
import ClassicBilling from "./pages/ClassicBilling";
import InvoicePortal from "./pages/InvoicePortal";
import RecurringBilling from "./pages/RecurringBilling";
import BalanceSheet from "./pages/BalanceSheet";
import BankReconciliation from "./pages/BankReconciliation";
import ImportData from "./pages/ImportData";
import EInvoicing from "./pages/EInvoicing";
import Gstr3b from "./pages/Gstr3b";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { WSProvider } from "@/contexts/WSContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ConfettiOverlay } from "@/components/ConfettiOverlay";
import { PaymentSoundBox } from "@/components/PaymentSoundBox";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <OnboardingWizard />
      {children}
    </>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Public customer-facing portal — no auth required */}
      <Route path="/pub/:id/:token" element={<InvoicePortal />} />
      {/* Reports: full-page standalone (no app sidebar) — all report tabs */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      {/* Protected routes with AppLayout (desktop: sidebar, mobile: bottom nav) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Index />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="/settings/profile/company" replace />} />
          <Route path="profile/company" element={<Settings />} />
          <Route path="profile/user" element={<SettingsSection />} />
          <Route path="profile/users" element={<SettingsSection />} />
          <Route path="general/preferences" element={<SettingsSection />} />
          <Route path="general/thermal-print" element={<SettingsSection />} />
          <Route path="general/barcode" element={<SettingsSection />} />
          <Route path="general/signatures" element={<SettingsSection />} />
          <Route path="general/notes" element={<SettingsSection />} />
          <Route path="general/terms" element={<SettingsSection />} />
          <Route path="general/auto-reminders" element={<SettingsSection />} />
          <Route path="general/other" element={<SettingsSection />} />
          <Route path="banks/banks" element={<SettingsSection />} />
          <Route path="banks/wallet" element={<SettingsSection />} />
          <Route path="banks/other" element={<SettingsSection />} />
          <Route path="payment-gateway/api" element={<SettingsSection />} />
          <Route path="more" element={<SettingsSection />} />
          <Route path="billing" element={<BillingSettings />} />
        </Route>
        <Route path="payment" element={<Payment />} />
        <Route path="overdue" element={<OverduePage />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="parties" element={<Parties />} />
        <Route path="customers" element={<Navigate to="/parties" replace />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="purchases" element={<Purchases />} />
        <Route path="cashbook" element={<CashBook />} />
        <Route path="daybook" element={<DayBook />} />
        <Route path="billing" element={<ClassicBilling />} />
        <Route path="expiry" element={<ExpiryPage />} />
        <Route path="recurring" element={<RecurringBilling />} />
        <Route path="balance-sheet" element={<BalanceSheet />} />
        <Route path="bank-reconciliation" element={<BankReconciliation />} />
        <Route path="import" element={<ImportData />} />
        <Route path="einvoicing" element={<EInvoicing />} />
        <Route path="gstr3b" element={<Gstr3b />} />
        {/* Placeholder routes for new sidebar items — coming soon */}
        <Route path="credit-notes" element={<CreditNotes />} />
        <Route path="purchase-orders" element={<ComingSoon />} />
        <Route path="debit-orders" element={<ComingSoon />} />
        <Route path="delivery-challans" element={<ComingSoon />} />
        <Route path="packaging-lists" element={<ComingSoon />} />
        <Route path="indirect-income" element={<ComingSoon />} />
        <Route path="journals" element={<ComingSoon />} />
        <Route path="online-store" element={<ComingSoon />} />
        <Route path="addons" element={<ComingSoon />} />
        <Route path="mydrive" element={<ComingSoon />} />
        <Route path="tutorial" element={<ComingSoon />} />
        <Route path="feedback" element={<ComingSoon />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WSProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <ErrorBoundary>
                <AppRoutes />
                <ConfettiOverlay />
                <PaymentSoundBox />
              </ErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </WSProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
