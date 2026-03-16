/**
 * Bank Account Details — for NEFT/RTGS on invoice PDF
 */
import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function SettingsBanksBanks() {
  const { data: me } = useMe();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");

  useEffect(() => {
    const stored = readStored();
    const s = (me?.tenant as unknown as { settings?: Record<string, string> })?.settings ?? {};
    setBankAccountHolder(stored.bankAccountHolder ?? s.bankAccountHolder ?? "");
    setBankName(stored.bankName ?? s.bankName ?? "");
    setBankAccountNo(stored.bankAccountNo ?? s.bankAccountNo ?? "");
    setBankIfsc(stored.bankIfsc ?? s.bankIfsc ?? "");
  }, [me]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const stored = readStored();
    stored.bankAccountHolder = bankAccountHolder;
    stored.bankName = bankName;
    stored.bankAccountNo = bankAccountNo;
    stored.bankIfsc = bankIfsc;
    localStorage.setItem(BIZ_STORAGE_KEY, JSON.stringify(stored));

    try {
      await updateProfile.mutateAsync({
        tenant: {
          settings: {
            bankAccountHolder,
            bankName,
            bankAccountNo,
            bankIfsc,
          },
        },
      });
      toast({ title: "Bank details saved" });
    } catch {
      toast({ title: "Saved locally; sync failed", variant: "destructive" });
    }
  };

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Bank Account Details</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Printed on every invoice PDF footer — customers use these for NEFT/IMPS transfers.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Account Holder Name</Label>
              <Input
                value={bankAccountHolder}
                onChange={(e) => setBankAccountHolder(e.target.value)}
                placeholder="Business or proprietor name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bank Name</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account Number</Label>
              <Input
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value.trim())}
                placeholder="e.g. 00110123456789"
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">IFSC Code</Label>
              <Input
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase().trim())}
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                className="font-mono text-sm"
              />
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
