/**
 * Terms & Conditions — printed on invoice PDF
 */
import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe, useUpdateProfile } from "@/hooks/useQueries";
import { useToast } from "@/hooks/use-toast";

const BIZ_STORAGE_KEY = "execora:bizprofile";

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export default function SettingsGeneralTerms() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [termsAndConditions, setTermsAndConditions] = useState("");

  useEffect(() => {
    const stored = readStored();
    const s = (me?.tenant as unknown as { settings?: Record<string, string> })?.settings ?? {};
    setTermsAndConditions(stored.termsAndConditions ?? s.termsAndConditions ?? "");
  }, [me]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const stored = readStored();
    stored.termsAndConditions = termsAndConditions;
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));

    try {
      await updateProfile.mutateAsync({
        tenant: { settings: { termsAndConditions } },
      });
      toast({ title: "Terms & conditions saved" });
    } catch {
      toast({ title: "Saved locally; sync failed", variant: "destructive" });
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Terms & Conditions</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Printed on every invoice PDF. Use for payment terms, return policy, etc.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Terms (max 500 characters)</Label>
            <textarea
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              placeholder="e.g. Payment due within 30 days. Goods once sold will not be taken back."
              rows={4}
              maxLength={500}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              {termsAndConditions.length}/500 characters
            </p>
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
