import { useState } from "react";
import { FileText, Wallet, Package, UserPlus, ShoppingCart, Users, BarChart3 } from "lucide-react";
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
    { label: "New Invoice",  icon: FileText,    primary: true,  onClick: () => setInvoiceOpen(true) },
    { label: "Payment In",   icon: Wallet,      primary: false, onClick: () => navigate("/payment") },
    { label: "Add Customer", icon: UserPlus,    primary: false, onClick: () => setCustomerOpen(true) },
    { label: "Stock Check",  icon: Package,     primary: false, onClick: () => navigate("/inventory") },
    { label: "Invoices",     icon: FileText,    primary: false, onClick: () => navigate("/invoices") },
    { label: "Customers",    icon: Users,       primary: false, onClick: () => navigate("/customers") },
    { label: "Expenses",     icon: ShoppingCart,primary: false, onClick: () => navigate("/expenses") },
    { label: "Reports",      icon: BarChart3,   primary: false, onClick: () => navigate("/reports") },
  ];

  return (
    <div>
      <div className="grid grid-cols-4 gap-2.5">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className={`flex flex-col items-center gap-1.5 rounded-xl border py-4 text-center transition-all active:scale-95 ${
              action.primary
                ? "border-primary bg-primary text-primary-foreground shadow-md"
                : "border-border bg-card text-foreground hover:bg-muted/60"
            }`}
          >
            <action.icon className={`h-5 w-5 ${action.primary ? "text-primary-foreground" : "text-muted-foreground"}`} />
            <span className="text-[11px] font-semibold leading-tight">{action.label}</span>
          </button>
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
