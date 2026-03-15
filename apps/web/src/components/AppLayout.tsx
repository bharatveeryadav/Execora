/**
 * AppLayout — Desktop: sidebar + main content. Mobile: content only (BottomNav per page).
 * Per PRODUCT_STRATEGY_2026.md: "Desktop parity" with sidebar for full-fledged app on desktop.
 */
import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate, NavLink } from "react-router-dom";
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
  ChevronDown,
  ChevronRight,
  Store,
  CreditCard,
  PieChart,
  FileCheck,
  MessageCircle,
  Plus,
  FolderOpen,
  HelpCircle,
  MapPin,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import InvoiceCreation from "@/components/InvoiceCreation";
import GlobalSearch from "@/components/GlobalSearch";
import { OfflineBanner } from "@/components/OfflineBanner";
import BottomNav from "@/components/BottomNav";

type NavItem = { label: string; path?: string; icon: React.ElementType; action?: "invoice" };
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] };

const SIDEBAR_NAV_GROUPS: (NavItem | NavGroup)[] = [
  { label: "Home", path: "/", icon: Home },
  {
    label: "Sales",
    icon: FileText,
    items: [
      { label: "Invoices", path: "/invoices", icon: FileText },
      { label: "Credit Notes", path: "/credit-notes", icon: FileCheck },
      { label: "E-Invoices", path: "/einvoicing", icon: FileText },
    ],
  },
  {
    label: "Purchases",
    icon: Truck,
    items: [
      { label: "Purchases", path: "/purchases", icon: Truck },
      { label: "Purchase Order", path: "/purchase-orders", icon: ClipboardList },
      { label: "Debit Order", path: "/debit-orders", icon: FileCheck },
    ],
  },
  {
    label: "Quotation",
    icon: ClipboardList,
    items: [
      { label: "Quotation", path: "/invoices", icon: ClipboardList },
      { label: "Sales Order", path: "/billing", icon: ClipboardList },
      { label: "Pro Forma Invoices", path: "/invoices", icon: FileText },
      { label: "Delivery Challans", path: "/delivery-challans", icon: Truck },
      { label: "Packaging Lists", path: "/packaging-lists", icon: Package },
    ],
  },
  {
    label: "Expenses",
    icon: ShoppingCart,
    items: [
      { label: "Expense", path: "/expenses", icon: ShoppingCart },
      { label: "Indirect Income", path: "/indirect-income", icon: Receipt },
    ],
  },
  { label: "Product & Service", path: "/inventory", icon: Package },
  {
    label: "Payments",
    icon: Wallet,
    items: [
      { label: "Payment Links", path: "/payment", icon: CreditCard },
      { label: "Journals", path: "/journals", icon: BookOpen },
      { label: "Bank Reconciliation", path: "/bank-reconciliation", icon: BookOpen },
    ],
  },
  {
    label: "Parties",
    icon: Users,
    items: [
      { label: "Customers", path: "/parties", icon: Users },
      { label: "Vendors", path: "/parties", icon: Users },
    ],
  },
  { label: "Insights", path: "/", icon: PieChart },
  { label: "Reports", path: "/reports", icon: BarChart3 },
  { label: "Online Store", path: "/online-store", icon: Store },
  { label: "E-Way Bill", path: "/einvoicing", icon: MapPin },
  {
    label: "More",
    icon: Plus,
    items: [
      { label: "Add-ons", path: "/addons", icon: Plus },
      { label: "MyDrive", path: "/mydrive", icon: FolderOpen },
      { label: "Tutorial", path: "/tutorial", icon: HelpCircle },
      { label: "Feedback", path: "/feedback", icon: MessageCircle },
    ],
  },
];

function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item && Array.isArray((item as NavGroup).items);
}

function AppLayoutSidebar({
  onSearchOpen,
  onNewInvoice,
}: {
  onSearchOpen?: () => void;
  onNewInvoice?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path?: string) => {
    if (!path) return false;
    if (path === "/") return location.pathname === "/";
    if (path === "/parties")
      return location.pathname.startsWith("/parties") || location.pathname.startsWith("/customers");
    return location.pathname.startsWith(path);
  };

  const handleNav = (item: NavItem) => {
    if (item.action === "invoice") onNewInvoice?.();
    else if (item.path) navigate(item.path);
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
          <SidebarGroupContent>
            <SidebarMenu>
              {SIDEBAR_NAV_GROUPS.map((item, idx) => {
                if (isNavGroup(item)) {
                  const hasActiveChild = item.items.some((i) => i.path && isActive(i.path));
                  return (
                    <Collapsible key={item.label} defaultOpen={hasActiveChild} className="group/collapsible">
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            isActive={hasActiveChild}
                            tooltip={item.label}
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                            <ChevronRight className="ml-auto h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.items.map((sub) => (
                              <SidebarMenuSubItem key={sub.label}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={sub.path ? isActive(sub.path) : false}
                                >
                                  <NavLink to={sub.path ?? "#"}>{sub.label}</NavLink>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                return (
                  <SidebarMenuItem key={item.path ?? item.label ?? idx}>
                    <SidebarMenuButton
                      isActive={item.path ? isActive(item.path) : false}
                      onClick={() => handleNav(item)}
                      tooltip={item.label}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={location.pathname.startsWith("/settings")}
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
    return (
      <div className="flex flex-col min-h-svh">
        <OfflineBanner />
        <div className="flex-1 pt-safe pb-[56px]">
          <Outlet />
        </div>
        <BottomNav />
      </div>
    );
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
        <OfflineBanner />
        <div className="flex flex-1 flex-col min-h-svh">
          <Outlet />
        </div>
      </SidebarInset>
      <InvoiceCreation open={invoiceOpen} onOpenChange={setInvoiceOpen} />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
}
