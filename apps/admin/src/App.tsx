import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/AdminLayout";

import AdminLoginPage   from "@/pages/AdminLoginPage";
import AdminDashboard   from "@/pages/AdminDashboard";
import AdminHealth      from "@/pages/AdminHealth";
import AdminTenants     from "@/pages/AdminTenants";
import AdminUsers       from "@/pages/AdminUsers";
import AdminCustomers   from "@/pages/AdminCustomers";
import AdminInvoices    from "@/pages/AdminInvoices";
import AdminProducts    from "@/pages/AdminProducts";
import AdminPayments    from "@/pages/AdminPayments";
import AdminReminders   from "@/pages/AdminReminders";
import AdminMessages    from "@/pages/AdminMessages";
import AdminQueues      from "@/pages/AdminQueues";
import AdminConfig      from "@/pages/AdminConfig";
import AdminActivityLog from "@/pages/AdminActivityLog";

import SuperAdminOverview      from "@/pages/superadmin/SuperAdminOverview";
import SuperAdminAnnouncements from "@/pages/superadmin/SuperAdminAnnouncements";
import SuperAdminMaintenance   from "@/pages/superadmin/SuperAdminMaintenance";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isVerifying } = useAdminAuth();
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">
        Checking…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("impersonation_token");
    if (token) {
      localStorage.setItem("execora_impersonation_token", token);
      params.delete("impersonation_token");
      const clean = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
      window.history.replaceState({}, "", clean);
    }
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/" element={<AdminGuard><AdminLayout /></AdminGuard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<AdminDashboard />} />
        <Route path="health"     element={<AdminHealth />} />
        <Route path="tenants"    element={<AdminTenants />} />
        <Route path="users"      element={<AdminUsers />} />
        <Route path="customers"  element={<AdminCustomers />} />
        <Route path="invoices"   element={<AdminInvoices />} />
        <Route path="products"   element={<AdminProducts />} />
        <Route path="payments"   element={<AdminPayments />} />
        <Route path="reminders"  element={<AdminReminders />} />
        <Route path="messages"   element={<AdminMessages />} />
        <Route path="queues"     element={<AdminQueues />} />
        <Route path="config"     element={<AdminConfig />} />
        <Route path="activity"   element={<AdminActivityLog />} />
        {/* Super Admin routes */}
        <Route path="super/overview"      element={<SuperAdminOverview />} />
        <Route path="super/announcements" element={<SuperAdminAnnouncements />} />
        <Route path="super/maintenance"   element={<SuperAdminMaintenance />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <AppRoutes />
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
