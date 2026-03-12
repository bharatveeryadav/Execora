import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useExpiringBatches } from "@/hooks/useQueries";

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DashboardExpiryAlert() {
  const navigate = useNavigate();
  const { data: batches = [] } = useExpiringBatches(30);

  if (batches.length === 0) return null;

  const urgent = batches.filter((b) => daysUntil(b.expiryDate) <= 7);

  return (
    <Card
      className="cursor-pointer border-warning/40 bg-warning/10"
      onClick={() => navigate("/expiry")}
    >
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold text-warning">
            ⚠️ Expiring Stock Alert
          </h3>
          {urgent.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-xs">
              {urgent.length} expiring ≤7 days
            </Badge>
          )}
        </div>
        <div className="space-y-1.5">
          {batches.slice(0, 4).map((b) => {
            const days = daysUntil(b.expiryDate);
            return (
              <div
                key={b.id}
                className="flex items-center justify-between text-xs"
              >
                <span className="font-medium text-foreground">
                  {b.product.name}
                  {b.batchNo && (
                    <span className="ml-1 text-muted-foreground">
                      #{b.batchNo}
                    </span>
                  )}
                </span>
                <span
                  className={`font-semibold ${days <= 7 ? "text-destructive" : "text-warning"}`}
                >
                  {days <= 0 ? "EXPIRED" : `${days}d left`}
                </span>
              </div>
            );
          })}
          {batches.length > 4 && (
            <p className="text-xs text-muted-foreground">
              +{batches.length - 4} more · tap to view all
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
