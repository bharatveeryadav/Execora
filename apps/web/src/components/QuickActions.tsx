import { useState } from "react";
import { FileText, Wallet, Package, UserPlus, BarChart3, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import InvoiceCreation from "@/components/InvoiceCreation";

const QuickActions = () => {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const navigate = useNavigate();

  const actions = [
    { label: "New Invoice", icon: FileText, variant: "default" as const, onClick: () => setInvoiceOpen(true) },
    { label: "Payment", icon: Wallet, variant: "outline" as const, onClick: () => navigate("/payment") },
    { label: "Stock Check", icon: Package, variant: "outline" as const, onClick: () => navigate("/inventory") },
    { label: "Add Customer", icon: UserPlus, variant: "outline" as const },
    { label: "Report", icon: BarChart3, variant: "outline" as const, onClick: () => navigate("/reports") },
    { label: "More", icon: Settings, variant: "outline" as const, onClick: () => navigate("/settings") },
  ];

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        ⚡ Quick Actions
      </h2>
      <div className="grid grid-cols-3 gap-2 md:grid-cols-6 md:gap-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="h-auto flex-col gap-1.5 py-4 text-xs font-medium shadow-sm"
            onClick={action.onClick}
          >
            <action.icon className="h-5 w-5" />
            {action.label}
          </Button>
        ))}
      </div>
      <InvoiceCreation open={invoiceOpen} onOpenChange={setInvoiceOpen} />
    </div>
  );
};

export default QuickActions;
