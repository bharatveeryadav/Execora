/**
 * Banks Other — additional payment/bank options
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark } from "lucide-react";

export default function SettingsBanksOther() {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4" />
          Additional Bank & Payment Options
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Multiple bank accounts, payment terms, and other banking preferences.
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Configure your primary bank account in <strong>Banks</strong> and UPI in{" "}
          <strong>Execora Wallet</strong>. Multiple bank accounts and advanced options coming soon.
        </p>
      </CardContent>
    </Card>
  );
}
