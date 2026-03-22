import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
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
import IndirectIncome from "./pages/IndirectIncome";
import PurchaseOrders from "./pages/PurchaseOrders";
import Feedback from "./pages/Feedback";
import CreditNotes from "./pages/CreditNotes";
import Monitoring from "./pages/Monitoring";
import SettingsSection from "./pages/SettingsSection";
import SettingsProfileUser from "./pages/settings/SettingsProfileUser";
import SettingsProfileUsers from "./pages/settings/SettingsProfileUsers";
import SettingsBanksBanks from "./pages/settings/SettingsBanksBanks";
import SettingsBanksWallet from "./pages/settings/SettingsBanksWallet";
import SettingsGeneralTerms from "./pages/settings/SettingsGeneralTerms";
import SettingsGeneralNotes from "./pages/settings/SettingsGeneralNotes";
import SettingsGeneralAutoReminders from "./pages/settings/SettingsGeneralAutoReminders";
import SettingsGeneralPreferences from "./pages/settings/SettingsGeneralPreferences";
import SettingsPaymentGateway from "./pages/settings/SettingsPaymentGateway";
import SettingsGeneralThermalPrint from "./pages/settings/SettingsGeneralThermalPrint";
import SettingsGeneralBarcode from "./pages/settings/SettingsGeneralBarcode";
import SettingsGeneralSignatures from "./pages/settings/SettingsGeneralSignatures";
import SettingsGeneralOther from "./pages/settings/SettingsGeneralOther";
import SettingsBanksOther from "./pages/settings/SettingsBanksOther";
import SettingsMore from "./pages/settings/SettingsMore";
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
const LAST_WEB_PATH_KEY = "execora_last_web_path";
const RELOAD_PATH_KEY = "execora_reload_path";

function RoutePersistence() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (location.pathname === "/login") return;
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    localStorage.setItem(LAST_WEB_PATH_KEY, fullPath);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;

    const markReloadPath = () => {
      if (location.pathname === "/login") return;
      sessionStorage.setItem(RELOAD_PATH_KEY, fullPath);
    };

    window.addEventListener("beforeunload", markReloadPath);
    return () => window.removeEventListener("beforeunload", markReloadPath);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (location.pathname !== "/") return;

    const reloadPath = sessionStorage.getItem(RELOAD_PATH_KEY);
    sessionStorage.removeItem(RELOAD_PATH_KEY);

    const fallbackPath = localStorage.getItem(LAST_WEB_PATH_KEY);
    const restorePath = reloadPath || fallbackPath;

    if (!restorePath || restorePath === "/" || restorePath === "/login") return;

    navigate(restorePath, { replace: true });
  }, [isAuthenticated, isLoading, location.pathname, navigate]);

  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: `${location.pathname}${location.search}${location.hash}`,
        }}
      />
    );
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
          <Route
            index
            element={<Navigate to="/settings/profile/company" replace />}
          />
          <Route path="profile/company" element={<Settings />} />
          <Route path="profile/user" element={<SettingsProfileUser />} />
          <Route path="profile/users" element={<SettingsProfileUsers />} />
          <Route
            path="general/preferences"
            element={<SettingsGeneralPreferences />}
          />
          <Route
            path="general/thermal-print"
            element={<SettingsGeneralThermalPrint />}
          />
          <Route path="general/barcode" element={<SettingsGeneralBarcode />} />
          <Route
            path="general/signatures"
            element={<SettingsGeneralSignatures />}
          />
          <Route path="general/notes" element={<SettingsGeneralNotes />} />
          <Route path="general/terms" element={<SettingsGeneralTerms />} />
          <Route
            path="general/auto-reminders"
            element={<SettingsGeneralAutoReminders />}
          />
          <Route path="general/other" element={<SettingsGeneralOther />} />
          <Route path="banks/banks" element={<SettingsBanksBanks />} />
          <Route path="banks/wallet" element={<SettingsBanksWallet />} />
          <Route path="banks/other" element={<SettingsBanksOther />} />
          <Route
            path="payment-gateway/api"
            element={<SettingsPaymentGateway />}
          />
          <Route path="more" element={<SettingsMore />} />
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
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="debit-orders" element={<ComingSoon />} />
        <Route path="delivery-challans" element={<ComingSoon />} />
        <Route path="packaging-lists" element={<ComingSoon />} />
        <Route path="indirect-income" element={<IndirectIncome />} />
        <Route path="journals" element={<ComingSoon />} />
        <Route path="online-store" element={<ComingSoon />} />
        <Route path="addons" element={<ComingSoon />} />
        <Route path="mydrive" element={<ComingSoon />} />
        <Route path="tutorial" element={<ComingSoon />} />
        <Route path="feedback" element={<Feedback />} />
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
              <RoutePersistence />
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
