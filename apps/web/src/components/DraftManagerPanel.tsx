/**
 * DraftManagerPanel
 *
 * Two view modes toggled by the "Fast Mode" switch in the panel header:
 *
 *  Standard  — card-per-draft with Confirm / Discard / Detail-Edit buttons
 *  Fast Mode — Excel-like spreadsheet; click any cell to edit inline,
 *              auto-saves on blur via draftApi.update.
 *              Per-row buttons: Detail ▸ (opens full dialog), Confirm ✓, Discard ✕
 *
 * • Real-time updates via WS invalidation
 * • Red badge on trigger button
 * • Fast Mode preference persisted in localStorage
 */
import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  FileEdit,
  CheckCircle2,
  Trash2,
  Loader2,
  ClipboardList,
  ChevronRight,
  Zap,
  ZapOff,
  ExternalLink,
  Save,
  Check,
  AlertCircle,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useWsInvalidation } from "@/hooks/useWsInvalidation";
import { useProducts } from "@/hooks/useQueries";
import { draftApi, type Draft } from "@/lib/api";
import { DraftConfirmDialog } from "./DraftConfirmDialog";

// ─── helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<Draft["type"], string> = {
  purchase_entry: "Purchase",
  product: "New Product",
  stock_adjustment: "Stock Adj.",
};

const TYPE_COLOR: Record<Draft["type"], string> = {
  purchase_entry: "bg-info/15 text-info",
  product: "bg-success/15 text-success",
  stock_adjustment: "bg-warning/15 text-warning",
};

const TYPE_ORDER: Draft["type"][] = [
  "purchase_entry",
  "product",
  "stock_adjustment",
];

function relTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}

// ─── Standard card ────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  onEdit,
  onConfirm,
  onDiscard,
  busy,
}: {
  draft: Draft;
  onEdit: (d: Draft) => void;
  onConfirm: (id: string) => void;
  onDiscard: (id: string) => void;
  busy: string | null;
}) {
  const isLoading = busy === draft.id;
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {draft.title ?? TYPE_LABEL[draft.type as Draft["type"]]}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {relTime(draft.createdAt)}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLOR[draft.type as Draft["type"]]}`}
        >
          {TYPE_LABEL[draft.type as Draft["type"]]}
        </span>
      </div>
      {draft.notes && (
        <p className="text-xs text-muted-foreground italic truncate">
          {draft.notes}
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-xs"
          onClick={() => onEdit(draft)}
          disabled={isLoading}
        >
          <ChevronRight className="h-3 w-3 mr-1" />
          Detail
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => onDiscard(draft.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Trash2 className="h-3 w-3 mr-0.5" />
          )}
          Discard
        </Button>
        <Button
          size="sm"
          className="h-7 px-2 text-xs bg-success hover:bg-success/90 text-success-foreground"
          onClick={() => onConfirm(draft.id)}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3 w-3 mr-0.5" />
          )}
          Confirm
        </Button>
      </div>
    </div>
  );
}

// ─── Fast Mode data model ────────────────────────────────────────────────────

type RowStatus = "idle" | "dirty" | "saving" | "saved" | "error";
type ColGroup = "core" | "full";

interface ProductRow {
  id: string;
  title: string;
  // ── core ──
  name: string;
  category: string;
  price: string;
  mrp: string;
  stock: string;
  unit: string;
  // ── extended ──
  subCategory: string;
  sku: string;
  barcode: string;
  hsn: string;
  minStock: string;
  notes: string;
  _original: Draft;
  _status: RowStatus;
}

function toProductRow(d: Draft): ProductRow {
  const data = (d.data ?? {}) as Record<string, unknown>;
  return {
    id: d.id,
    title: d.title ?? "",
    name: String(data.name ?? ""),
    category: String(data.category ?? "General"),
    price: String(data.price ?? ""),
    mrp: String(data.mrp ?? ""),
    stock: String(data.stock ?? "0"),
    unit: String(data.unit ?? "piece"),
    subCategory: String(data.subCategory ?? data.sub_category ?? ""),
    sku: String(data.sku ?? ""),
    barcode: String(data.barcode ?? ""),
    hsn: String(data.hsnCode ?? data.hsn_code ?? data.hsn ?? ""),
    minStock: String(data.minStock ?? data.min_stock ?? "5"),
    notes: d.notes ?? "",
    _original: d,
    _status: "idle",
  };
}

type ColKey = keyof Omit<ProductRow, "id" | "_original" | "_status">;

interface ColDef {
  key: ColKey;
  label: string;
  width: string;
  type?: string;
  group: "core" | "extended";
  isUnit?: boolean;
  isCategory?: boolean;
  maxLength?: number;
  placeholder?: string;
}

const ALL_COLS: ColDef[] = [
  {
    key: "name",
    label: "Product Name",
    width: "min-w-[180px]",
    group: "core",
    placeholder: "e.g. Aata 5kg",
  },
  {
    key: "category",
    label: "Category",
    width: "min-w-[130px]",
    group: "core",
    isCategory: true,
  },
  {
    key: "price",
    label: "Price ₹",
    width: "min-w-[78px]",
    group: "core",
    type: "number",
  },
  {
    key: "mrp",
    label: "MRP ₹",
    width: "min-w-[72px]",
    group: "core",
    type: "number",
    placeholder: "retail",
  },
  {
    key: "stock",
    label: "Qty",
    width: "min-w-[62px]",
    group: "core",
    type: "number",
  },
  {
    key: "unit",
    label: "Unit",
    width: "min-w-[88px]",
    group: "core",
    isUnit: true,
  },
  {
    key: "subCategory",
    label: "Sub-cat",
    width: "min-w-[100px]",
    group: "extended",
    placeholder: "e.g. Flour",
  },
  {
    key: "sku",
    label: "SKU",
    width: "min-w-[88px]",
    group: "extended",
    placeholder: "Internal code",
  },
  {
    key: "barcode",
    label: "Barcode",
    width: "min-w-[110px]",
    group: "extended",
    placeholder: "EAN-13 / QR",
  },
  {
    key: "hsn",
    label: "HSN/SAC",
    width: "min-w-[80px]",
    group: "extended",
    maxLength: 8,
    placeholder: "1902",
  },
  {
    key: "minStock",
    label: "Min Qty",
    width: "min-w-[68px]",
    group: "extended",
    type: "number",
  },
  {
    key: "notes",
    label: "Notes",
    width: "min-w-[130px]",
    group: "extended",
    placeholder: "Any note",
  },
];

const UNIT_OPTIONS = [
  "piece",
  "kg",
  "g",
  "litre",
  "ml",
  "box",
  "packet",
  "dozen",
  "pair",
  "set",
  "metre",
  "bundle",
  "bag",
  "can",
  "strip",
  "vial",
  "tube",
];

const CATEGORY_OPTIONS = [
  "General",
  "Food & Grocery",
  "Beverages",
  "Dairy",
  "Bakery",
  "Snacks",
  "Personal Care",
  "Household",
  "Cleaning",
  "Electronics",
  "Clothing",
  "Stationery",
  "Medicines",
  "Pharma",
  "FMCG",
  "Hardware",
  "Auto Parts",
  "Toys",
  "Sports",
  "Other",
];

// ── Status icon ───────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === "saving")
    return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
  if (status === "saved") return <Check className="h-3 w-3 text-green-600" />;
  if (status === "error")
    return <AlertCircle className="h-3 w-3 text-red-500" />;
  if (status === "dirty") return <Save className="h-3 w-3 text-amber-500" />;
  return null;
}

// ── Row status → visual ───────────────────────────────────────────────────────

const STATUS_ROW_BG: Record<RowStatus, string> = {
  idle: "",
  dirty: "bg-amber-50/60 dark:bg-amber-900/15",
  saving: "bg-blue-50/40  dark:bg-blue-900/10",
  saved: "bg-green-50/40 dark:bg-green-900/10",
  error: "bg-red-50/60   dark:bg-red-900/15",
};

// ── Editable cell ─────────────────────────────────────────────────────────────

function EditableCell({
  value,
  type = "text",
  isUnit = false,
  isCategory = false,
  maxLength,
  placeholder = "",
  onChange,
  onBlur,
}: {
  value: string;
  type?: string;
  isUnit?: boolean;
  isCategory?: boolean;
  maxLength?: number;
  placeholder?: string;
  onChange: (v: string) => void;
  onBlur: () => void;
}) {
  const base =
    "block w-full bg-transparent text-xs border-0 outline-none " +
    "focus:bg-background rounded px-1.5 py-1 min-w-0 placeholder:text-muted-foreground/40";

  if (isUnit) {
    return (
      <div className="focus-within:ring-1 focus-within:ring-primary/60 focus-within:rounded">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={base + " cursor-pointer"}
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (isCategory) {
    return (
      <div className="focus-within:ring-1 focus-within:ring-primary/60 focus-within:rounded">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={base + " cursor-pointer"}
        >
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="focus-within:ring-1 focus-within:ring-primary/60 focus-within:rounded">
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className={base}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
      />
    </div>
  );
}

function FastModeTable({
  drafts,
  onEdit,
  onConfirm,
  onDiscard,
  busy,
  colGroup,
  onColGroupChange,
}: {
  drafts: Draft[];
  onEdit: (d: Draft) => void;
  onConfirm: (id: string) => void;
  onDiscard: (id: string) => void;
  busy: string | null;
  colGroup: ColGroup;
  onColGroupChange: (g: ColGroup) => void;
}) {
  const [rows, setRows] = useState<ProductRow[]>(() =>
    drafts.map(toProductRow),
  );
  const { toast } = useToast();
  const qc = useQueryClient();

  // Sync rows when draft list changes
  useEffect(() => {
    setRows((prev) => {
      const draftIds = new Set(drafts.map((d) => d.id));
      const kept = prev.filter((r) => draftIds.has(r.id));
      const existIds = new Set(kept.map((r) => r.id));
      const added = drafts.filter((d) => !existIds.has(d.id)).map(toProductRow);
      return [...kept, ...added];
    });
  }, [drafts]);

  const updateCell = (id: string, field: ColKey, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, [field]: value, _status: "dirty" as RowStatus }
          : r,
      ),
    );
  };

  const saveRow = useCallback(
    async (id: string) => {
      let rowToSave: ProductRow | undefined;
      setRows((prev) => {
        const row = prev.find((r) => r.id === id);
        if (!row || row._status !== "dirty") return prev;
        rowToSave = row;
        return prev.map((r) =>
          r.id === id ? { ...r, _status: "saving" as RowStatus } : r,
        );
      });
      if (!rowToSave) return;
      const row = rowToSave;
      try {
        const updatedData = {
          name: row.name.trim(),
          category: row.category.trim() || "General",
          subCategory: row.subCategory.trim() || undefined,
          price: parseFloat(row.price) || 0,
          mrp: parseFloat(row.mrp) || undefined,
          stock: parseFloat(row.stock) || 0,
          unit: row.unit || "piece",
          sku: row.sku.trim() || undefined,
          barcode: row.barcode.trim() || undefined,
          hsnCode: row.hsn.trim() || undefined,
          minStock: parseInt(row.minStock) || 5,
        };
        const updatedTitle = row.name.trim()
          ? `OCR: ${row.name.trim()}`
          : (row._original.title ?? "");

        await draftApi.update(id, {
          data: updatedData,
          title: updatedTitle || undefined,
          notes: row.notes.trim() || undefined,
        });
        setRows((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, title: updatedTitle, _status: "saved" as RowStatus }
              : r,
          ),
        );
        qc.invalidateQueries({ queryKey: ["drafts"] });
        setTimeout(() => {
          setRows((prev) =>
            prev.map((r) =>
              r.id === id && r._status === "saved"
                ? { ...r, _status: "idle" as RowStatus }
                : r,
            ),
          );
        }, 2000);
      } catch {
        setRows((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, _status: "error" as RowStatus } : r,
          ),
        );
        toast({
          title: "Save failed",
          description: "Could not save edits. Try again.",
          variant: "destructive",
        });
      }
    },
    [qc, toast],
  );

  const visibleCols =
    colGroup === "full" ? ALL_COLS : ALL_COLS.filter((c) => c.group === "core");

  const productRows = rows.filter((r) => r._original.type === "product");
  const otherDrafts = drafts.filter((d) => d.type !== "product");
  const dirtyCount = productRows.filter((r) => r._status === "dirty").length;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-auto">
        <div className="p-3 space-y-4">
          {/* ── Product Excel table ── */}
          <div>
            {/* Row 1: label + count + dirty badge */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                New Products
              </span>
              {productRows.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {productRows.length}
                </Badge>
              )}
              {dirtyCount > 0 && (
                <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
                  {dirtyCount} unsaved
                </Badge>
              )}
            </div>
            {/* Row 2: Column-group toggle — always on its own line, full width */}
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[10px] text-muted-foreground mr-1">
                Columns:
              </span>
              <div className="flex items-center rounded-md border overflow-hidden text-[10px] font-medium">
                <button
                  onClick={() => onColGroupChange("core")}
                  className={`px-3 py-1.5 transition-colors ${
                    colGroup === "core"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  Core (6)
                </button>
                <button
                  onClick={() => onColGroupChange("full")}
                  className={`px-3 py-1.5 transition-colors border-l ${
                    colGroup === "full"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  Full (12)
                </button>
              </div>
            </div>

            {productRows.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10 text-center gap-2 text-muted-foreground">
                <ClipboardList className="h-8 w-8 opacity-30" />
                <p className="text-sm font-medium">No product drafts yet</p>
                <p className="text-xs opacity-70 max-w-[220px]">
                  Use <span className="font-semibold">Import from Photo</span>{" "}
                  on the Inventory page, or say{" "}
                  <span className="font-semibold">"add new product"</span> by
                  voice.
                </p>
              </div>
            ) : (
              <>
                {/* Spreadsheet */}
                <div className="overflow-x-auto rounded-lg border shadow-sm text-xs">
                  <table className="min-w-full border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted border-b-2 border-border">
                        <th className="px-2 py-2 text-center font-semibold text-muted-foreground w-10 select-none">
                          #
                        </th>
                        {visibleCols.map((col) => (
                          <th
                            key={col.key}
                            className={`px-2 py-2 text-left font-semibold text-muted-foreground select-none ${
                              col.group === "extended" ? "bg-muted/80" : ""
                            } ${col.width}`}
                          >
                            {col.label}
                            {col.group === "extended" && (
                              <span className="ml-1 text-[8px] text-muted-foreground/60 font-normal">
                                ext
                              </span>
                            )}
                          </th>
                        ))}
                        <th className="px-2 py-2 text-center font-semibold text-muted-foreground w-[88px] select-none">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {productRows.map((row, idx) => {
                        const isBusy = busy === row.id;
                        const rowBg = STATUS_ROW_BG[row._status];
                        return (
                          <tr
                            key={row.id}
                            className={`group border-b transition-colors last:border-0 hover:bg-accent/10 ${
                              isBusy ? "opacity-60 pointer-events-none" : ""
                            } ${rowBg}`}
                          >
                            {/* # + status */}
                            <td className="px-2 py-1 text-center text-muted-foreground select-none">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[10px] leading-none">
                                  {idx + 1}
                                </span>
                                <StatusIcon status={row._status} />
                              </div>
                            </td>

                            {/* Data cells */}
                            {visibleCols.map((col) => (
                              <td
                                key={col.key}
                                className={`px-0.5 py-0.5 ${col.width} ${
                                  col.group === "extended" ? "bg-muted/20" : ""
                                }`}
                              >
                                <EditableCell
                                  value={row[col.key] as string}
                                  type={col.type}
                                  isUnit={col.isUnit}
                                  isCategory={col.isCategory}
                                  maxLength={col.maxLength}
                                  placeholder={col.placeholder}
                                  onChange={(v) =>
                                    updateCell(row.id, col.key, v)
                                  }
                                  onBlur={() => saveRow(row.id)}
                                />
                              </td>
                            ))}

                            {/* Actions */}
                            <td className="px-1 py-1">
                              <TooltipProvider>
                                <div className="flex items-center gap-0.5 justify-center">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                        onClick={() => onEdit(row._original)}
                                      >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="text-xs"
                                    >
                                      Full detail edit
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700 disabled:opacity-30 transition-colors"
                                        onClick={() => onConfirm(row.id)}
                                        disabled={
                                          isBusy ||
                                          row._status === "dirty" ||
                                          row._status === "saving"
                                        }
                                      >
                                        {isBusy ? (
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        )}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="text-xs"
                                    >
                                      {row._status === "dirty"
                                        ? "Save first (Tab or Enter)"
                                        : "Confirm → add to inventory"}
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-red-600 disabled:opacity-30 transition-colors"
                                        onClick={() => onDiscard(row.id)}
                                        disabled={isBusy}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="text-xs"
                                    >
                                      Discard draft
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TooltipProvider>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>⌨️ Click to edit · Tab/Enter saves</span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-200 border border-amber-300" />{" "}
                    unsaved
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-200" />{" "}
                    saving
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-200" />{" "}
                    saved
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200" />{" "}
                    error
                  </span>
                  <span className="ml-auto opacity-60">
                    ext = extended fields
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ── Other draft types ── */}
          {otherDrafts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Other Drafts · {otherDrafts.length}
              </p>
              <div className="space-y-1.5">
                {otherDrafts.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 gap-2 hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {d.title ?? TYPE_LABEL[d.type as Draft["type"]]}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        <span
                          className={`inline-block px-1.5 rounded-full text-[9px] font-medium mr-1 ${TYPE_COLOR[d.type as Draft["type"]]}`}
                        >
                          {TYPE_LABEL[d.type as Draft["type"]]}
                        </span>
                        {relTime(d.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                              onClick={() => onEdit(d)}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Edit
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded hover:bg-green-100 text-green-700 disabled:opacity-30"
                              onClick={() => onConfirm(d.id)}
                              disabled={busy === d.id}
                            >
                              {busy === d.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Confirm
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1.5 rounded hover:bg-red-100 text-red-600 disabled:opacity-30"
                              onClick={() => onDiscard(d.id)}
                              disabled={busy === d.id}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            Discard
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main panel ───────────────────────────────────────────────────────────────

export function DraftManagerPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: products = [] } = useProducts();
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const [open, setOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<Draft | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Fast Mode — persisted in localStorage
  const [fastMode, setFastMode] = useState(() => {
    try {
      return localStorage.getItem("draft-fast-mode") === "true";
    } catch {
      return false;
    }
  });
  const [colGroup, setColGroup] = useState<ColGroup>(() => {
    try {
      return (localStorage.getItem("draft-col-group") as ColGroup) || "core";
    } catch {
      return "core";
    }
  });

  const toggleFastMode = (v: boolean) => {
    setFastMode(v);
    try {
      localStorage.setItem("draft-fast-mode", String(v));
    } catch {
      /* noop */
    }
  };
  const handleColGroupChange = (g: ColGroup) => {
    setColGroup(g);
    try {
      localStorage.setItem("draft-col-group", g);
    } catch {
      /* noop */
    }
  };

  // Keep drafts in sync with WS events
  useWsInvalidation(["drafts"]);

  // Allow NotificationCenter "Review" link to open this panel
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-draft-panel", handler);
    return () => window.removeEventListener("open-draft-panel", handler);
  }, []);

  const { data } = useQuery({
    queryKey: ["drafts", "pending"],
    queryFn: () => draftApi.list(undefined, "pending"),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  });

  const drafts = data?.drafts ?? [];

  // ── confirm single ────────────────────────────────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: (id: string) => draftApi.confirm(id),
    onMutate: (id) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: ({ draft }) => {
      toast({
        title: "Confirmed!",
        description: draft.title ?? TYPE_LABEL[draft.type as Draft["type"]],
      });
      ["drafts", "purchases", "products", "expenses"].forEach((k) =>
        qc.invalidateQueries({ queryKey: [k] }),
      );
    },
    onError: (err: any) => {
      toast({
        title: "Confirm failed",
        description: err?.message ?? "Error",
        variant: "destructive",
      });
    },
  });

  // ── discard single ────────────────────────────────────────────────────────
  const discardMutation = useMutation({
    mutationFn: (id: string) => draftApi.discard(id),
    onMutate: (id) => setBusyId(id),
    onSettled: () => setBusyId(null),
    onSuccess: () => {
      toast({ title: "Draft discarded" });
      qc.invalidateQueries({ queryKey: ["drafts"] });
    },
  });

  // ── confirm all ───────────────────────────────────────────────────────────
  const [confirmingAll, setConfirmingAll] = useState(false);
  async function handleConfirmAll() {
    setConfirmingAll(true);
    let ok = 0;
    let fail = 0;
    for (const d of drafts) {
      try {
        await draftApi.confirm(d.id);
        ok++;
      } catch {
        fail++;
      }
    }
    setConfirmingAll(false);
    ["drafts", "purchases", "products", "expenses"].forEach((k) =>
      qc.invalidateQueries({ queryKey: [k] }),
    );
    toast({
      title: `Confirmed ${ok} draft${ok !== 1 ? "s" : ""}${fail ? ` (${fail} failed)` : ""}`,
    });
  }

  // Group by type (Standard mode)
  const grouped = TYPE_ORDER.reduce<Record<string, Draft[]>>((acc, type) => {
    const items = drafts.filter((d) => d.type === type);
    if (items.length) acc[type] = items;
    return acc;
  }, {});

  const pendingCount = drafts.length;

  // Panel width: wider in fast mode; even wider when full columns visible
  const sheetWidth = !fastMode
    ? "w-[360px] sm:w-[420px]"
    : colGroup === "full"
      ? "w-[95vw] sm:w-[1100px]"
      : "w-[95vw] sm:w-[780px]";

  return (
    <>
      {/* ── Trigger button ─────────────────────────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className="relative inline-flex items-center justify-center rounded-full w-10 h-10 bg-background border shadow-sm hover:bg-accent transition-colors"
            title="View pending drafts"
          >
            <FileEdit className="h-4 w-4" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </button>
        </SheetTrigger>

        <SheetContent
          side="right"
          className={`${sheetWidth} flex flex-col p-0 transition-all duration-200`}
          aria-describedby={undefined}
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <SheetHeader className="px-4 pt-4 pb-2 shrink-0">
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              <ClipboardList className="h-5 w-5 shrink-0" />
              <span>Draft Queue</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {pendingCount} pending
                </Badge>
              )}

              {/* Fast Mode toggle */}
              <div className="ml-auto flex items-center gap-1.5">
                <Label
                  htmlFor="fast-mode-toggle"
                  className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1 select-none"
                >
                  {fastMode ? (
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <ZapOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  Fast Mode
                </Label>
                <Switch
                  id="fast-mode-toggle"
                  checked={fastMode}
                  onCheckedChange={toggleFastMode}
                  className="scale-75 origin-right"
                />
              </div>
            </SheetTitle>

            {fastMode && pendingCount > 0 && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                ⚡ Excel-like · click cell to edit · Tab / Enter saves · amber =
                unsaved
              </p>
            )}
          </SheetHeader>

          <Separator />

          {/* ── Body ───────────────────────────────────────────────────── */}
          {pendingCount === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center px-6 text-muted-foreground">
              <div>
                <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No pending drafts</p>
                <p className="text-xs mt-1">
                  Forms will create a draft first — you can review and confirm
                  here.
                </p>
              </div>
            </div>
          ) : fastMode ? (
            /* ── Fast Mode view ── */
            <>
              <FastModeTable
                drafts={drafts}
                onEdit={setEditDraft}
                onConfirm={(id) => confirmMutation.mutate(id)}
                onDiscard={(id) => discardMutation.mutate(id)}
                busy={busyId}
                colGroup={colGroup}
                onColGroupChange={handleColGroupChange}
              />
              <Separator />
              <div className="px-4 py-3 shrink-0">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleConfirmAll}
                  disabled={confirmingAll || !!busyId}
                >
                  {confirmingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirm All ({pendingCount})
                </Button>
              </div>
            </>
          ) : (
            /* ── Standard card view ── */
            <>
              <ScrollArea className="flex-1 px-4 py-3">
                <div className="space-y-4">
                  {Object.entries(grouped).map(([type, items]) => (
                    <div key={type}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        {TYPE_LABEL[type as Draft["type"]]} · {items.length}
                      </p>
                      <div className="space-y-2">
                        {items.map((d) => (
                          <DraftCard
                            key={d.id}
                            draft={d}
                            onEdit={setEditDraft}
                            onConfirm={(id) => confirmMutation.mutate(id)}
                            onDiscard={(id) => discardMutation.mutate(id)}
                            busy={busyId}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator />
              <div className="px-4 py-3 shrink-0">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleConfirmAll}
                  disabled={confirmingAll || !!busyId}
                >
                  {confirmingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirm All ({pendingCount})
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Full-edit dialog (both modes) */}
      <DraftConfirmDialog
        draft={editDraft}
        open={!!editDraft}
        onClose={() => setEditDraft(null)}
        onConfirmed={() => setEditDraft(null)}
        onDiscarded={() => setEditDraft(null)}
        categories={categories}
      />
    </>
  );
}
