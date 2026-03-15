/**
 * AppLayout — Desktop: sidebar + main content. Mobile: content only (BottomNav per page).
 * Per PRODUCT_STRATEGY_2026.md: "Desktop parity" with sidebar for full-fledged app on desktop.
 */
import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Users,
  FileText,
  Package,
  BarChart3,
  Wallet,
  BookOpen,
  Settings,
  ShoppingCart,
  ClipboardList,
  AlertCircle,
  Clock,
  Truck,
  Receipt,
  Search,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import InvoiceCreation from "@/components/InvoiceCreation";
import GlobalSearch from "@/components/GlobalSearch";

const SIDEBAR_NAV: { label: string; path: string; icon: React.ElementType; action?: "invoice" }[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "New Bill", path: "__invoice__", icon: FileText, action: "invoice" },
  { label: "Parties", path: "/parties", icon: Users },
  { label: "Items", path: "/inventory", icon: Package },
  { label: "Bills", path: "/invoices", icon: FileText },
  { label: "Classic Bill", path: "/billing", icon: ClipboardList },
  { label: "Record Payment", path: "/payment", icon: Wallet },
];

const SIDEBAR_REPORTS: { label: string; path: string; icon: React.ElementType }[] = [
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Overdue", path: "/overdue", icon: AlertCircle },
  { label: "Day Book", path: "/daybook", icon: BookOpen },
  { label: "Cash Book", path: "/cashbook", icon: BookOpen },
  { label: "Expenses", path: "/expenses", icon: ShoppingCart },
  { label: "Purchases", path: "/purchases", icon: Truck },
  { label: "Expiry", path: "/expiry", icon: Clock },
  { label: "Recurring", path: "/recurring", icon: Receipt },
  { label: "Balance Sheet", path: "/balance-sheet", icon: BarChart3 },
  { label: "Bank Recon", path: "/bank-reconciliation", icon: BookOpen },
  { label: "Import Data", path: "/import", icon: FileText },
  { label: "E-Invoice", path: "/einvoicing", icon: FileText },
  { label: "GSTR-3B", path: "/gstr3b", icon: BarChart3 },
];

function AppLayoutSidebar({
  onSearchOpen,
  onNewInvoice,
}: {
  onSearchOpen?: () => void;
  onNewInvoice?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/parties")
      return location.pathname.startsWith("/parties") || location.pathname.startsWith("/customers");
    if (path === "/inventory") return location.pathname.startsWith("/inventory");
    if (path === "/invoices") return location.pathname.startsWith("/invoices");
    if (path === "/billing") return location.pathname === "/billing";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <SidebarTrigger className="-ml-1" />
          <button
            onClick={() => navigate("/")}
            className="flex flex-1 items-center gap-2 font-bold text-sidebar-foreground hover:text-sidebar-foreground/90"
          >
            <span className="text-primary">EXECORA</span>
          </button>
          {onSearchOpen && (
            <button
              onClick={onSearchOpen}
              className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title="Search (Ctrl+K)"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SIDEBAR_NAV.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={item.action !== "invoice" && isActive(item.path)}
                    onClick={() =>
                      item.action === "invoice"
                        ? onNewInvoice?.()
                        : navigate(item.path)
                    }
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Reports & More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SIDEBAR_REPORTS.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname === "/settings"}
              onClick={() => navigate("/settings")}
              tooltip="Settings"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}

export function AppLayout() {
  const isMobile = useIsMobile();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = () => setInvoiceOpen(true);
    window.addEventListener("shortcut:new-invoice", handler);
    return () => window.removeEventListener("shortcut:new-invoice", handler);
  }, []);

  if (isMobile) {
    return <Outlet />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar side="left" collapsible="icon" className="border-r border-sidebar-border">
        <AppLayoutSidebar
          onSearchOpen={() => setSearchOpen(true)}
          onNewInvoice={() => setInvoiceOpen(true)}
        />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-1 flex-col min-h-svh">
          <Outlet />
        </div>
      </SidebarInset>
      <InvoiceCreation open={invoiceOpen} onOpenChange={setInvoiceOpen} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}
