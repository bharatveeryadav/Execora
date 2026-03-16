/**
 * Barcode Settings — format (EAN-13, QR, Code128)
 */
import { useState, useEffect } from "react";
import { Save, Barcode } from "lucide-react";
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

const BIZ_STORAGE_KEY = "execora:bizprofile";

type BarcodeFormat = "ean13" | "code128" | "qr";

function readStored() {
  try {
    return JSON.parse(localStorage.getItem(BIZ_STORAGE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

export default function SettingsGeneralBarcode() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>("ean13");

  useEffect(() => {
    const stored = readStored();
    const s = (me?.tenant as unknown as { settings?: Record<string, string> })?.settings ?? {};
    const v = stored.barcodeFormat ?? s.barcodeFormat ?? "ean13";
    setBarcodeFormat((v === "code128" || v === "qr" ? v : "ean13") as BarcodeFormat);
  }, [me]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const stored = readStored();
    stored.barcodeFormat = barcodeFormat;
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));

    try {
      await updateProfile.mutateAsync({
        tenant: { settings: { barcodeFormat } },
      });
      toast({ title: "Barcode settings saved" });
    } catch {
      toast({ title: "Saved locally; sync failed", variant: "destructive" });
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Barcode className="h-4 w-4" />
          Barcode Settings
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Default format for product barcodes. Used when scanning or generating barcodes.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Default Barcode Format</Label>
            <Select
              value={barcodeFormat}
              onValueChange={(v) => setBarcodeFormat(v as BarcodeFormat)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ean13">EAN-13 (13 digits, retail)</SelectItem>
                <SelectItem value="code128">Code 128 (alphanumeric)</SelectItem>
                <SelectItem value="qr">QR Code</SelectItem>
              </SelectContent>
            </Select>
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
