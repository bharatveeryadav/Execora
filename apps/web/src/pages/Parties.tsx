import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Truck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Customers, { type CustomersRef } from "./Customers";
import BottomNav from "@/components/BottomNav";

type Tab = "customers" | "vendors";

const Parties = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("customers");
  const customersRef = useRef<CustomersRef>(null);

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="flex-1 text-base font-bold">👥 Parties</h1>
          </div>

          {/* Tabs */}
          <div className="mt-3 flex rounded-xl border bg-muted/50 p-1 gap-1">
            <button
              type="button"
              onClick={() => setTab("customers")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "customers"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Customers
            </button>
            <button
              type="button"
              onClick={() => setTab("vendors")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
                tab === "vendors"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Truck className="h-4 w-4" />
              Vendors
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="min-h-[50vh]">
        {tab === "customers" && (
          <Customers ref={customersRef} embedded />
        )}
        {tab === "vendors" && (
          <div className="mx-auto max-w-3xl p-6">
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-card py-20 text-center">
              <Truck className="h-16 w-16 text-muted-foreground/40" />
              <h2 className="text-lg font-semibold">Vendors</h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Manage suppliers and vendors you buy from. Coming soon.
              </p>
            </div>
          </div>
        )}
      </div>

      {tab === "customers" && (
        <button
          onClick={() => customersRef.current?.openAdd()}
          className="fixed bottom-20 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
          aria-label="New Customer"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      <BottomNav />
    </div>
  );
};

export default Parties;
