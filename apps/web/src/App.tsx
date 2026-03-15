import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
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
      {/* Protected routes with AppLayout (desktop: sidebar, mobile: bottom nav per page) */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Index />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/billing" element={<BillingSettings />} />
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
