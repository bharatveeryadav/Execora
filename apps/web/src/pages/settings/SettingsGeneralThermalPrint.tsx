/**
 * Thermal Print Settings — 58mm/80mm width, header, footer
 */
import { useState, useEffect } from "react";
import { Save, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const BIZ_STORAGE_KEY = "execora:bizprofile";

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}") as Record<string, string | number>;
  } catch {
    return {};
  }
}

export default function SettingsGeneralThermalPrint() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [thermalWidth, setThermalWidth] = useState<58 | 80>(80);
  const [thermalHeader, setThermalHeader] = useState("");
  const [thermalFooter, setThermalFooter] = useState("Thank you!");

  useEffect(() => {
    const stored = readStored();
    const s = (me?.tenant as unknown as { settings?: Record<string, string | number> })?.settings ?? {};
    const w = stored.thermalWidth ?? s.thermalWidth ?? 80;
    setThermalWidth(Number(w) === 58 ? 58 : 80);
    setThermalHeader(String(stored.thermalHeader ?? s.thermalHeader ?? ""));
    setThermalFooter(String(stored.thermalFooter ?? s.thermalFooter ?? "Thank you!"));
  }, [me]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const stored = readStored();
    stored.thermalWidth = thermalWidth;
    stored.thermalHeader = thermalHeader;
    stored.thermalFooter = thermalFooter;
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));

    try {
      await updateProfile.mutateAsync({
        tenant: {
          settings: {
            thermalWidth,
            thermalHeader,
            thermalFooter,
          },
        },
      });
      toast({ title: "Thermal print settings saved" });
    } catch {
      toast({ title: "Saved locally; sync failed", variant: "destructive" });
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Thermal Print Settings
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Configure receipt layout for 58mm or 80mm thermal printers. Use Print from billing to output.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Paper Width</Label>
            <Select
              value={String(thermalWidth)}
              onValueChange={(v) => setThermalWidth(v === "58" ? 58 : 80)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58">58mm (32 chars/line)</SelectItem>
                <SelectItem value="80">80mm (48 chars/line)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Custom Header (optional)</Label>
            <Input
              value={thermalHeader}
              onChange={(e) => setThermalHeader(e.target.value)}
              placeholder="e.g. Visit again!"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Footer Text</Label>
            <Input
              value={thermalFooter}
              onChange={(e) => setThermalFooter(e.target.value)}
              placeholder="Thank you!"
              maxLength={80}
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
