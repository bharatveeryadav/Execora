import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Reports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/billing"
        element={
          <ProtectedRoute>
            <BillingSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment"
        element={
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        }
      />
      <Route
        path="/overdue"
        element={
          <ProtectedRoute>
            <OverduePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/parties"
        element={
          <ProtectedRoute>
            <Parties />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers"
        element={
          <ProtectedRoute>
            <Navigate to="/parties" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customers/:id"
        element={
          <ProtectedRoute>
            <CustomerDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <Invoices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id"
        element={
          <ProtectedRoute>
            <InvoiceDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchases"
        element={
          <ProtectedRoute>
            <Purchases />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cashbook"
        element={
          <ProtectedRoute>
            <CashBook />
          </ProtectedRoute>
        }
      />
      <Route
        path="/daybook"
        element={
          <ProtectedRoute>
            <DayBook />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <ClassicBilling />
          </ProtectedRoute>
        }
      />{" "}
      <Route
        path="/expiry"
        element={
          <ProtectedRoute>
            <ExpiryPage />
          </ProtectedRoute>
        }
      />{" "}
      <Route
        path="/recurring"
        element={
          <ProtectedRoute>
            <RecurringBilling />
          </ProtectedRoute>
        }
      />
      <Route
        path="/balance-sheet"
        element={
          <ProtectedRoute>
            <BalanceSheet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bank-reconciliation"
        element={
          <ProtectedRoute>
            <BankReconciliation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import"
        element={
          <ProtectedRoute>
            <ImportData />
          </ProtectedRoute>
        }
      />
      <Route
        path="/einvoicing"
        element={
          <ProtectedRoute>
            <EInvoicing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/gstr3b"
        element={
          <ProtectedRoute>
            <Gstr3b />
          </ProtectedRoute>
        }
      />
      {/* Public customer-facing portal — no auth required */}
      <Route path="/pub/:id/:token" element={<InvoicePortal />} />
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
              <AppRoutes />
              <ConfettiOverlay />
              <PaymentSoundBox />
            </BrowserRouter>
          </TooltipProvider>
        </WSProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
