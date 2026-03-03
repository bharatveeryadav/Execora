import { useState } from "react";
import { FileText, Wallet, Package, UserPlus, BookOpen, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import InvoiceCreation from "@/components/InvoiceCreation";
import { useCreateCustomer } from "@/hooks/useQueries";
import { useToast } from "@/hooks/use-toast";

const QuickActions = () => {
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();

  function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!custName.trim()) return;
    createCustomer.mutate(
      { name: custName.trim(), phone: custPhone.trim() },
      {
        onSuccess: () => {
          toast({ title: "Customer added", description: custName });
          setCustName(""); setCustPhone(""); setCustomerOpen(false);
        },
        onError: () => toast({ title: "Failed to add customer", variant: "destructive" }),
      }
    );
  }

  const actions = [
    { label: "New Invoice",  icon: FileText,    variant: "default" as const, onClick: () => setInvoiceOpen(true) },
    { label: "Payment In",   icon: Wallet,      variant: "outline" as const, onClick: () => navigate("/payment") },
    { label: "Expense",      icon: ShoppingCart,variant: "outline" as const, onClick: () => navigate("/expenses") },
    { label: "Cash Book",    icon: BookOpen,    variant: "outline" as const, onClick: () => navigate("/cashbook") },
    { label: "Add Customer", icon: UserPlus,    variant: "outline" as const, onClick: () => setCustomerOpen(true) },
    { label: "Stock Check",  icon: Package,     variant: "outline" as const, onClick: () => navigate("/inventory") },
  ];

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        ⚡ Quick Actions — <span className="normal-case font-normal text-muted-foreground/70">UI fallback if voice unavailable</span>
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

      {/* Add Customer Dialog */}
      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>👤 Add Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">Name *</Label>
              <Input
                id="cust-name"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-phone">Phone</Label>
              <Input
                id="cust-phone"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                type="tel"
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCustomerOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createCustomer.isPending || !custName.trim()}>
                {createCustomer.isPending ? "Adding…" : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickActions;
