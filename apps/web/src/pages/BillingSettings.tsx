/**
 * Billing Settings — Classic Billing–specific settings only.
 * GST, legal details, bank, invoice options, template.
 * Full Settings at /settings for team, payment gateways, etc.
 */
import { useState, useEffect } from "react";
import { ArrowLeft, Building2, Save, Mail, MessageCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  InvoiceTemplatePreview,
  TemplateThumbnail,
  TEMPLATES,
  type TemplateId,
} from "@/components/InvoiceTemplatePreview";
import { TemplateGalleryModal } from "@/components/TemplateGalleryModal";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useMe, useUpdateProfile } from "@/hooks/useQueries";

const BIZ_STORAGE_KEY = "execora:bizprofile";

const BillingSettings = () => {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();

  // Business profile — GST & Legal
  const [bizGstin, setBizGstin] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").gstin ??
        me?.tenant?.gstin ??
        ""
      );
    } catch {
      return "";
    }
  });
  const [bizLegalName, setBizLegalName] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").legalName ??
        me?.tenant?.legalName ??
        me?.tenant?.name ??
        ""
      );
    } catch {
      return "";
    }
  });
  const [bizPhone, setBizPhone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").phone ?? "";
    } catch {
      return "";
    }
  });
  const [bizAddress, setBizAddress] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").address ?? "";
    } catch {
      return "";
    }
  });
  const [bizCity, setBizCity] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").city ?? "";
    } catch {
      return "";
    }
  });
  const [bizState, setBizState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").state ?? "";
    } catch {
      return "";
    }
  });
  const [bizPincode, setBizPincode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").pincode ?? "";
    } catch {
      return "";
    }
  });
  const [bizUpiVpa, setBizUpiVpa] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").upiVpa ?? "";
    } catch {
      return "";
    }
  });

  // Bank
  const [bankName, setBankName] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").bankName ?? "";
    } catch {
      return "";
    }
  });
  const [bankAccountNo, setBankAccountNo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").bankAccountNo ?? "";
    } catch {
      return "";
    }
  });
  const [bankIfsc, setBankIfsc] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").bankIfsc ?? "";
    } catch {
      return "";
    }
  });
  const [bankAccountHolder, setBankAccountHolder] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").bankAccountHolder ?? "";
    } catch {
      return "";
    }
  });

  // Invoice options
  const [termsAndConditions, setTermsAndConditions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").termsAndConditions ?? "";
    } catch {
      return "";
    }
  });
  const [roundOff, setRoundOff] = useState<boolean>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").roundOff;
      return v === true || v === "true";
    } catch {
      return false;
    }
  });
  const [compositionScheme, setCompositionScheme] = useState<boolean>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").compositionScheme;
      return v === true || v === "true";
    } catch {
      return false;
    }
  });

  // Invoice auto-delivery
  const [autoSendEmail, setAutoSendEmail] = useState<boolean>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").autoSendEmail;
      return v === false ? false : true;
    } catch {
      return true;
    }
  });
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState<boolean>(() => {
    try {
      const v = JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").autoSendWhatsApp;
      return v === false ? false : true;
    } catch {
      return true;
    }
  });

  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [invoiceTemplate, setInvoiceTemplate] = useState<TemplateId>(() => {
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}"); } catch { return {}; }
    })();
    return (stored.invoiceTemplate as TemplateId) ?? (localStorage.getItem("inv_template") as TemplateId) ?? "classic";
  });

  // Preserve other stored values when saving (don't overwrite)
  const getStoredBizProfile = () => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  // Sync from API when me loads
  useEffect(() => {
    if (!me?.tenant) return;
    const stored = getStoredBizProfile();
    const s = (me.tenant as unknown as { settings?: Record<string, string> }).settings ?? {};
    if (!stored.gstin && me.tenant.gstin) setBizGstin(me.tenant.gstin);
    if (!stored.legalName && (me.tenant.legalName || me.tenant.name))
      setBizLegalName(me.tenant.legalName ?? me.tenant.name ?? "");
    if (!stored.phone && s.phone) setBizPhone(s.phone);
    if (!stored.address && s.address) setBizAddress(s.address);
    if (!stored.city && s.city) setBizCity(s.city);
    if (!stored.state && s.state) setBizState(s.state);
    if (!stored.pincode && s.pincode) setBizPincode(s.pincode);
    if (!stored.upiVpa && s.upiVpa) setBizUpiVpa(s.upiVpa);
    if (!stored.bankName && s.bankName) setBankName(s.bankName);
    if (!stored.bankAccountNo && s.bankAccountNo) setBankAccountNo(s.bankAccountNo);
    if (!stored.bankIfsc && s.bankIfsc) setBankIfsc(s.bankIfsc);
    if (!stored.bankAccountHolder && s.bankAccountHolder) setBankAccountHolder(s.bankAccountHolder);
    if (!stored.termsAndConditions && s.termsAndConditions) setTermsAndConditions(s.termsAndConditions);
    if (stored.roundOff === undefined && s.roundOff !== undefined) setRoundOff(s.roundOff === "true");
    if (stored.compositionScheme === undefined && s.compositionScheme !== undefined)
      setCompositionScheme(s.compositionScheme === "true");
    if (stored.autoSendEmail === undefined && s.autoSendEmail !== undefined)
      setAutoSendEmail(s.autoSendEmail !== "false");
    if (stored.autoSendWhatsApp === undefined && s.autoSendWhatsApp !== undefined)
      setAutoSendWhatsApp(s.autoSendWhatsApp !== "false");
    if (s.invoiceTemplate) setInvoiceTemplate(s.invoiceTemplate as TemplateId);
  }, [me]);

  const handleSave = async () => {
    const stored = getStoredBizProfile();
    const toSave = {
      ...stored,
      gstin: bizGstin,
      legalName: bizLegalName,
      phone: bizPhone,
      address: bizAddress,
      city: bizCity,
      state: bizState,
      pincode: bizPincode,
      upiVpa: bizUpiVpa,
      bankName,
      bankAccountNo,
      bankIfsc,
      bankAccountHolder,
      termsAndConditions,
      roundOff,
      compositionScheme,
      autoSendEmail,
      autoSendWhatsApp,
      invoiceTemplate,
    };
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(toSave));
    localStorage.setItem("inv_template", invoiceTemplate);

    // Build settings for API — merge billing fields with any existing (payment gateways, etc.)
    const meSettings = (me?.tenant as unknown as { settings?: Record<string, string> })?.settings ?? {};
    const settings: Record<string, string> = {
      ...meSettings,
      phone: bizPhone,
      address: bizAddress,
      city: bizCity,
      state: bizState,
      pincode: bizPincode,
      upiVpa: bizUpiVpa,
      autoSendEmail: String(autoSendEmail),
      autoSendWhatsApp: String(autoSendWhatsApp),
      bankName,
      bankAccountNo,
      bankIfsc,
      bankAccountHolder,
      termsAndConditions,
      roundOff: String(roundOff),
      compositionScheme: String(compositionScheme),
      invoiceTemplate,
    };

    try {
      await updateProfile.mutateAsync({
        tenant: {
          legalName: bizLegalName || undefined,
          gstin: bizGstin || undefined,
          settings,
        },
      });
      toast({ title: "✅ Billing settings saved" });
    } catch {
      toast({
        title: "✅ Saved locally",
        description: "Could not sync to server — check connection.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-3 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/billing")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight md:text-xl">
                Billing Settings
              </h1>
              <p className="text-xs text-muted-foreground">
                GST, legal details, bank, invoice options — for Classic Billing
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/settings")}
            >
              Full Settings
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateProfile.isPending}
            >
              <Save className="mr-1.5 h-4 w-4" />
              {updateProfile.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
        {/* Document Templates — ~35% preview left, ~65% content right, minimal spacing */}
        <Card
          className="border rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setTemplateGalleryOpen(true)}
        >
          <CardContent className="p-1 flex items-stretch gap-1.5">
            <div className="w-[35%] min-w-0 flex shrink-0 overflow-hidden max-h-[90px]" style={{ minHeight: 0 }}>
              <div style={{ transform: "scale(0.3)", transformOrigin: "top left", margin: 0, padding: 0 }}>
                <InvoiceTemplatePreview
                  template={invoiceTemplate}
                  data={{
                    invoiceNo: "INV-001",
                    date: "14-Mar-2025",
                    shopName: "My Store",
                    customerName: "Sample Customer",
                    supplierGstin: "07ABCDE1234F1Z5",
                    supplierAddress: "123 Main St, Bangalore 560001",
                    items: [
                      { name: "Rice 1kg", qty: 5, unit: "pcs", rate: 80, discount: 0, amount: 400 },
                      { name: "Dal 500g", qty: 2, unit: "pcs", rate: 120, discount: 5, amount: 228 },
                    ],
                    subtotal: 628,
                    discountAmt: 31,
                    cgst: 29.85,
                    sgst: 29.85,
                    total: 656.7,
                    amountInWords: "Six Hundred Fifty Six Rupees Seventy Paise Only",
                  }}
                />
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5 pr-0.5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm leading-tight">Invoice Templates</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              </div>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">Choose from 7 ready templates.</p>
              <span
                className="text-sm font-medium mt-0.5"
                style={{ color: TEMPLATES.find((t) => t.id === invoiceTemplate)?.color ?? "#22c55e" }}
              >
                {TEMPLATES.find((t) => t.id === invoiceTemplate)?.label ?? "Classic"}
              </span>
            </div>
          </CardContent>
        </Card>

        <TemplateGalleryModal
          open={templateGalleryOpen}
          onOpenChange={setTemplateGalleryOpen}
          selectedTemplate={invoiceTemplate}
          onSelectTemplate={(id) => {
            setInvoiceTemplate(id);
            localStorage.setItem("inv_template", id);
            const stored = getStoredBizProfile();
            stored.invoiceTemplate = id;
            localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));
          }}
        />

        {/* Business Profile — GST & Legal */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Business Profile (GST & Legal)</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Printed on every invoice — supplier details for GST compliance.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">GSTIN</Label>
                <Input
                  value={bizGstin}
                  onChange={(e) => setBizGstin(e.target.value.toUpperCase())}
                  placeholder="07ABCDE1234F1Z5"
                  maxLength={15}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Business Legal Name</Label>
                <Input
                  value={bizLegalName}
                  onChange={(e) => setBizLegalName(e.target.value)}
                  placeholder="Your Business Pvt Ltd"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Business Phone</Label>
                <Input
                  value={bizPhone}
                  onChange={(e) => setBizPhone(e.target.value)}
                  placeholder="Business contact number"
                  type="tel"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Business Address (Line 1)</Label>
                <Input
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  placeholder="Building, street, locality"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input
                  value={bizCity}
                  onChange={(e) => setBizCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">State</Label>
                <Input
                  value={bizState}
                  onChange={(e) => setBizState(e.target.value)}
                  placeholder="e.g. Karnataka"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PIN Code</Label>
                <Input
                  value={bizPincode}
                  onChange={(e) =>
                    setBizPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="6-digit"
                  maxLength={6}
                  className="font-mono w-24"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">UPI ID (for QR on invoices)</Label>
                <Input
                  value={bizUpiVpa}
                  onChange={(e) => setBizUpiVpa(e.target.value.trim())}
                  placeholder="yourbusiness@upi"
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Customers can scan this QR to pay directly on the invoice.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Account Details */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Bank Account Details</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Printed on every invoice PDF footer — for NEFT/IMPS transfers.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Account Holder Name</Label>
                <Input
                  value={bankAccountHolder}
                  onChange={(e) => setBankAccountHolder(e.target.value)}
                  placeholder="Business or proprietor name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bank Name</Label>
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. State Bank of India"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Account Number</Label>
                <Input
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value.trim())}
                  placeholder="e.g. 00110123456789"
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">IFSC Code</Label>
                <Input
                  value={bankIfsc}
                  onChange={(e) =>
                    setBankIfsc(e.target.value.toUpperCase().trim())
                  }
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Options */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoice Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Round off invoice total</p>
                <p className="text-xs text-muted-foreground">
                  Rounds grand total to nearest rupee — prints ±paise on PDF
                </p>
              </div>
              <Switch checked={roundOff} onCheckedChange={setRoundOff} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">GST Composition Scheme</p>
                <p className="text-xs text-muted-foreground">
                  Section 10 dealer — 1% flat tax. Invoices show Composition Tax instead of CGST/SGST.
                </p>
              </div>
              <Switch checked={compositionScheme} onCheckedChange={setCompositionScheme} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Terms & Conditions (printed on invoice)</Label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="e.g. Payment due within 30 days."
                rows={3}
                maxLength={500}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                {termsAndConditions.length}/500 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Auto-Delivery */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Invoice Auto-Delivery</CardTitle>
              {autoSendEmail && autoSendWhatsApp ? (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                  Email + WhatsApp ON
                </span>
              ) : autoSendEmail ? (
                <span className="rounded-full bg-info/10 px-2 py-0.5 text-[10px] font-semibold text-info">
                  Email only
                </span>
              ) : autoSendWhatsApp ? (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                  WhatsApp only
                </span>
              ) : (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  Manual only
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-send invoice PDF when you confirm a bill. Toggle OFF = send manually from invoice detail.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-info/10">
                  <Mail className="h-4 w-4 text-info" />
                </div>
                <div>
                  <p className="text-sm font-medium">Auto-send via Email</p>
                  <p className="text-xs text-muted-foreground">
                    Sends PDF to customer's email on invoice confirm
                  </p>
                </div>
              </div>
              <Switch checked={autoSendEmail} onCheckedChange={setAutoSendEmail} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10">
                  <MessageCircle className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">Auto-send via WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Sends PDF to customer's WhatsApp on invoice confirm
                  </p>
                </div>
              </div>
              <Switch checked={autoSendWhatsApp} onCheckedChange={setAutoSendWhatsApp} />
            </div>
            {!autoSendEmail && !autoSendWhatsApp && (
              <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                ⚠️ Both off — invoices won't auto-send. Use "Send" on invoice detail to deliver manually.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Invoice Template — My Store style */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">My Store Invoice Style</CardTitle>
            <p className="text-xs text-muted-foreground">
              Choose how your invoices look. Saved per store — applies to all bills.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {TEMPLATES.map((t) => (
                <TemplateThumbnail
                  key={t.id}
                  template={t}
                  selected={invoiceTemplate === t.id}
                  onClick={() => {
                    setInvoiceTemplate(t.id);
                    localStorage.setItem("inv_template", t.id);
                    const stored = getStoredBizProfile();
                    stored.invoiceTemplate = t.id;
                    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pb-8">
          <Button variant="outline" onClick={() => navigate("/settings")}>
            Team, payment gateways & more → Full Settings
          </Button>
        </div>
      </main>
    </div>
  );
};

export default BillingSettings;
