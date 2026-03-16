/**
 * SettingsLayout — Desktop: left sidebar with groups. Mobile: collapsible nav + content.
 * Structure per PRD: Profile, General Settings, Banks and Payments, Payment Gateway, More.
 */
import { useState } from "react";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import {
  User,
  Building2,
  Users,
  Settings,
  Printer,
  Barcode,
  FileSignature,
  StickyNote,
  FileText,
  Bell,
  MoreHorizontal,
  Landmark,
  Wallet,
  CreditCard,
  ChevronRight,
  Menu,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type NavItem = { label: string; path: string; icon?: React.ElementType };
type NavGroup = { label: string; icon: React.ElementType; items: NavItem[] };

const SETTINGS_NAV: NavGroup[] = [
  {
    label: "Profile",
    icon: User,
    items: [
      { label: "Company Profile", path: "/settings/profile/company", icon: Building2 },
      { label: "User Profile", path: "/settings/profile/user", icon: User },
      { label: "All Users / Roles", path: "/settings/profile/users", icon: Users },
    ],
  },
  {
    label: "General Settings",
    icon: Settings,
    items: [
      { label: "Preferences", path: "/settings/general/preferences" },
      { label: "Thermal Print Settings", path: "/settings/general/thermal-print", icon: Printer },
      { label: "Barcode Settings", path: "/settings/general/barcode", icon: Barcode },
      { label: "Signatures", path: "/settings/general/signatures", icon: FileSignature },
      { label: "Notes", path: "/settings/general/notes", icon: StickyNote },
      { label: "Terms", path: "/settings/general/terms", icon: FileText },
      { label: "Auto Reminders", path: "/settings/general/auto-reminders", icon: Bell },
      { label: "Other", path: "/settings/general/other" },
    ],
  },
  {
    label: "Banks and Payments",
    icon: Landmark,
    items: [
      { label: "Banks", path: "/settings/banks/banks", icon: Landmark },
      { label: "Execora Wallet", path: "/settings/banks/wallet", icon: Wallet },
      { label: "Other", path: "/settings/banks/other" },
    ],
  },
  {
    label: "Payment Gateway",
    icon: CreditCard,
    items: [
      { label: "API & Webhooks", path: "/settings/payment-gateway/api" },
    ],
  },
  {
    label: "More",
    icon: MoreHorizontal,
    items: [
      { label: "More", path: "/settings/more" },
    ],
  },
];

function isActive(path: string, currentPath: string) {
  if (path === "/settings/more") return currentPath === "/settings/more";
  return currentPath.startsWith(path);
}

function SettingsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-1 py-2">
      {SETTINGS_NAV.map((group) => {
        const hasActiveChild = group.items.some((i) => isActive(i.path, location.pathname));
        return (
          <Collapsible key={group.label} defaultOpen={hasActiveChild} className="group/collapsible">
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-muted hover:text-foreground",
                  "text-muted-foreground"
                )}
              >
                <group.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/collapsible:rotate-90" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
                {group.items.map((item) => {
                  const active = isActive(item.path, location.pathname);
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </nav>
  );
}

export function SettingsLayout() {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col md:flex-row">
      {/* Desktop: fixed sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-border bg-muted/30 md:block">
        <div className="sticky top-0 flex h-[calc(100vh-0px)] flex-col overflow-y-auto p-4">
          <h2 className="mb-4 px-2 text-lg font-semibold">Settings</h2>
          <SettingsSidebar />
        </div>
      </aside>

      {/* Mobile: sheet trigger + content */}
      {isMobile && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              <div className="overflow-y-auto p-4">
                <SettingsSidebar onNavigate={() => setSheetOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="text-sm font-medium text-muted-foreground">Settings</span>
          <div className="w-10" />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
