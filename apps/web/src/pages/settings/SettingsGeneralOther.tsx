/**
 * Other — misc general settings
 */
import { useState, useEffect } from "react";
import { Save, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useMe, useUpdateProfile } from "@/hooks/useQueries";
import { useToast } from "@/hooks/use-toast";

const BIZ_STORAGE_KEY = "execora:bizprofile";

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default function SettingsGeneralOther() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [showGstinOnReceipt, setShowGstinOnReceipt] = useState(true);

  useEffect(() => {
    const stored = readStored();
    const s = (me?.tenant as unknown as { settings?: Record<string, unknown> })?.settings ?? {};
    setShowGstinOnReceipt(
      stored.showGstinOnReceipt !== false && s.showGstinOnReceipt !== "false",
    );
  }, [me]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const stored = readStored();
    stored.showGstinOnReceipt = showGstinOnReceipt;
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));

    try {
      await updateProfile.mutateAsync({
        tenant: {
          settings: {
            showGstinOnReceipt: String(showGstinOnReceipt),
          },
        },
      });
      toast({ title: "Settings saved" });
    } catch {
      toast({ title: "Saved locally; sync failed", variant: "destructive" });
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Other Settings
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Miscellaneous display and behaviour options.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label className="text-sm font-medium">Show GSTIN on receipt</Label>
              <p className="text-xs text-muted-foreground">
                Display business GSTIN on thermal receipts
              </p>
            </div>
            <Switch
              checked={showGstinOnReceipt}
              onCheckedChange={setShowGstinOnReceipt}
            />
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
