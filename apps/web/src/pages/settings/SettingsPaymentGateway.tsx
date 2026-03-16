/**
 * Payment Gateway — API keys & webhook URLs for Razorpay, PhonePe, etc.
 */
import { useState, useEffect } from "react";
import { Save, Copy, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useMe, useUpdateProfile } from "@/hooks/useQueries";
import { useToast } from "@/hooks/use-toast";

const getApiBase = () =>
  (import.meta.env.VITE_API_BASE_URL ?? window.location.origin).replace(/:\d+$/, ":3001");

export default function SettingsPaymentGateway() {
  const { user } = useAuth();
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [razorpaySecret, setRazorpaySecret] = useState("");
  const [phonepeSecret, setPhonepeSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    const s = (me?.tenant as unknown as { settings?: Record<string, string> })?.settings ?? {};
    setRazorpaySecret(s.razorpayWebhookSecret ?? "");
    setPhonepeSecret(s.phonepeWebhookSecret ?? "");
  }, [me]);

  const webhookUrl = (gateway: string) =>
    user?.tenantId ? `${getApiBase()}/api/v1/webhook/${gateway}/${user.tenantId}` : "";

  const copyUrl = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setUrlCopied(true);
    toast({ title: "URL copied" });
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        tenant: {
          settings: {
            ...(razorpaySecret ? { razorpayWebhookSecret: razorpaySecret } : {}),
            ...(phonepeSecret ? { phonepeWebhookSecret: phonepeSecret } : {}),
          },
        },
      });
      toast({ title: "Payment gateway settings saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Razorpay Webhook</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Add this URL in Razorpay Dashboard → Webhooks. Paste the webhook secret below.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl("razorpay")}
                className="font-mono text-xs bg-muted select-all"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyUrl(webhookUrl("razorpay"))}
              >
                {urlCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Webhook Secret</Label>
            <div className="flex gap-2">
              <Input
                type={showSecret ? "text" : "password"}
                value={razorpaySecret}
                onChange={(e) => setRazorpaySecret(e.target.value.trim())}
                placeholder="whsec_..."
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={() => setShowSecret((v) => !v)}>
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">PhonePe Webhook</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Add this URL in PhonePe Business Developer Portal → Webhooks. Paste the Salt Key.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl("phonepe")}
                className="font-mono text-xs bg-muted select-all"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyUrl(webhookUrl("phonepe"))}
              >
                {urlCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Salt Key</Label>
            <Input
              type={showSecret ? "text" : "password"}
              value={phonepeSecret}
              onChange={(e) => setPhonepeSecret(e.target.value.trim())}
              placeholder="PhonePe salt key"
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave}>
        <Button type="submit" size="sm" disabled={updateProfile.isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {updateProfile.isPending ? "Saving…" : "Save"}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        For Cashfree, PayU, Paytm, and other gateways, configure them in Company Profile (Settings → Profile → Company Profile).
      </p>
    </div>
  );
}
