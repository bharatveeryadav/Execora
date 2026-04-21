import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SAAuthProvider, useSAAuth } from "@/contexts/SAAuthContext";
import { SALayout } from "@/components/SALayout";

import SALoginPage     from "@/pages/SALoginPage";
import SAOverview      from "@/pages/SAOverview";
import SATenants       from "@/pages/SATenants";
import SAUsers         from "@/pages/SAUsers";
import SAAnnouncements from "@/pages/SAAnnouncements";
import SAMaintenance   from "@/pages/SAMaintenance";
import SAActivityLog   from "@/pages/SAActivityLog";
import SAQueues        from "@/pages/SAQueues";
import SAConfig        from "@/pages/SAConfig";
import SABilling       from "@/pages/SABilling";
import SAComms         from "@/pages/SAComms";

function SAGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isVerifying } = useSAAuth();
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500 text-sm">
        Verifying…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<SALoginPage />} />
      <Route path="/" element={<SAGuard><SALayout /></SAGuard>}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="overview"       element={<SAOverview />} />
        <Route path="tenants"        element={<SATenants />} />
        <Route path="users"          element={<SAUsers />} />
        <Route path="activity"       element={<SAActivityLog />} />
        <Route path="billing"        element={<SABilling />} />
        <Route path="announcements"  element={<SAAnnouncements />} />
        <Route path="maintenance"    element={<SAMaintenance />} />
        <Route path="queues"         element={<SAQueues />} />
        <Route path="config"         element={<SAConfig />} />
        <Route path="super/comms"    element={<SAComms />} />
      </Route>
      <Route path="*" element={<Navigate to="/overview" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <SAAuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SAAuthProvider>
  );
}
