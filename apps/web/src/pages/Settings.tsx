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
  TemplateThumbnail,
  TEMPLATES,
  type TemplateId,
} from "@/components/InvoiceTemplatePreview";
import { useNavigate } from "react-router-dom";
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
  const [bizUpiVpa, setBizUpiVpa] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").upiVpa ?? ""
      );
    } catch {
      return "";
    }
  });
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
  const [invoiceTemplate, setInvoiceTemplate] = useState<TemplateId>(
    () => (localStorage.getItem("inv_template") as TemplateId) ?? "classic",
  );

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
      if (!stored.upiVpa && s.upiVpa) setBizUpiVpa(s.upiVpa);
      if (stored.autoSendEmail === undefined && s.autoSendEmail !== undefined)
        setAutoSendEmail(s.autoSendEmail !== "false");
      if (
        stored.autoSendWhatsApp === undefined &&
        s.autoSendWhatsApp !== undefined
      )
        setAutoSendWhatsApp(s.autoSendWhatsApp !== "false");
    }
    if (me?.name && !profileName) setProfileName(me.name);
  }, [me]);

  const handleSave = async () => {
    // Always persist to localStorage for offline / PDF use
    localStorage.setItem(
      BIZ_STORAGE_KEY,
      JSON.stringify({
        gstin: bizGstin,
        legalName: bizLegalName,
        phone: bizPhone,
        address: bizAddress,
        upiVpa: bizUpiVpa,
        autoSendEmail,
        autoSendWhatsApp,
      }),
    );
    localStorage.setItem(LANG_STORAGE_KEY, lang);

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
            upiVpa: bizUpiVpa,
            autoSendEmail: String(autoSendEmail),
            autoSendWhatsApp: String(autoSendWhatsApp),
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
        {/* Business Profile */}
        <Card className="border-none shadow-sm">
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
              <div className="space-y-1.5">
                <Label className="text-xs">Business Address</Label>
                <Input
                  value={bizAddress}
                  onChange={(e) => setBizAddress(e.target.value)}
                  placeholder="Street, City, State, PIN"
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

        {/* Voice Assistant */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              Voice Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                  Email + WhatsApp ON
                </span>
              ) : autoSendEmail ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
                  Email only
                </span>
              ) : autoSendWhatsApp ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
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
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-50 dark:bg-green-900/30">
                  <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
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
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                ⚠️ Both channels are off — invoices will not be sent
                automatically. Use the "Send" button on the invoice detail page
                to deliver manually.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Invoice Template */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoice Template</CardTitle>
            <p className="text-xs text-muted-foreground">
              Choose how your printed and PDF invoices look. You can also switch templates inside Classic Billing.
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
