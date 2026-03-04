import { useState, useEffect } from "react";
import { ArrowLeft, Mic, Save, UserPlus, Users, HardDrive, Download, RefreshCw, Volume2, Moon, Sun, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useMe, useUpdateProfile } from "@/hooks/useQueries";

const TTS_STORAGE_KEY = "execora:ttsProvider";
const BIZ_STORAGE_KEY = "execora:bizprofile";

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();

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
  const [bizGstin, setBizGstin]         = useState(() => {
    try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").gstin ?? me?.tenant?.gstin ?? ""; } catch { return ""; }
  });
  const [bizLegalName, setBizLegalName] = useState(() => {
    try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").legalName ?? me?.tenant?.legalName ?? me?.tenant?.name ?? ""; } catch { return ""; }
  });
  const [bizPhone, setBizPhone]         = useState(() => {
    try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").phone ?? ""; } catch { return ""; }
  });
  const [bizAddress, setBizAddress]     = useState(() => {
    try { return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}").address ?? ""; } catch { return ""; }
  });

  // Sync with me?.tenant once loaded
  useEffect(() => {
    if (me?.tenant) {
      const stored = JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}");
      if (!stored.gstin && me.tenant.gstin) setBizGstin(me.tenant.gstin);
      if (!stored.legalName && (me.tenant.legalName || me.tenant.name)) setBizLegalName(me.tenant.legalName ?? me.tenant.name ?? "");
    }
  }, [me?.tenant]);

  const handleSave = async () => {
    // Save business profile to localStorage
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify({ gstin: bizGstin, legalName: bizLegalName, phone: bizPhone, address: bizAddress }));

    if (profileName && (profileName !== user?.name || profileEmail !== user?.email)) {
      try {
        await updateProfile.mutateAsync({ name: profileName });
        toast({ title: "✅ Settings saved", description: "Your profile has been updated." });
      } catch {
        toast({ title: "✅ Settings saved", description: "Preferences updated locally." });
      }
    } else {
      toast({ title: "✅ Settings saved", description: "Your changes have been saved successfully." });
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
            <h1 className="text-lg font-bold tracking-tight md:text-xl">⚙️ Settings</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Button variant="ghost" size="icon"><Mic className="h-5 w-5" /></Button>
            <Button size="sm" onClick={handleSave} disabled={updateProfile.isPending}>
              <Save className="mr-1.5 h-4 w-4" /> {updateProfile.isPending ? "Saving…" : "Save"}
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
                <Input readOnly value={user?.role ?? "—"} className="bg-muted/50 text-muted-foreground" />
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
                <Input readOnly value={user?.tenantId ?? "—"} className="bg-muted/50 font-mono text-xs text-muted-foreground" />
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GST & Legal Details</p>
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
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Language</Label>
                <Select defaultValue="english">
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inr">Indian Rupee (₹)</SelectItem>
                    <SelectItem value="usd">US Dollar ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timezone</Label>
                <Select defaultValue="kolkata">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kolkata">Asia/Kolkata (+05:30)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Date Format</Label>
                <Select defaultValue="dd">
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="browser">Browser Speech (Free · built-in)</SelectItem>
                  <SelectItem value="elevenlabs">ElevenLabs (High quality · Indian voices)</SelectItem>
                  <SelectItem value="openai">OpenAI TTS (Fast · multilingual)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls which engine speaks the AI responses. ElevenLabs and OpenAI require API keys configured on the server.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { key: "whatsapp" as const, label: "Enable WhatsApp Notifications" },
                { key: "email" as const, label: "Enable Email Notifications" },
                { key: "sms" as const, label: "Enable SMS Notifications" },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between">
                  <Label className="text-sm">{n.label}</Label>
                  <Switch checked={notifications[n.key]} onCheckedChange={(v) => setNotifications((p) => ({ ...p, [n.key]: v }))} />
                </div>
              ))}
            </div>
            <Separator />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Remind me for:</p>
            <div className="space-y-3">
              {[
                { key: "duePayments" as const, label: "Due payments (7 days before)" },
                { key: "lowStock" as const, label: "Low stock (when below minimum)" },
                { key: "dailySummary" as const, label: "Daily summary (7:30 PM)" },
                { key: "newCustomer" as const, label: "New customer registration" },
              ].map((n) => (
                <div key={n.key} className="flex items-center justify-between">
                  <Label className="text-sm">{n.label}</Label>
                  <Switch checked={notifications[n.key]} onCheckedChange={(v) => setNotifications((p) => ({ ...p, [n.key]: v }))} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Invoice Settings</CardTitle></CardHeader>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
          <CardHeader className="pb-3"><CardTitle className="text-base">Users & Permissions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { name: "Ramesh Kumar", role: "Owner", extra: "(You)", date: "" },
              { name: "Suresh Patel", role: "Cashier", extra: "", date: "Added 15 Feb 2026" },
              { name: "Rajesh Singh", role: "Staff", extra: "", date: "Added 10 Jan 2026" },
            ].map((u) => (
              <div key={u.name} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm font-medium">{u.name} {u.extra && <span className="text-muted-foreground">{u.extra}</span>}</p>
                  <p className="text-xs text-muted-foreground">{u.role} {u.date && `· ${u.date}`}</p>
                </div>
                {!u.extra && (
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="text-xs">Edit</Button>
                    <Button variant="ghost" size="sm" className="text-xs text-destructive">Remove</Button>
                  </div>
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm"><UserPlus className="mr-1.5 h-4 w-4" /> Add User</Button>
              <Button variant="outline" size="sm"><Users className="mr-1.5 h-4 w-4" /> Manage Roles</Button>
            </div>
          </CardContent>
        </Card>

        {/* Data & Backup */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Data & Backup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Last Backup: 21 Feb 2026 01:00 AM</p>
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
              <Button variant="outline" size="sm"><HardDrive className="mr-1.5 h-4 w-4" /> Backup Now</Button>
              <Button variant="outline" size="sm"><Download className="mr-1.5 h-4 w-4" /> Export Data</Button>
              <Button variant="outline" size="sm"><RefreshCw className="mr-1.5 h-4 w-4" /> Sync Now</Button>
            </div>
          </CardContent>
        </Card>

        <div className="pb-6" />
      </main>
    </div>
  );
};

export default Settings;
