/**
 * Auto Reminders — schedule for payment due, overdue reminders
 */
import { useState, useEffect } from "react";
import { Save, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMe, useUpdateProfile } from "@/hooks/useQueries";
import { useToast } from "@/hooks/use-toast";

type ReminderType = "due_soon" | "overdue_3d" | "overdue_7d" | "overdue_30d";
type Channel = "whatsapp" | "email" | "both";

interface ReminderConfig {
  enabled: boolean;
  channel: Channel;
  daysBefore?: number;
}

const DEFAULT_REMINDER_CONFIG: Record<ReminderType, ReminderConfig> = {
  due_soon: { enabled: true, channel: "both", daysBefore: 3 },
  overdue_3d: { enabled: true, channel: "both" },
  overdue_7d: { enabled: true, channel: "whatsapp" },
  overdue_30d: { enabled: false, channel: "email" },
};

function parseReminderConfig(raw: unknown): Record<ReminderType, ReminderConfig> {
  if (!raw || typeof raw !== "object") return DEFAULT_REMINDER_CONFIG;
  const obj = raw as Record<string, unknown>;
  const result = { ...DEFAULT_REMINDER_CONFIG };
  for (const key of Object.keys(DEFAULT_REMINDER_CONFIG) as ReminderType[]) {
    const v = obj[key];
    if (v && typeof v === "object" && "enabled" in v) {
      result[key] = {
        enabled: Boolean((v as ReminderConfig).enabled),
        channel: ((v as ReminderConfig).channel as Channel) || "both",
        daysBefore: (v as ReminderConfig).daysBefore,
      };
    }
  }
  return result;
}

export default function SettingsGeneralAutoReminders() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [config, setConfig] = useState<Record<ReminderType, ReminderConfig>>(DEFAULT_REMINDER_CONFIG);

  useEffect(() => {
    const s = (me?.tenant as unknown as { settings?: Record<string, unknown> })?.settings ?? {};
    const raw = s.reminderConfig;
    setConfig(parseReminderConfig(raw));
  }, [me]);

  const updateReminder = (type: ReminderType, patch: Partial<ReminderConfig>) => {
    setConfig((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...patch },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync({
        tenant: { settings: { reminderConfig: config } },
      });
      toast({ title: "Reminder settings saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const REMINDER_LABELS: Record<ReminderType, string> = {
    due_soon: "Payment due soon (3 days before)",
    overdue_3d: "Overdue 3 days",
    overdue_7d: "Overdue 7 days",
    overdue_30d: "Overdue 30 days",
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Auto Reminders
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Configure when and how customers receive payment reminders.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          {(Object.keys(REMINDER_LABELS) as ReminderType[]).map((type) => (
            <div
              key={type}
              className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1">
                <Label className="text-sm font-medium">{REMINDER_LABELS[type]}</Label>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={config[type].channel}
                  onValueChange={(v) => updateReminder(type, { channel: v as Channel })}
                >
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">On</Label>
                  <Switch
                    checked={config[type].enabled}
                    onCheckedChange={(v) => updateReminder(type, { enabled: v })}
                  />
                </div>
              </div>
            </div>
          ))}
          <Button type="submit" size="sm" disabled={updateProfile.isPending}>
            <Save className="mr-1.5 h-4 w-4" />
            {updateProfile.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
