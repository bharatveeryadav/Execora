/**
 * Preferences — date format, currency, language, FY start
 */
import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMe, useUpdateProfile } from "@/hooks/useQueries";
import { useToast } from "@/hooks/use-toast";

const LANG_STORAGE_KEY = "execora:lang";

export default function SettingsGeneralPreferences() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [language, setLanguage] = useState("english");
  const [dateFormat, setDateFormat] = useState("dd");
  const [currency, setCurrency] = useState("inr");
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  useEffect(() => {
    const stored = (() => {
      try {
        return JSON.parse(localStorage.getItem("execora:bizprofile") ?? "{}") as Record<string, string>;
      } catch {
        return {};
      }
    })();
    const s = (me?.tenant as unknown as { settings?: Record<string, string> })?.settings ?? {};
    setLanguage(
      localStorage.getItem(LANG_STORAGE_KEY) ?? stored.language ?? s.language ?? "english",
    );
    setDateFormat(stored.dateFormat ?? s.dateFormat ?? "dd");
    setCurrency(
      (me?.tenant as unknown as { currency?: string })?.currency ??
        stored.currency ??
        s.currency ??
        "inr",
    );
    setTimezone(
      (me?.tenant as unknown as { timezone?: string })?.timezone ?? stored.timezone ?? "Asia/Kolkata",
    );
  }, [me]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem(LANG_STORAGE_KEY, language);

    const stored = (() => {
      try {
        return JSON.parse(localStorage.getItem("execora:bizprofile") ?? "{}") as Record<string, string>;
      } catch {
        return {};
      }
    })();
    stored.language = language;
    stored.dateFormat = dateFormat;
    stored.currency = currency;
    localStorage.setItem("execora:bizprofile", JSON.stringify(stored));

    try {
      await updateProfile.mutateAsync({
        tenant: {
          language,
          timezone,
          dateFormat,
          currency,
        },
      });
      toast({ title: "Preferences saved" });
    } catch {
      toast({ title: "Saved locally; sync failed", variant: "destructive" });
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Preferences</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Default display and formatting options.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
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
              <Select value={currency} onValueChange={setCurrency}>
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
              <Label className="text-xs">Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
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
            <div className="space-y-1.5">
              <Label className="text-xs">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asia/Kolkata">Asia/Kolkata (+05:30)</SelectItem>
                  <SelectItem value="Asia/Dubai">Asia/Dubai (+04:00)</SelectItem>
                  <SelectItem value="America/New_York">America/New York (-05:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" size="sm" disabled={updateProfile.isPending}>
            <Save className="mr-1.5 h-4 w-4" />
            {updateProfile.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
