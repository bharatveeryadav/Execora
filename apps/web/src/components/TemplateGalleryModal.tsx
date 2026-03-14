/**
 * TemplateGalleryModal — Full sample previews for Invoice, Purchase, Quotation.
 * 3 tabs, each showing all templates with sample data.
 */
import { useState } from "react";
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

const SAMPLE_ITEMS = [
  { name: "Rice 1kg", qty: 5, unit: "pcs", rate: 80, discount: 0, amount: 400, hsnCode: "1006" },
  { name: "Dal Toor 500g", qty: 3, unit: "pcs", rate: 120, discount: 5, amount: 342, hsnCode: "1904" },
  { name: "Oil Sunflower 1L", qty: 2, unit: "pcs", rate: 180, discount: 0, amount: 360, hsnCode: "1507" },
];

const SAMPLE_INVOICE: PreviewData = {
  invoiceNo: "INV-2024-001",
  date: "14-Mar-2025",
  shopName: "My Store",
  customerName: "Ramesh Kumar",
  supplierGstin: "07ABCDE1234F1Z5",
  supplierAddress: "123 Main St, Bangalore, Karnataka 560001",
  recipientAddress: "45 MG Road, Bangalore 560001",
  items: SAMPLE_ITEMS,
  subtotal: 1102,
  discountAmt: 55,
  cgst: 52.35,
  sgst: 52.35,
  total: 1151.7,
  amountInWords: "One Thousand One Hundred Fifty One Rupees Seventy Paise Only",
  paymentMode: "UPI",
  notes: "Thank you for your business!",
  gstin: "29XYZAB5678K1Z2",
};

const SAMPLE_PURCHASE: PreviewData = {
  ...SAMPLE_INVOICE,
  shopName: "ABC Suppliers Pvt Ltd",
  customerName: "My Store",
  supplierAddress: "456 Industrial Area, Bangalore 560058",
  recipientAddress: "123 Main St, Bangalore 560001",
};

const SAMPLE_QUOTATION: PreviewData = {
  ...SAMPLE_INVOICE,
  invoiceNo: "QT-2024-042",
};

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle className="text-base">Document Templates</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Full sample previews — same templates for invoices, purchase orders, and quotations.
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start rounded-none border-b shrink-0 mx-0 px-4">
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

          <TabsContent value="invoice" className="flex-1 m-0 overflow-auto p-2">
            <div className="space-y-4">
              {TEMPLATES.map((t) => (
                <div key={t.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{t.label}</h3>
                    {onSelectTemplate && (
                      <button
                        type="button"
                        onClick={() => onSelectTemplate(t.id)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          selectedTemplate === t.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        {selectedTemplate === t.id ? "Selected" : "Use this"}
                      </button>
                    )}
                  </div>
                  <div className="rounded border bg-muted/30 p-1 overflow-x-auto">
                    <InvoiceTemplatePreview template={t.id} data={SAMPLE_INVOICE} />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="purchase" className="flex-1 m-0 overflow-auto p-2">
            <div className="space-y-4">
              {TEMPLATES.map((t) => (
                <div key={t.id} className="space-y-1">
                  <h3 className="text-sm font-semibold">{t.label}</h3>
                  <div className="rounded border bg-muted/30 p-1 overflow-x-auto">
                    <InvoiceTemplatePreview template={t.id} data={SAMPLE_PURCHASE} />
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="quotation" className="flex-1 m-0 overflow-auto p-2">
            <div className="space-y-4">
              {TEMPLATES.map((t) => (
                <div key={t.id} className="space-y-1">
                  <h3 className="text-sm font-semibold">{t.label}</h3>
                  <div className="rounded border bg-muted/30 p-1 overflow-x-auto">
                    <InvoiceTemplatePreview template={t.id} data={SAMPLE_QUOTATION} />
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
