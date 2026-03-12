import { useState } from "react";
import {
  Bell,
  X,
  AlertTriangle,
  Package,
  DollarSign,
  CheckCircle,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCustomers, useLowStockProducts } from "@/hooks/useQueries";
import { formatCurrency, draftApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: "overdue" | "stock" | "payment" | "info";
  title: string;
  body: string;
  action?: () => void;
  actionLabel?: string;
  read: boolean;
}

export default function NotificationCenter() {
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomers();
  const { data: lowStock = [] } = useLowStockProducts();
  const [read, setRead] = useState<Set<string>>(new Set());

  const { data: draftData } = useQuery({
    queryKey: ["drafts", "pending"],
    queryFn: () => draftApi.list(undefined, "pending"),
    staleTime: 0,
    refetchInterval: 15_000,
  });
  const pendingDraftCount = draftData?.drafts?.length ?? 0;

  const overdueCustomers = customers.filter(
    (c) => parseFloat(String((c as any).balance ?? 0)) > 0,
  );
  const totalOverdue = overdueCustomers.reduce(
    (s, c) => s + parseFloat(String((c as any).balance ?? 0)),
    0,
  );

  const notifications: Notification[] = [
    ...(pendingDraftCount > 0
      ? [
          {
            id: "pending-drafts",
            type: "info" as const,
            title: "Pending Drafts",
            body: `${pendingDraftCount} item${pendingDraftCount !== 1 ? "s" : ""} waiting for your review`,
            action: () =>
              window.dispatchEvent(new CustomEvent("open-draft-panel")),
            actionLabel: "Review",
            read: read.has("pending-drafts"),
          },
        ]
      : []),
    ...(overdueCustomers.length > 0
      ? [
          {
            id: "overdue",
            type: "overdue" as const,
            title: "Overdue Payments",
            body: `${overdueCustomers.length} customers owe ${formatCurrency(totalOverdue)}`,
            action: () => navigate("/payment"),
            actionLabel: "Collect",
            read: read.has("overdue"),
          },
        ]
      : []),
    ...(lowStock.length > 0
      ? [
          {
            id: "stock",
            type: "stock" as const,
            title: "Low Stock Alert",
            body: `${lowStock.length} items below minimum: ${lowStock
              .slice(0, 2)
              .map((p) => p.name)
              .join(", ")}${lowStock.length > 2 ? "…" : ""}`,
            action: () => navigate("/inventory"),
            actionLabel: "Restock",
            read: read.has("stock"),
          },
        ]
      : []),
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  const iconMap = {
    overdue: <DollarSign className="h-4 w-4 text-destructive" />,
    stock: <Package className="h-4 w-4 text-warning" />,
    payment: <CheckCircle className="h-4 w-4 text-success" />,
    info: <ClipboardList className="h-4 w-4 text-primary" />,
  };

  const bgMap = {
    overdue: "bg-destructive/10",
    stock: "bg-warning/10",
    payment: "bg-success/10",
    info: "bg-primary/10",
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setRead(new Set(notifications.map((n) => n.id)))}
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <div
          className="max-h-80 overflow-y-auto"
          style={{ scrollbarWidth: "thin" }}
        >
          {notifications.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-success/60" />
              <p className="text-sm font-medium text-success">All clear!</p>
              <p className="text-xs text-muted-foreground mt-1">
                No pending alerts
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex gap-3 px-4 py-3 border-b last:border-0 transition-colors",
                  !n.read && "bg-accent/40",
                )}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    bgMap[n.type],
                  )}
                >
                  {iconMap[n.type]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-tight">
                    {n.body}
                  </p>
                  {n.action && (
                    <button
                      onClick={() => {
                        setRead((prev) => new Set([...prev, n.id]));
                        n.action!();
                      }}
                      className="mt-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      {n.actionLabel} →
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setRead((prev) => new Set([...prev, n.id]))}
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
