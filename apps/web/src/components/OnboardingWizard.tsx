import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, MapPin, CreditCard, ChevronRight, Check } from "lucide-react";

const BIZ_STORAGE_KEY = "execora:bizprofile";
const ONBOARDED_KEY   = "execora:onboarded";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir",
  "Ladakh","Chandigarh","Puducherry",
];

type Step = 1 | 2 | 3;

interface WizardData {
  legalName: string;
  phone: string;
  city: string;
  state: string;
  address: string;
  gstin: string;
  upiVpa: string;
  businessType: string;
}

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<WizardData>({
    legalName:    "",
    phone:        "",
    city:         "",
    state:        "Delhi",
    address:      "",
    gstin:        "",
    upiVpa:       "",
    businessType: "kirana",
  });

  useEffect(() => {
    const onboarded = localStorage.getItem(ONBOARDED_KEY);
    if (onboarded) return;

    const profile = JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}");
    if (!profile.legalName) {
      setOpen(true);
    }
  }, []);

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function save() {
    const existing = JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}");
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify({
      ...existing,
      legalName:    data.legalName.trim(),
      phone:        data.phone.trim(),
      city:         data.city.trim(),
      state:        data.state,
      address:      data.address.trim(),
      gstin:        data.gstin.trim().toUpperCase(),
      upiVpa:       data.upiVpa.trim(),
      businessType: data.businessType,
    }));
    localStorage.setItem(ONBOARDED_KEY, "1");
    setOpen(false);
  }

  const canNext1 = data.legalName.trim().length >= 2;
  const canNext2 = data.city.trim().length >= 2;

  const steps = [
    { icon: Store,      label: "Shop Info"  },
    { icon: MapPin,     label: "Location"   },
    { icon: CreditCard, label: "Payments"   },
  ];

  return (
    <Dialog open={open} onOpenChange={() => {/* prevent dismiss — must complete */}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Welcome to Execora
          </DialogTitle>
          <DialogDescription>
            Set up your shop in 3 quick steps to get started.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 my-2">
          {steps.map((s, i) => {
            const num  = (i + 1) as Step;
            const done = step > num;
            const active = step === num;
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-1 flex-1">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold
                    ${done   ? "bg-primary text-primary-foreground"  : ""}
                    ${active ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : ""}
                    ${!done && !active ? "bg-muted text-muted-foreground" : ""}
                  `}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-xs hidden sm:block ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${step > num ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1 — Shop Info */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="legalName">Shop / Business Name <span className="text-destructive">*</span></Label>
              <Input
                id="legalName"
                placeholder="e.g. Sharma Kirana Store"
                value={data.legalName}
                onChange={(e) => update("legalName", e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Shop Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g. 9876543210"
                value={data.phone}
                onChange={(e) => update("phone", e.target.value)}
                maxLength={10}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Business Type</Label>
              <Select value={data.businessType} onValueChange={(v) => update("businessType", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kirana">Kirana / Grocery</SelectItem>
                  <SelectItem value="retail">Retail Shop</SelectItem>
                  <SelectItem value="wholesale">Wholesale / Distributor</SelectItem>
                  <SelectItem value="cosmetics">Cosmetics / Beauty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2 — Location */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="address">Shop Address</Label>
              <Input
                id="address"
                placeholder="e.g. 12, Main Market, Gandhi Nagar"
                value={data.address}
                onChange={(e) => update("address", e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                <Input
                  id="city"
                  placeholder="e.g. Delhi"
                  value={data.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Select value={data.state} onValueChange={(v) => update("state", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstin">GSTIN (optional)</Label>
              <Input
                id="gstin"
                placeholder="e.g. 07AAAAA0000A1Z5"
                value={data.gstin}
                onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                maxLength={15}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Required for GST-registered businesses. Leave blank if unregistered.</p>
            </div>
          </div>
        )}

        {/* Step 3 — Payments */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="upiVpa">UPI ID / VPA (optional)</Label>
              <Input
                id="upiVpa"
                placeholder="e.g. shopname@upi or 9876543210@paytm"
                value={data.upiVpa}
                onChange={(e) => update("upiVpa", e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Shown on invoices and payment receipts for customers to pay you directly.</p>
            </div>
            <div className="rounded-lg border border-dashed p-4 bg-muted/30 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">You can add more details later:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Bank account (NEFT / RTGS details on invoices)</li>
                <li>Logo &amp; signature</li>
                <li>WhatsApp &amp; voice integration</li>
              </ul>
              <p className="text-xs pt-1">Go to <strong>Settings → Business Profile</strong> anytime.</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step > 1 && setStep((s) => (s - 1) as Step)}
            disabled={step === 1}
          >
            Back
          </Button>
          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={step === 1 ? !canNext1 : !canNext2}
            >
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={save} className="gap-2">
              <Check className="h-4 w-4" />
              Get Started
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
