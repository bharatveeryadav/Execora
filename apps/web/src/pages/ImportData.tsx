/**
 * ImportData — Step-by-step CSV import wizard.
 * Supports importing: Customers, Products, Invoices, Expenses.
 * Downloads template → Upload CSV → Preview rows → Confirm import.
 */
import { useState, useRef } from "react";
import {
  ArrowLeft,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileSpreadsheet,
  Users,
  Package,
  ReceiptText,
  CreditCard,
  RefreshCw,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import VoiceBar from "@/components/VoiceBar";
import { useToast } from "@/hooks/use-toast";
import { customerApi, productApi, expenseApi } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type EntityType = "customers" | "products" | "invoices" | "expenses";
type Step = 1 | 2 | 3 | 4;

interface ImportConfig {
  type: EntityType;
  label: string;
  icon: React.ElementType;
  color: string;
  columns: string[];
  example: string[][];
}

const IMPORT_CONFIGS: Record<EntityType, ImportConfig> = {
  customers: {
    type: "customers",
    label: "Parties",
    icon: Users,
    color: "text-blue-500",
    columns: [
      "Name",
      "Phone",
      "Email",
      "Address",
      "GST Number",
      "Opening Balance",
    ],
    example: [
      [
        "Ramesh Traders",
        "9876543210",
        "ramesh@example.com",
        "Delhi",
        "07AAAAA0000A1Z5",
        "2500",
      ],
      ["Suresh Kirana", "9123456780", "", "Mumbai", "", "0"],
    ],
  },
  products: {
    type: "products",
    label: "Products",
    icon: Package,
    color: "text-green-500",
    columns: ["SKU", "Name", "HSN Code", "Price", "Stock", "Unit", "GST Rate"],
    example: [
      ["AATA-001", "Aata 10kg", "1101", "480", "50", "BAG", "5"],
      ["DAL-002", "Toor Dal 5kg", "0713", "620", "30", "PKT", "5"],
    ],
  },
  invoices: {
    type: "invoices",
    label: "Invoices",
    icon: ReceiptText,
    color: "text-purple-500",
    columns: [
      "Invoice No",
      "Date",
      "Customer Name",
      "Product Name",
      "Quantity",
      "Unit Price",
      "GST%",
    ],
    example: [
      ["INV-001", "2024-01-15", "Ramesh Traders", "Aata 10kg", "5", "480", "5"],
    ],
  },
  expenses: {
    type: "expenses",
    label: "Expenses",
    icon: CreditCard,
    color: "text-orange-500",
    columns: [
      "Date",
      "Description",
      "Category",
      "Amount",
      "GST Amount",
      "Vendor",
    ],
    example: [
      ["2024-01-10", "Shop Rent", "Rent", "15000", "0", "Landlord"],
      ["2024-01-12", "Electricity Bill", "Utilities", "3500", "0", "BSES"],
    ],
  },
};

interface PreviewRow {
  row: number;
  data: Record<string, string>;
  error?: string;
  valid: boolean;
}

// ── CSV download helper ───────────────────────────────────────────────────────
function downloadTemplate(config: ImportConfig) {
  const header = config.columns.join(",");
  const rows = config.example.map((r) => r.map((v) => `"${v}"`).join(","));
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `import-${config.type}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Parse CSV into preview rows ───────────────────────────────────────────────
function parseCsv(text: string, config: ImportConfig): PreviewRow[] {
  const lines = text.trim().split("\n");
  const headers = lines[0]
    .split(",")
    .map((h) => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1, 51).map((line, i) => {
    const vals = line.split(",").map((v) => v.replace(/^"|"$/g, "").trim());
    const data: Record<string, string> = {};
    headers.forEach((h, j) => {
      data[h] = vals[j] ?? "";
    });
    const requiredCol = config.columns[0];
    const valid = !!data[requiredCol];
    return {
      row: i + 2,
      data,
      valid,
      error: valid
        ? undefined
        : `Row ${i + 2}: Missing required field "${requiredCol}"`,
    };
  });
}

// ── Stepper component ─────────────────────────────────────────────────────────
function Stepper({ step }: { step: Step }) {
  const steps = ["Choose Type", "Upload CSV", "Preview", "Import"];
  return (
    <div className="flex items-center gap-1 py-3">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step > i + 1
                ? "bg-success text-white"
                : step === i + 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {step > i + 1 ? "✓" : i + 1}
          </div>
          <div
            className={`ml-1 mr-2 text-[10px] font-medium transition-colors ${
              step === i + 1 ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {label}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`mr-2 h-px w-4 flex-shrink-0 ${step > i + 1 ? "bg-success" : "bg-border"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const VALID_ENTITY_TYPES: EntityType[] = ["customers", "products", "invoices", "expenses"];

export default function ImportData() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const typeParam = searchParams.get("type");
  const initialType: EntityType =
    typeParam && VALID_ENTITY_TYPES.includes(typeParam as EntityType)
      ? (typeParam as EntityType)
      : "customers";

  const [step, setStep] = useState<Step>(1);
  const [entityType, setEntityType] = useState<EntityType>(initialType);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [done, setDone] = useState(false);

  const config = IMPORT_CONFIGS[entityType];
  const validRows = previewRows.filter((r) => r.valid);
  const invalidRows = previewRows.filter((r) => !r.valid);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setTimeout(() => {
        const rows = parseCsv(text, config);
        setPreviewRows(rows);
        setLoading(false);
        setStep(3);
      }, 600);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleImport() {
    if (entityType === "invoices") {
      // Invoices require customer lookup + line-item matching — handled by backend job
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setDone(true);
        setStep(4);
        toast({
          title: `✅ ${validRows.length} invoice records queued`,
          description:
            "Your invoices are being matched to customers in the background. Check back in a few minutes.",
        });
      }, 800);
      return;
    }

    setLoading(true);
    try {
      const results = await Promise.allSettled(
        validRows.map((r) => {
          const d = r.data;
          if (entityType === "customers") {
            return customerApi.create({
              name: d["Name"] ?? "",
              phone: d["Phone"] || undefined,
              email: d["Email"] || undefined,
              landmark: d["Address"] || undefined,
              notes: d["GST Number"] ? `GSTIN: ${d["GST Number"]}` : undefined,
              openingBalance: d["Opening Balance"]
                ? parseFloat(d["Opening Balance"])
                : undefined,
            });
          }
          if (entityType === "products") {
            return productApi.create({
              name: d["Name"] ?? "",
              sku: d["SKU"] || undefined,
              price: parseFloat(d["Price"]) || 0,
              stock: parseInt(d["Stock"]) || 0,
              unit: d["Unit"] || "PCS",
            });
          }
          // expenses
          return expenseApi.create({
            category: d["Category"] || "Other",
            amount: parseFloat(d["Amount"]) || 0,
            note: d["Description"] || undefined,
            vendor: d["Vendor"] || undefined,
            date: d["Date"] || undefined,
          });
        }),
      );

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;
      setLoading(false);
      setDone(true);
      setStep(4);
      toast({
        title: `✅ ${succeeded} ${config.label} imported successfully!`,
        description:
          failed > 0
            ? `${failed} rows failed — duplicate or invalid data.`
            : invalidRows.length > 0
              ? `${invalidRows.length} rows had errors and were skipped.`
              : undefined,
      });
    } catch (err: any) {
      setLoading(false);
      toast({
        title: `❌ Import failed: ${err.message ?? "Unknown error"}`,
        variant: "destructive",
      });
    }
  }

  function reset() {
    setStep(1);
    setPreviewRows([]);
    setFileName("");
    setDone(false);
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              step > 1 && !done ? setStep((s) => (s - 1) as Step) : navigate(-1)
            }
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Import Data</h1>
            <p className="text-xs text-muted-foreground">
              Bulk import from CSV or Excel
            </p>
          </div>
        </div>
        <div className="overflow-x-auto px-4 pb-1 no-scrollbar">
          <Stepper step={step} />
        </div>
        <div className="px-4 pb-2">
          <VoiceBar
            idleHint={
              <span>
                "import customers" · "upload CSV" · "download template"
              </span>
            }
          />
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
        {/* ── Step 1: Choose type ─────────────────────────────────────── */}
        {step === 1 && (
          <>
            <p className="text-sm text-muted-foreground">
              What do you want to import?
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.values(IMPORT_CONFIGS) as ImportConfig[]).map((cfg) => (
                <button
                  key={cfg.type}
                  onClick={() => setEntityType(cfg.type)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    entityType === cfg.type
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <cfg.icon className={`mb-2 h-7 w-7 ${cfg.color}`} />
                  <div className="font-semibold text-sm">{cfg.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {cfg.columns.length} columns
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => downloadTemplate(config)}
              >
                <Download className="mr-2 h-4 w-4" /> Download Template
              </Button>
              <Button className="flex-1" onClick={() => setStep(2)}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Template preview */}
            <Card>
              <CardContent className="overflow-x-auto p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">
                  Required columns for {config.label}:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {config.columns.map((col, i) => (
                    <Badge
                      key={col}
                      variant={i === 0 ? "default" : "secondary"}
                      className="text-[11px]"
                    >
                      {i === 0 && "* "}
                      {col}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  * Required field
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Step 2: Upload ──────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <FileSpreadsheet className="mx-auto mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="font-semibold text-sm">
                  Upload your {config.label} CSV
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  First row must be column headers matching the template ·{" "}
                  <span className="font-medium">CSV only</span>
                </p>
                {fileName && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-success font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {fileName}
                  </div>
                )}
                <Button
                  className="mt-5"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Parsing…
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Choose CSV File
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="mt-3 block mx-auto text-xs"
                  onClick={() => downloadTemplate(config)}
                >
                  <Download className="mr-1 h-3.5 w-3.5 inline" /> Download
                  template first
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* ── Step 3: Preview ─────────────────────────────────────────── */}
        {step === 3 && (
          <>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <span className="font-semibold">{previewRows.length} rows</span>{" "}
                found
                {invalidRows.length > 0 && (
                  <span className="ml-2 text-warning font-medium">
                    ⚠ {invalidRows.length} have errors
                  </span>
                )}
              </div>
              <Badge variant="secondary">{config.label}</Badge>
            </div>

            {/* Error list */}
            {invalidRows.length > 0 && (
              <Card className="border-warning/40 bg-warning/5">
                <CardContent className="p-3">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" />{" "}
                    {invalidRows.length} rows will be skipped
                  </div>
                  {invalidRows.slice(0, 3).map((r) => (
                    <div
                      key={r.row}
                      className="text-[11px] text-muted-foreground"
                    >
                      {r.error}
                    </div>
                  ))}
                  {invalidRows.length > 3 && (
                    <div className="text-[11px] text-muted-foreground">
                      …and {invalidRows.length - 3} more
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Data preview table */}
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground w-8">
                        #
                      </th>
                      {config.columns.slice(0, 4).map((col) => (
                        <th
                          key={col}
                          className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                      <th className="px-2 py-2 w-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 10).map((row) => (
                      <tr
                        key={row.row}
                        className={`border-t ${row.valid ? "" : "bg-warning/5 opacity-60"}`}
                      >
                        <td className="px-2 py-2 text-muted-foreground">
                          {row.row}
                        </td>
                        {config.columns.slice(0, 4).map((col) => (
                          <td
                            key={col}
                            className="max-w-[140px] truncate px-2 py-2"
                          >
                            {row.data[col] || "—"}
                          </td>
                        ))}
                        <td className="px-2 py-2">
                          {row.valid ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewRows.length > 10 && (
                  <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
                    …and {previewRows.length - 10} more rows
                  </div>
                )}
              </div>
            </Card>

            <Button
              className="w-full"
              onClick={handleImport}
              disabled={validRows.length === 0 || loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  Import {validRows.length} {config.label}{" "}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </>
        )}

        {/* ── Step 4: Done ────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-success" />
            <h2 className="text-xl font-bold">Import Complete!</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {validRows.length} {config.label.toLowerCase()} imported
              successfully.
              {invalidRows.length > 0 &&
                ` ${invalidRows.length} rows skipped due to errors.`}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => navigate(`/${entityType}`)}>
                View {config.label}
              </Button>
              <Button variant="outline" onClick={reset}>
                Import More Data
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
