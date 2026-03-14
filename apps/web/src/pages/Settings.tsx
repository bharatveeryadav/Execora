import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Mic,
  Save,
  UserPlus,
  Users,
  HardDrive,
  Download,
  RefreshCw,
  Volume2,
  Moon,
  Sun,
  Building2,
  Trash2,
  ShieldCheck,
  Mail,
  MessageCircle,
  Zap,
  Copy,
  Eye,
  EyeOff,
  Check,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  InvoiceTemplatePreview,
  TemplateThumbnail,
  TEMPLATES,
  type TemplateId,
} from "@/components/InvoiceTemplatePreview";
import { TemplateGalleryModal } from "@/components/TemplateGalleryModal";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  useMe,
  useUpdateProfile,
  useUsers,
  useCreateUser,
  useRemoveUser,
} from "@/hooks/useQueries";

const TTS_STORAGE_KEY = "execora:ttsProvider";
const BIZ_STORAGE_KEY = "execora:bizprofile";
const LANG_STORAGE_KEY = "execora:lang";

const Settings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { data: teamUsers = [], isLoading: usersLoading } = useUsers();
  const createUser = useCreateUser();
  const removeUser = useRemoveUser();

  // Add-user dialog
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<"manager" | "staff" | "viewer">(
    "staff",
  );
  const [newPassword, setNewPassword] = useState("");

  function resetAddUser() {
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewRole("staff");
    setNewPassword("");
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim() || newPassword.length < 8) {
      toast({
        title: "Fill all fields; password ≥ 8 chars",
        variant: "destructive",
      });
      return;
    }
    try {
      await createUser.mutateAsync({
        name: newName.trim(),
        email: newEmail.trim(),
        phone: newPhone.trim() || undefined,
        role: newRole,
        password: newPassword,
      });
      toast({ title: `✅ ${newName} added as ${newRole}` });
      resetAddUser();
      setAddUserOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add user";
      toast({ title: "❌ " + msg, variant: "destructive" });
    }
  }

  async function handleRemoveUser(id: string, name: string) {
    if (!confirm(`Remove ${name}? They will lose access immediately.`)) return;
    try {
      await removeUser.mutateAsync(id);
      toast({ title: `${name} removed` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove user";
      toast({ title: "❌ " + msg, variant: "destructive" });
    }
  }

  const [ttsProvider, setTtsProvider] = useState<string>(
    () => localStorage.getItem(TTS_STORAGE_KEY) ?? "browser",
  );
  const [notifications, setNotifications] = useState({
    whatsapp: true,
    email: true,
    sms: false,
    duePayments: true,
    lowStock: true,
    dailySummary: true,
    newCustomer: true,
  });

  // Editable profile fields seeded from real user data
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [profileEmail, setProfileEmail] = useState(user?.email ?? "");

  // Business profile — persisted to localStorage
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
      return (
        JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").phone ?? ""
      );
    } catch {
      return "";
    }
  });
  const [bizAddress, setBizAddress] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").address ?? ""
      );
    } catch {
      return "";
    }
  });
  const [bizCity, setBizCity] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").city ?? "";
    } catch { return ""; }
  });
  const [bizState, setBizState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").state ?? "";
    } catch { return ""; }
  });
  const [bizPincode, setBizPincode] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").pincode ?? "";
    } catch { return ""; }
  });
  const [bizUpiVpa, setBizUpiVpa] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").upiVpa ?? ""
      );
    } catch {
      return "";
    }
  });
  // Bank account details
  const [bankName, setBankName] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").bankName ?? ""; } catch { return ""; }
  });
  const [bankAccountNo, setBankAccountNo] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").bankAccountNo ?? ""; } catch { return ""; }
  });
  const [bankIfsc, setBankIfsc] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").bankIfsc ?? ""; } catch { return ""; }
  });
  const [bankAccountHolder, setBankAccountHolder] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").bankAccountHolder ?? ""; } catch { return ""; }
  });
  // Terms & Conditions
  const [termsAndConditions, setTermsAndConditions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").termsAndConditions ?? ""; } catch { return ""; }
  });
  // Invoice options
  const [roundOff, setRoundOff] = useState<boolean>(() => {
    try { const v = JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").roundOff; return v === true || v === "true"; } catch { return false; }
  });
  // AI / Voice features toggle
  const [aiEnabled, setAiEnabled] = useState<boolean>(() => {
    try { const v = JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").aiEnabled; return v === false || v === "false" ? false : true; } catch { return true; }
  });
  // GST Composition Scheme (Section 10) — 1% flat tax, no CGST/SGST breakdown
  const [compositionScheme, setCompositionScheme] = useState<boolean>(() => {
    try { const v = JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").compositionScheme; return v === true || v === "true"; } catch { return false; }
  });

  const [razorpaySecret, setRazorpaySecret] = useState("");
  const [phonepeSecret, setPhonepeSecret] = useState("");
  const [cashfreeSecret, setCashfreeSecret] = useState("");
  const [payuSecret, setPayuSecret] = useState("");
  const [paytmSecret, setPaytmSecret] = useState("");
  const [instamojoSalt, setInstamojoSalt] = useState("");
  const [stripeSecret, setStripeSecret] = useState("");
  const [easebuzzSalt, setEasebuzzSalt] = useState("");
  const [bharatpeSecret, setBharatpeSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  // Invoice auto-delivery toggles — persisted to tenant settings
  const [autoSendEmail, setAutoSendEmail] = useState<boolean>(() => {
    try {
      const v = JSON.parse(
        localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}",
      ).autoSendEmail;
      return v === false ? false : true;
    } catch {
      return true;
    }
  });
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState<boolean>(() => {
    try {
      const v = JSON.parse(
        localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}",
      ).autoSendWhatsApp;
      return v === false ? false : true;
    } catch {
      return true;
    }
  });
  const [lang, setLang] = useState(
    () => localStorage.getItem(LANG_STORAGE_KEY) ?? "english",
  );
  const [invoiceTemplate, setInvoiceTemplate] = useState<TemplateId>(() => {
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}"); } catch { return {}; }
    })();
    return (stored.invoiceTemplate as TemplateId) ?? (localStorage.getItem("inv_template") as TemplateId) ?? "classic";
  });
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);

  // Sync with me?.tenant once loaded — seeds from API if localStorage is empty
  useEffect(() => {
    if (me?.tenant) {
      const stored = (() => {
        try {
          return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}");
        } catch {
          return {};
        }
      })();
      const s =
        (me.tenant as unknown as { settings?: Record<string, string> })
          .settings ?? {};
      if (!stored.gstin && me.tenant.gstin) setBizGstin(me.tenant.gstin);
      if (!stored.legalName && (me.tenant.legalName || me.tenant.name))
        setBizLegalName(me.tenant.legalName ?? me.tenant.name ?? "");
      if (!stored.phone && s.phone) setBizPhone(s.phone);
      if (!stored.address && s.address) setBizAddress(s.address);
      if (!stored.city && s.city) setBizCity(s.city);
      if (!stored.state && s.state) setBizState(s.state);
      if (!stored.pincode && s.pincode) setBizPincode(s.pincode);
      if (!stored.upiVpa && s.upiVpa) setBizUpiVpa(s.upiVpa);
      if (s.razorpayWebhookSecret) setRazorpaySecret(s.razorpayWebhookSecret);
      if (s.phonepeWebhookSecret) setPhonepeSecret(s.phonepeWebhookSecret);
      if (s.cashfreeWebhookSecret) setCashfreeSecret(s.cashfreeWebhookSecret);
      if (s.payuWebhookSecret) setPayuSecret(s.payuWebhookSecret);
      if (s.paytmMerchantKey) setPaytmSecret(s.paytmMerchantKey);
      if (s.instamojoSalt) setInstamojoSalt(s.instamojoSalt);
      if (s.stripeWebhookSecret) setStripeSecret(s.stripeWebhookSecret);
      if (s.easebuzzSalt) setEasebuzzSalt(s.easebuzzSalt);
      if (s.bharatpeWebhookSecret) setBharatpeSecret(s.bharatpeWebhookSecret);
      if (stored.autoSendEmail === undefined && s.autoSendEmail !== undefined)
        setAutoSendEmail(s.autoSendEmail !== "false");
      if (stored.autoSendWhatsApp === undefined && s.autoSendWhatsApp !== undefined)
        setAutoSendWhatsApp(s.autoSendWhatsApp !== "false");
      if (!stored.bankName && s.bankName) setBankName(s.bankName);
      if (!stored.bankAccountNo && s.bankAccountNo) setBankAccountNo(s.bankAccountNo);
      if (!stored.bankIfsc && s.bankIfsc) setBankIfsc(s.bankIfsc);
      if (!stored.bankAccountHolder && s.bankAccountHolder) setBankAccountHolder(s.bankAccountHolder);
      if (!stored.termsAndConditions && s.termsAndConditions) setTermsAndConditions(s.termsAndConditions);
      if (stored.roundOff === undefined && s.roundOff !== undefined)
        setRoundOff(s.roundOff === "true");
      if (stored.aiEnabled === undefined && s.aiEnabled !== undefined)
        setAiEnabled(s.aiEnabled !== "false");
      if (stored.compositionScheme === undefined && s.compositionScheme !== undefined)
        setCompositionScheme(s.compositionScheme === "true");
      if (s.invoiceTemplate) {
        setInvoiceTemplate(s.invoiceTemplate as TemplateId);
        localStorage.setItem("inv_template", s.invoiceTemplate);
      }
    }
    if (me?.name && !profileName) setProfileName(me.name);
  }, [me]);

  // Scroll to business-profile when navigated from Classic Billing
  useEffect(() => {
    if (location.hash === "#business-profile") {
      document.getElementById("business-profile")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  const handleSave = async () => {
    // Always persist to localStorage for offline / PDF use
    localStorage.setItem(
      BIZ_STORAGE_KEY,
      JSON.stringify({
        gstin: bizGstin,
        legalName: bizLegalName,
        phone: bizPhone,
        address: bizAddress,
        city: bizCity,
        state: bizState,
        pincode: bizPincode,
        upiVpa: bizUpiVpa,
        autoSendEmail,
        autoSendWhatsApp,
        bankName,
        bankAccountNo,
        bankIfsc,
        bankAccountHolder,
        termsAndConditions,
        roundOff,
        aiEnabled,
        compositionScheme,
        invoiceTemplate,
      }),
    );
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    localStorage.setItem("inv_template", invoiceTemplate);

    // Persist to backend — updates both user row and tenant row
    try {
      await updateProfile.mutateAsync({
        name: profileName || undefined,
        tenant: {
          legalName: bizLegalName || undefined,
          gstin: bizGstin || undefined,
          language: lang || undefined,
          settings: {
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
            aiEnabled: String(aiEnabled),
            compositionScheme: String(compositionScheme),
            invoiceTemplate,
            ...(razorpaySecret
              ? { razorpayWebhookSecret: razorpaySecret }
              : {}),
            ...(phonepeSecret ? { phonepeWebhookSecret: phonepeSecret } : {}),
            ...(cashfreeSecret
              ? { cashfreeWebhookSecret: cashfreeSecret }
              : {}),
            ...(payuSecret ? { payuWebhookSecret: payuSecret } : {}),
            ...(paytmSecret ? { paytmMerchantKey: paytmSecret } : {}),
            ...(instamojoSalt ? { instamojoSalt } : {}),
            ...(stripeSecret ? { stripeWebhookSecret: stripeSecret } : {}),
            ...(easebuzzSalt ? { easebuzzSalt } : {}),
            ...(bharatpeSecret
              ? { bharatpeWebhookSecret: bharatpeSecret }
              : {}),
          },
        },
      });
      toast({
        title: "✅ Settings saved",
        description: "Business profile synced to server.",
      });
    } catch {
      // API fail — localStorage already saved, show partial success
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
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold tracking-tight md:text-xl">
              ⚙️ Settings
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
              title={
                theme === "dark"
                  ? "Switch to Light Mode"
                  : "Switch to Dark Mode"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <Button variant="ghost" size="icon">
              <Mic className="h-5 w-5" />
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateProfile.isPending}
            >
              <Save className="mr-1.5 h-4 w-4" />{" "}
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
            const stored = (() => {
              try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}"); } catch { return {}; }
            })();
            stored.invoiceTemplate = id;
            localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));
          }}
        />

        {/* Business Profile */}
        <Card id="business-profile" className="border-none shadow-sm scroll-mt-20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Business Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Your Name</Label>
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Role</Label>
                <Input
                  readOnly
                  value={user?.role ?? "—"}
                  className="bg-muted/50 text-muted-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  type="email"
                  placeholder="email@business.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tenant / Business ID</Label>
                <Input
                  readOnly
                  value={user?.tenantId ?? "—"}
                  className="bg-muted/50 font-mono text-xs text-muted-foreground"
                />
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              GST & Legal Details
            </p>
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
                  onChange={(e) => setBizPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
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
            <p className="text-xs text-muted-foreground mt-1">
              Printed on every invoice PDF footer — customers use these for NEFT/IMPS transfers.
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
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase().trim())}
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
            {/* Round-off toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Round off invoice total</p>
                <p className="text-xs text-muted-foreground">
                  Rounds grand total to nearest rupee — prints ±paise difference on PDF
                </p>
              </div>
              <Switch checked={roundOff} onCheckedChange={setRoundOff} />
            </div>
            {/* Composition Scheme toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">GST Composition Scheme</p>
                <p className="text-xs text-muted-foreground">
                  Section 10 dealer — 1% flat tax on turnover. Invoices will show Composition Tax instead of CGST/SGST.
                </p>
              </div>
              <Switch checked={compositionScheme} onCheckedChange={setCompositionScheme} />
            </div>
            {/* Terms & Conditions */}
            <div className="space-y-1.5">
              <Label className="text-xs">Terms & Conditions (printed on invoice)</Label>
              <textarea
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="e.g. Payment due within 30 days. Goods once sold will not be taken back."
                rows={3}
                maxLength={500}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
              <p className="text-[11px] text-muted-foreground">{termsAndConditions.length}/500 characters</p>
            </div>
          </CardContent>
        </Card>

        {/* UPI Auto-Detect — Razorpay Sound Box */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-yellow-500" />
              UPI Auto-Detect (Sound Box)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">How it works</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
                <li>Connect your Razorpay account to Execora.</li>
                <li>
                  When a customer pays via UPI (GPay, PhonePe, Paytm), Razorpay
                  calls our webhook.
                </li>
                <li>
                  Execora announces "
                  <span className="font-semibold text-foreground">
                    Rupaye X mile from Customer
                  </span>
                  " — like a Paytm Sound Box — and auto-records the payment.
                </li>
              </ol>
            </div>

            {/* Step 1: Webhook URL */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 1 — Add this URL in Razorpay Dashboard → Webhooks
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    user?.tenantId
                      ? `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/razorpay/${user.tenantId}`
                      : "Save settings to generate URL"
                  }
                  className="font-mono text-xs bg-muted select-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (!user?.tenantId) return;
                    void navigator.clipboard.writeText(
                      `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/razorpay/${user.tenantId}`,
                    );
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Subscribe to events:{" "}
                <span className="font-medium text-foreground">
                  payment.captured
                </span>{" "}
                and{" "}
                <span className="font-medium text-foreground">
                  payment_link.paid
                </span>
              </p>
            </div>

            {/* Step 2: Webhook secret */}
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 2 — Paste Razorpay Webhook Secret here
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={razorpaySecret}
                  onChange={(e) => setRazorpaySecret(e.target.value.trim())}
                  placeholder="whsec_xxxxxxxxxxxxxxxx"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Found in Razorpay Dashboard → Settings → Webhooks → your webhook
                → Secret. Click Save below to store it.
              </p>
            </div>

            {/* Test trigger */}
            <div className="rounded-xl border border-dashed p-3 text-center">
              <p className="mb-2 text-xs text-muted-foreground">
                Once configured, test it:
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  import("@/lib/ws").then(({ wsClient }) => {
                    (
                      wsClient as unknown as {
                        emit?: (t: string, p: unknown) => void;
                      }
                    ).emit?.("payment:recorded", {
                      amount: 500,
                      customerName: "Test Customer",
                    });
                  });
                  // Direct DOM simulation via the global WS client
                  const evt = new MessageEvent("message", {
                    data: JSON.stringify({
                      type: "payment:recorded",
                      amount: 500,
                      customerName: "Test Customer",
                    }),
                  });
                  window.dispatchEvent(
                    new CustomEvent("__payment_test__", {
                      detail: {
                        amount: 500,
                        customerName: "Test Customer",
                        source: "razorpay",
                      },
                    }),
                  );
                  toast({
                    title: "🔊 Testing sound box…",
                    description: "You should hear the announcement.",
                  });
                }}
              >
                🔊 Preview Announcement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PhonePe Business Sound Box */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-purple-500" />
              PhonePe Business (Sound Box)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-purple-200/50 bg-purple-50/50 dark:bg-purple-950/20 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                PhonePe Business Webhook
              </p>
              <p className="mt-1 text-xs">
                Customers paying via any UPI app (GPay, BHIM, WhatsApp Pay) to
                your PhonePe Business VPA will trigger the sound box
                announcement.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 1 — Add this URL in PhonePe Business Developer Portal →
                Webhooks
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    user?.tenantId
                      ? `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/phonepe/${user.tenantId}`
                      : "Save settings to generate URL"
                  }
                  className="font-mono text-xs bg-muted select-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (!user?.tenantId) return;
                    void navigator.clipboard.writeText(
                      `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/phonepe/${user.tenantId}`,
                    );
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Subscribe to event:{" "}
                <span className="font-medium text-foreground">
                  PAYMENT_SUCCESS
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 2 — Paste PhonePe Salt Key here
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={phonepeSecret}
                  onChange={(e) => setPhonepeSecret(e.target.value.trim())}
                  placeholder="PhonePe salt key"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Found in PhonePe Business Developer Portal → API Keys → Salt
                Key. Click Save below to store it.
              </p>
            </div>
            <div className="rounded-xl border border-dashed p-3 text-center">
              <p className="mb-2 text-xs text-muted-foreground">
                Test the announcement:
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("__payment_test__", {
                      detail: {
                        amount: 750,
                        customerName: "Test Customer",
                        source: "phonepe",
                      },
                    }),
                  );
                  toast({
                    title: "🔊 Testing PhonePe sound box…",
                    description: "You should hear the announcement.",
                  });
                }}
              >
                🔊 Preview Announcement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cashfree Payment Sound Box */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-blue-500" />
              Cashfree Payments (Sound Box)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-blue-200/50 bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Cashfree Webhook</p>
              <p className="mt-1 text-xs">
                Cashfree supports UPI, cards, and net-banking. Any successful
                payment will trigger the Execora sound box.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 1 — Add this URL in Cashfree Dashboard → Webhooks
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    user?.tenantId
                      ? `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/cashfree/${user.tenantId}`
                      : "Save settings to generate URL"
                  }
                  className="font-mono text-xs bg-muted select-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (!user?.tenantId) return;
                    void navigator.clipboard.writeText(
                      `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/cashfree/${user.tenantId}`,
                    );
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Subscribe to event:{" "}
                <span className="font-medium text-foreground">
                  PAYMENT_SUCCESS_WEBHOOK
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 2 — Paste Cashfree Webhook Secret here
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={cashfreeSecret}
                  onChange={(e) => setCashfreeSecret(e.target.value.trim())}
                  placeholder="Cashfree webhook secret"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Found in Cashfree Dashboard → Developers → Webhook → Secret.
                Click Save below to store it.
              </p>
            </div>
            <div className="rounded-xl border border-dashed p-3 text-center">
              <p className="mb-2 text-xs text-muted-foreground">
                Test the announcement:
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("__payment_test__", {
                      detail: {
                        amount: 1200,
                        customerName: "Test Customer",
                        source: "cashfree",
                      },
                    }),
                  );
                  toast({
                    title: "🔊 Testing Cashfree sound box…",
                    description: "You should hear the announcement.",
                  });
                }}
              >
                🔊 Preview Announcement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* PayU Sound Box */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-orange-500" />
              PayU Payments (Sound Box)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-orange-200/50 bg-orange-50/50 dark:bg-orange-950/20 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">PayU Webhook</p>
              <p className="mt-1 text-xs">
                PayU processes UPI, cards, EMI, and wallets. Any successful
                payment triggers the Execora sound box announcement.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 1 — Add this URL in PayU Dashboard → Settings → Payment
                Webhook URL
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    user?.tenantId
                      ? `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/payu/${user.tenantId}`
                      : "Save settings to generate URL"
                  }
                  className="font-mono text-xs bg-muted select-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (!user?.tenantId) return;
                    void navigator.clipboard.writeText(
                      `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/payu/${user.tenantId}`,
                    );
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                No event filter needed — PayU sends only successful payment
                callbacks to this URL.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Step 2 — Paste PayU Salt here</Label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={payuSecret}
                  onChange={(e) => setPayuSecret(e.target.value.trim())}
                  placeholder="PayU salt key"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Found in PayU Dashboard → Settings → API Keys → Salt. Click Save
                below to store it.
              </p>
            </div>
            <div className="rounded-xl border border-dashed p-3 text-center">
              <p className="mb-2 text-xs text-muted-foreground">
                Test the announcement:
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("__payment_test__", {
                      detail: {
                        amount: 999,
                        customerName: "Test Customer",
                        source: "payu",
                      },
                    }),
                  );
                  toast({
                    title: "🔊 Testing PayU sound box…",
                    description: "You should hear the announcement.",
                  });
                }}
              >
                🔊 Preview Announcement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Paytm Payment Gateway Sound Box */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-sky-500" />
              Paytm for Business (Sound Box)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-sky-200/50 bg-sky-50/50 dark:bg-sky-950/20 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                Paytm Payment Gateway Webhook
              </p>
              <p className="mt-1 text-xs">
                Accept payments from all UPI apps via Paytm Payment Gateway.
                When STATUS=TXN_SUCCESS, Execora announces the payment.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 1 — Add this URL in Paytm Dashboard → Developer Settings →
                Webhook
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    user?.tenantId
                      ? `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/paytm/${user.tenantId}`
                      : "Save settings to generate URL"
                  }
                  className="font-mono text-xs bg-muted select-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (!user?.tenantId) return;
                    void navigator.clipboard.writeText(
                      `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/paytm/${user.tenantId}`,
                    );
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 2 — Paste Paytm Merchant Key here
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={paytmSecret}
                  onChange={(e) => setPaytmSecret(e.target.value.trim())}
                  placeholder="Paytm merchant key"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Found in Paytm Dashboard → Developer Settings → API Keys →
                Merchant Key.
              </p>
            </div>
            <div className="rounded-xl border border-dashed p-3 text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("__payment_test__", {
                      detail: {
                        amount: 350,
                        customerName: "Test Customer",
                        source: "paytm",
                      },
                    }),
                  );
                  toast({
                    title: "🔊 Testing Paytm sound box…",
                    description: "You should hear the announcement.",
                  });
                }}
              >
                🔊 Preview Announcement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instamojo Sound Box */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-pink-500" />
              Instamojo (Sound Box)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-pink-200/50 bg-pink-50/50 dark:bg-pink-950/20 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Instamojo Webhook</p>
              <p className="mt-1 text-xs">
                Popular with freelancers and small online businesses. Triggers
                on successful UPI / card payments.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 1 — Add this URL in Instamojo Dashboard → Developers →
                Webhook URL
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    user?.tenantId
                      ? `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/instamojo/${user.tenantId}`
                      : "Save settings to generate URL"
                  }
                  className="font-mono text-xs bg-muted select-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (!user?.tenantId) return;
                    void navigator.clipboard.writeText(
                      `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/instamojo/${user.tenantId}`,
                    );
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Event:{" "}
                <span className="font-medium text-foreground">
                  status = Credit
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 2 — Paste Instamojo Private Salt
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={instamojoSalt}
                  onChange={(e) => setInstamojoSalt(e.target.value.trim())}
                  placeholder="Instamojo private salt"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Found in Instamojo Dashboard → Settings → Advanced Settings →
                Private Salt.
              </p>
            </div>
            <div className="rounded-xl border border-dashed p-3 text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("__payment_test__", {
                      detail: {
                        amount: 499,
                        customerName: "Test Customer",
                        source: "instamojo",
                      },
                    }),
                  );
                  toast({
                    title: "🔊 Testing Instamojo sound box…",
                    description: "You should hear the announcement.",
                  });
                }}
              >
                🔊 Preview Announcement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stripe India UPI Sound Box */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-violet-500" />
              Stripe — India UPI (Sound Box)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-violet-200/50 bg-violet-50/50 dark:bg-violet-950/20 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">Stripe Webhook</p>
              <p className="mt-1 text-xs">
                Stripe supports UPI for India. Any{" "}
                <span className="font-medium text-foreground">
                  payment_intent.succeeded
                </span>{" "}
                event with UPI as payment method triggers the sound box.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 1 — Add this URL in Stripe Dashboard → Developers →
                Webhooks
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    user?.tenantId
                      ? `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/stripe/${user.tenantId}`
                      : "Save settings to generate URL"
                  }
                  className="font-mono text-xs bg-muted select-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (!user?.tenantId) return;
                    void navigator.clipboard.writeText(
                      `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/stripe/${user.tenantId}`,
                    );
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Subscribe to:{" "}
                <span className="font-medium text-foreground">
                  payment_intent.succeeded
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 2 — Paste Stripe Webhook Signing Secret
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={stripeSecret}
                  onChange={(e) => setStripeSecret(e.target.value.trim())}
                  placeholder="whsec_xxxxxxxxxxxxxxxx"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Found in Stripe Dashboard → Developers → Webhooks → your
                endpoint → Signing secret.
              </p>
            </div>
            <div className="rounded-xl border border-dashed p-3 text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("__payment_test__", {
                      detail: {
                        amount: 2000,
                        customerName: "Test Customer",
                        source: "stripe",
                      },
                    }),
                  );
                  toast({
                    title: "🔊 Testing Stripe sound box…",
                    description: "You should hear the announcement.",
                  });
                }}
              >
                🔊 Preview Announcement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* EaseBuzz Sound Box */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-teal-500" />
              EaseBuzz (Sound Box)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-teal-200/50 bg-teal-50/50 dark:bg-teal-950/20 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">EaseBuzz Webhook</p>
              <p className="mt-1 text-xs">
                EaseBuzz is a popular Indian payment aggregator supporting UPI,
                cards, and wallets. Uses reverse-hash verification (similar to
                PayU).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 1 — Add this URL in EaseBuzz Dashboard → Settings → Webhook
                URL
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    user?.tenantId
                      ? `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/easebuzz/${user.tenantId}`
                      : "Save settings to generate URL"
                  }
                  className="font-mono text-xs bg-muted select-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (!user?.tenantId) return;
                    void navigator.clipboard.writeText(
                      `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/easebuzz/${user.tenantId}`,
                    );
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 2 — Paste EaseBuzz Salt Key
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={easebuzzSalt}
                  onChange={(e) => setEasebuzzSalt(e.target.value.trim())}
                  placeholder="EaseBuzz salt key"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Found in EaseBuzz Dashboard → Settings → API Keys → Salt.
              </p>
            </div>
            <div className="rounded-xl border border-dashed p-3 text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("__payment_test__", {
                      detail: {
                        amount: 800,
                        customerName: "Test Customer",
                        source: "easebuzz",
                      },
                    }),
                  );
                  toast({
                    title: "🔊 Testing EaseBuzz sound box…",
                    description: "You should hear the announcement.",
                  });
                }}
              >
                🔊 Preview Announcement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* BharatPe Sound Box */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-green-600" />
              BharatPe (Sound Box)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-green-200/50 bg-green-50/50 dark:bg-green-950/20 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                BharatPe Merchant Webhook
              </p>
              <p className="mt-1 text-xs">
                BharatPe pioneered the single-QR model for small merchants. Any
                UPI payment to your BharatPe QR triggers the Execora sound box.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 1 — Add this URL in BharatPe Merchant Dashboard → Settings
                → Webhook URL
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={
                    user?.tenantId
                      ? `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/bharatpe/${user.tenantId}`
                      : "Save settings to generate URL"
                  }
                  className="font-mono text-xs bg-muted select-all"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (!user?.tenantId) return;
                    void navigator.clipboard.writeText(
                      `${window.location.origin.replace(/:\d+$/, ":3001")}/api/v1/webhook/bharatpe/${user.tenantId}`,
                    );
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  }}
                >
                  {urlCopied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Event:{" "}
                <span className="font-medium text-foreground">
                  status = SUCCESS
                </span>
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">
                Step 2 — Paste BharatPe Webhook Secret
              </Label>
              <div className="flex gap-2">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={bharatpeSecret}
                  onChange={(e) => setBharatpeSecret(e.target.value.trim())}
                  placeholder="BharatPe webhook secret"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowSecret((v) => !v)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Contact BharatPe Business support to obtain your webhook secret
                for signature verification.
              </p>
            </div>
            <div className="rounded-xl border border-dashed p-3 text-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("__payment_test__", {
                      detail: {
                        amount: 150,
                        customerName: "Test Customer",
                        source: "bharatpe",
                      },
                    }),
                  );
                  toast({
                    title: "🔊 Testing BharatPe sound box…",
                    description: "You should hear the announcement.",
                  });
                }}
              >
                🔊 Preview Announcement
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Language</Label>
                <Select
                  value={lang}
                  onValueChange={(v) => {
                    setLang(v);
                    localStorage.setItem(LANG_STORAGE_KEY, v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="hindi">हिन्दी</SelectItem>
                    <SelectItem value="tamil">தமிழ்</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Currency</Label>
                <Select defaultValue="inr">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inr">Indian Rupee (₹)</SelectItem>
                    <SelectItem value="usd">US Dollar ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timezone</Label>
                <Select defaultValue="kolkata">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kolkata">
                      Asia/Kolkata (+05:30)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date Format</Label>
                <Select defaultValue="dd">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dd">DD/MM/YYYY</SelectItem>
                    <SelectItem value="mm">MM/DD/YYYY</SelectItem>
                    <SelectItem value="yy">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI & Voice Features */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              AI & Voice Features
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Disable to use Execora as a pure billing software without AI. Voice tab and assistant will be hidden.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Master AI toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Enable AI Voice Assistant</p>
                <p className="text-xs text-muted-foreground">
                  Turn off to hide Voice tab and disable all AI features — billing still works fully
                </p>
              </div>
              <Switch
                checked={aiEnabled}
                onCheckedChange={(v) => {
                  setAiEnabled(v);
                  localStorage.setItem(
                    BIZ_STORAGE_KEY,
                    JSON.stringify({
                      ...(() => { try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}"); } catch { return {}; } })(),
                      aiEnabled: v,
                    }),
                  );
                  // Reload so navigation re-evaluates
                  setTimeout(() => window.location.reload(), 300);
                }}
              />
            </div>

            {aiEnabled && (
            <div className="space-y-1.5">
              <Label className="text-xs">Text-to-Speech Provider</Label>
              <Select
                value={ttsProvider}
                onValueChange={(v) => {
                  setTtsProvider(v);
                  localStorage.setItem(TTS_STORAGE_KEY, v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">
                    Browser Speech (Free · built-in)
                  </SelectItem>
                  <SelectItem value="elevenlabs">
                    ElevenLabs (High quality · Indian voices)
                  </SelectItem>
                  <SelectItem value="openai">
                    OpenAI TTS (Fast · multilingual)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls which engine speaks the AI responses. ElevenLabs and
                OpenAI require API keys configured on the server.
              </p>
            </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  key: "whatsapp" as const,
                  label: "Enable WhatsApp Notifications",
                },
                { key: "email" as const, label: "Enable Email Notifications" },
                { key: "sms" as const, label: "Enable SMS Notifications" },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between">
                  <Label className="text-sm">{n.label}</Label>
                  <Switch
                    checked={notifications[n.key]}
                    onCheckedChange={(v) =>
                      setNotifications((p) => ({ ...p, [n.key]: v }))
                    }
                  />
                </div>
              ))}
            </div>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Remind me for:
            </p>
            <div className="space-y-3">
              {[
                {
                  key: "duePayments" as const,
                  label: "Due payments (7 days before)",
                },
                {
                  key: "lowStock" as const,
                  label: "Low stock (when below minimum)",
                },
                {
                  key: "dailySummary" as const,
                  label: "Daily summary (7:30 PM)",
                },
                {
                  key: "newCustomer" as const,
                  label: "New customer registration",
                },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between">
                  <Label className="text-sm">{n.label}</Label>
                  <Switch
                    checked={notifications[n.key]}
                    onCheckedChange={(v) =>
                      setNotifications((p) => ({ ...p, [n.key]: v }))
                    }
                  />
                </div>
              ))}
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
              When a toggle is <strong>ON</strong>, the invoice PDF is sent
              automatically the moment you confirm a bill. Toggle{" "}
              <strong>OFF</strong> = no auto-send (you can still send manually
              from the invoice detail page).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email toggle */}
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
              <Switch
                checked={autoSendEmail}
                onCheckedChange={setAutoSendEmail}
              />
            </div>

            {/* WhatsApp toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/10">
                  <MessageCircle className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">Auto-send via WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Sends PDF document to customer's WhatsApp on invoice confirm
                  </p>
                </div>
              </div>
              <Switch
                checked={autoSendWhatsApp}
                onCheckedChange={setAutoSendWhatsApp}
              />
            </div>

            {!autoSendEmail && !autoSendWhatsApp && (
              <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                ⚠️ Both channels are off — invoices will not be sent
                automatically. Use the "Send" button on the invoice detail page
                to deliver manually.
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
                    const stored = (() => {
                      try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}"); } catch { return {}; }
                    })();
                    stored.invoiceTemplate = t.id;
                    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoice Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Invoice Prefix</Label>
                <Input defaultValue="INV-" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Next Invoice Number</Label>
                <Input defaultValue="237" type="number" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default Payment Terms</Label>
                <Select defaultValue="15">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="15">15 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default Tax Rate</Label>
                <Select defaultValue="5">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (No Tax)</SelectItem>
                    <SelectItem value="5">5% (GST)</SelectItem>
                    <SelectItem value="12">12% (GST)</SelectItem>
                    <SelectItem value="18">18% (GST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Invoice Footer</Label>
              <Input defaultValue="Thank you for your business!" />
            </div>
          </CardContent>
        </Card>

        {/* Users & Permissions */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Users & Permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {usersLoading && (
              <p className="text-xs text-muted-foreground">Loading users…</p>
            )}
            {teamUsers.map((u) => {
              const isMe = u.id === me?.id;
              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {u.name}
                      {isMe && (
                        <span className="ml-1 text-muted-foreground">
                          (You)
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0"
                      >
                        {u.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {u.email}
                      </span>
                    </div>
                  </div>
                  {!isMe && (
                    <button
                      onClick={() => handleRemoveUser(u.id, u.name)}
                      className="ml-2 shrink-0 rounded p-1.5 text-destructive/50 hover:bg-destructive/10 hover:text-destructive"
                      title="Remove user"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
            {teamUsers.length === 0 && !usersLoading && (
              <p className="text-xs text-muted-foreground">
                No staff accounts yet.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddUserOpen(true)}
              >
                <UserPlus className="mr-1.5 h-4 w-4" /> Add User
              </Button>
              <Button variant="outline" size="sm" disabled>
                <ShieldCheck className="mr-1.5 h-4 w-4" /> Manage Roles
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data & Backup */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Data & Backup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  Last Backup: 21 Feb 2026 01:00 AM
                </p>
                <p className="text-xs text-primary">✓ Successful</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Storage Used</span>
                <span>245 MB / 1 GB</span>
              </div>
              <Progress value={24.5} className="h-2" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <HardDrive className="mr-1.5 h-4 w-4" /> Backup Now
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-4 w-4" /> Export Data
              </Button>
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-1.5 h-4 w-4" /> Sync Now
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="pb-6" />
      </main>

      {/* Add User Dialog */}
      <Dialog
        open={addUserOpen}
        onOpenChange={(v) => {
          setAddUserOpen(v);
          if (!v) resetAddUser();
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Staff Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs">Full Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ramesh Kumar"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="staff@yourbusiness.com"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone (optional)</Label>
              <Input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="9876543210"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as typeof newRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">
                    Manager — full access except settings
                  </SelectItem>
                  <SelectItem value="staff">
                    Staff — billing + inventory
                  </SelectItem>
                  <SelectItem value="viewer">
                    Viewer — read-only reports
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">
                Temporary Password * (min 8 chars)
              </Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                minLength={8}
                required
              />
              <p className="text-[11px] text-muted-foreground">
                They can change it after first login.
              </p>
            </div>
            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddUserOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending ? "Adding…" : "Add User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
