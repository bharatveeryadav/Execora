import { useNavigate } from "react-router-dom";
import { useLowStockProducts } from "@/hooks/useQueries";

const DashboardLowStock = () => {
  const navigate = useNavigate();
  const { data: lowStock = [], isLoading } = useLowStockProducts();

  if (isLoading || lowStock.length === 0) return null;

  const items = lowStock.slice(0, 5);
  const extra = Math.max(0, lowStock.length - 5);
  const criticalCount = lowStock.filter((p) => p.stock === 0).length;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5">
      <span className="shrink-0 text-xs font-semibold text-warning">
        {criticalCount > 0 ? "🔴" : "⚠️"} Stock Alert ({lowStock.length}):
      </span>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => navigate("/inventory")}
          title={`${item.stock} ${item.unit} remaining`}
          className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 ${
            item.stock === 0
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-warning/40 bg-warning/15 text-warning"
          }`}
        >
          {item.name}
          <span className="ml-1 opacity-60 tabular-nums">
            {item.stock}
            {item.unit}
          </span>
        </button>
      ))}
      {extra > 0 && (
        <button
          onClick={() => navigate("/inventory")}
          className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground hover:bg-background"
        >
          +{extra} more
        </button>
      )}
      <button
        onClick={() => navigate("/inventory")}
        className="ml-auto shrink-0 text-[11px] text-muted-foreground hover:text-foreground"
      >
        Manage Inventory →
      </button>
    </div>
  );
};

export default DashboardLowStock;
