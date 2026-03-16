/**
 * Signatures — upload owner signature image for PDF
 */
import { useState, useRef } from "react";
import { Save, FileSignature, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMe, useUpdateProfile } from "@/hooks/useQueries";
import { useToast } from "@/hooks/use-toast";

export default function SettingsGeneralSignatures() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [pendingDataUrl, setPendingDataUrl] = useState<string | null>(null);

  const s = (me?.tenant as unknown as { settings?: Record<string, string> })?.settings ?? {};
  const serverUrl = s.signatureImageUrl ?? null;
  const currentUrl = pendingDataUrl ?? signatureUrl ?? serverUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPendingDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemove = () => {
    setPendingDataUrl(null);
    setSignatureUrl(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const toSave = pendingDataUrl ?? signatureUrl ?? s.signatureImageUrl ?? "";
    if (!toSave) return;
    try {
      await updateProfile.mutateAsync({
        tenant: { settings: { signatureImageUrl: toSave } },
      });
      setSignatureUrl(toSave);
      setPendingDataUrl(null);
      toast({ title: "Signature saved" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  const handleRemoveAndSave = async () => {
    try {
      await updateProfile.mutateAsync({
        tenant: { settings: { signatureImageUrl: "" } },
      });
      handleRemove();
      toast({ title: "Signature removed" });
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSignature className="h-4 w-4" />
          Owner Signature
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Upload your signature to appear on invoice PDFs. PNG or JPG, transparent background works best.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="w-48 h-24 rounded-lg border border-dashed bg-muted/30 flex items-center justify-center overflow-hidden">
            {currentUrl ? (
              <img
                src={currentUrl}
                alt="Signature"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <span className="text-xs text-muted-foreground">No signature</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Upload
            </Button>
            {currentUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={handleRemoveAndSave}
              >
                <X className="mr-1.5 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={updateProfile.isPending || !pendingDataUrl}
        >
          <Save className="mr-1.5 h-4 w-4" />
          {updateProfile.isPending ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
