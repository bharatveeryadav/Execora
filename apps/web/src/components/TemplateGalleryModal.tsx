/**
 * TemplateGalleryModal — Full sample previews for Invoice, Purchase, Quotation.
 * Uses sample data from @execora/shared for previews.
 */
import { useState, useMemo } from "react";
import { FileText, Package, Quote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  InvoiceTemplatePreview,
  TEMPLATES,
  type TemplateId,
  type PreviewData,
} from "@/components/InvoiceTemplatePreview";
import {
  DEMO_INVOICES,
  DEMO_PURCHASES,
  DEMO_QUOTATIONS,
  DEMO_AMAZON,
  DEMO_TATA,
  DEMO_DMART,
  DEMO_NIKE,
  DEMO_INSTAGRAM,
  DEMO_UNILEVER,
  DEMO_SERVICE_BILL_SHIP,
  type DemoInvoiceData,
} from "@execora/shared";

const TEMPLATE_TO_DEMO: Record<TemplateId, DemoInvoiceData> = {
  amazon: DEMO_AMAZON,
  tata: DEMO_TATA,
  dmart: DEMO_DMART,
  nike: DEMO_NIKE,
  instagram: DEMO_INSTAGRAM,
  unilever: DEMO_UNILEVER,
  service: DEMO_SERVICE_BILL_SHIP,
  classic: DEMO_AMAZON,
  modern: DEMO_AMAZON,
  vyapari: DEMO_AMAZON,
  thermal: DEMO_AMAZON,
  ecom: DEMO_AMAZON,
  flipkart: DEMO_AMAZON,
  minimal: DEMO_AMAZON,
};

function toPreviewData(d: DemoInvoiceData): PreviewData {
  return {
    ...d,
    cgst: d.cgst ?? 0,
    sgst: d.sgst ?? 0,
    tags: d.tags,
    logoPlaceholder: d.logoPlaceholder,
    shipToAddress: d.shipToAddress,
    themeLabel: d.themeLabel,
    placeOfSupply: d.placeOfSupply,
    dueDate: d.dueDate,
    upiId: d.upiId,
    bankName: d.bankName,
    bankAccountNo: d.bankAccountNo,
    bankIfsc: d.bankIfsc,
    bankBranch: d.bankBranch,
    items: d.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      unit: i.unit,
      rate: i.rate,
      discount: i.discount,
      amount: i.amount,
      hsnCode: i.hsnCode,
      mrp: i.mrp,
    })),
  };
}

interface TemplateGalleryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTemplate?: TemplateId;
  onSelectTemplate?: (id: TemplateId) => void;
}

export function TemplateGalleryModal({
  open,
  onOpenChange,
  selectedTemplate,
  onSelectTemplate,
}: TemplateGalleryModalProps) {
  const [activeTab, setActiveTab] = useState<"invoice" | "purchase" | "quotation">("invoice");

  const demos = useMemo(() => {
    if (activeTab === "invoice") return DEMO_INVOICES;
    if (activeTab === "purchase") return DEMO_PURCHASES;
    return DEMO_QUOTATIONS;
  }, [activeTab]);

  const getPreviewDataForTemplate = (t: TemplateId) => {
    const demo = activeTab === "invoice" ? (TEMPLATE_TO_DEMO[t] ?? demos[0]) : demos[0];
    return toPreviewData(demo);
  };

  const btnClass = (active: boolean) =>
    `text-xs px-2.5 py-0.5 rounded border transition-colors ${
      active ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
    }`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 py-2 border-b shrink-0">
          <DialogTitle className="text-sm font-semibold">Document Templates</DialogTitle>
          <p className="text-[11px] text-muted-foreground mt-0.5">Same templates for Invoice, Purchase, Quotation</p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b shrink-0 mx-0 px-4 h-9">
            <TabsTrigger value="invoice" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Invoices
            </TabsTrigger>
            <TabsTrigger value="purchase" className="gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Purchase
            </TabsTrigger>
            <TabsTrigger value="quotation" className="gap-1.5">
              <Quote className="h-3.5 w-3.5" />
              Quotation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoice" className="flex-1 m-0 overflow-auto p-3">
            <div className="space-y-4">
              {TEMPLATES.map((t) => (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t.label}</h3>
                    {onSelectTemplate && (
                      <button
                        type="button"
                        onClick={() => onSelectTemplate(t.id)}
                        className={btnClass(selectedTemplate === t.id)}
                      >
                        {selectedTemplate === t.id ? "Selected" : "Use"}
                      </button>
                    )}
                  </div>
                  <div className="rounded border bg-muted/30 p-1.5 overflow-x-auto">
                    <InvoiceTemplatePreview template={t.id} data={getPreviewDataForTemplate(t.id)} />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="purchase" className="flex-1 m-0 overflow-auto p-3">
            <div className="space-y-4">
              {TEMPLATES.map((t) => (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t.label}</h3>
                    {onSelectTemplate && (
                      <button
                        type="button"
                        onClick={() => onSelectTemplate(t.id)}
                        className={btnClass(selectedTemplate === t.id)}
                      >
                        {selectedTemplate === t.id ? "Selected" : "Use"}
                      </button>
                    )}
                  </div>
                  <div className="rounded border bg-muted/30 p-1.5 overflow-x-auto">
                    <InvoiceTemplatePreview template={t.id} data={getPreviewDataForTemplate(t.id)} />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="quotation" className="flex-1 m-0 overflow-auto p-3">
            <div className="space-y-4">
              {TEMPLATES.map((t) => (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t.label}</h3>
                    {onSelectTemplate && (
                      <button
                        type="button"
                        onClick={() => onSelectTemplate(t.id)}
                        className={btnClass(selectedTemplate === t.id)}
                      >
                        {selectedTemplate === t.id ? "Selected" : "Use"}
                      </button>
                    )}
                  </div>
                  <div className="rounded border bg-muted/30 p-1.5 overflow-x-auto">
                    <InvoiceTemplatePreview template={t.id} data={getPreviewDataForTemplate(t.id)} />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
