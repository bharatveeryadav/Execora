/**
 * @execora/shared — Industry-level demo invoices for template previews.
 * 14+ real-world samples: Invoice, Purchase, Quotation across industries.
 * PDF sizes: A4 (210×297mm), A5 (148×210mm), Thermal 80mm.
 */

export type PdfPageSize = "A4" | "A5" | "thermal-80mm";

export interface DemoInvoiceItem {
  name: string;
  qty: number;
  unit: string;
  rate: number;
  discount: number;
  amount: number;
  hsnCode?: string;
  /** MRP (for retail templates like DMart) — when present, items table shows MRP column */
  mrp?: number;
}

export interface DemoInvoiceData {
  invoiceNo: string;
  date: string;
  shopName: string;
  customerName: string;
  supplierGstin?: string;
  supplierAddress?: string;
  recipientAddress?: string;
  compositionScheme?: boolean;
  items: DemoInvoiceItem[];
  subtotal: number;
  discountAmt: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  total: number;
  amountInWords: string;
  paymentMode?: string;
  notes?: string;
  upiId?: string;
  /** Bank details for payment section (Pay using UPI + Bank Details) */
  bankName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  bankBranch?: string;
  gstin?: string;
  reverseCharge?: boolean;
  /** Suggested PDF size for this demo */
  pageSize?: PdfPageSize;
  /** Industry label for UI */
  industry?: string;
  /** Invoice tags (e.g. B2B, B2C, COD) — shown on PDF */
  tags?: string[];
  /** Demo logo placeholder: amazon, tata, dmart, nike, instagram, unilever, service */
  logoPlaceholder?: string;
  /** Ship To address (for compact Bill To / Ship To layout) */
  shipToAddress?: string;
  /** Theme label shown at top (e.g. MODERN, ELEGANT, MRP + DISCOUNT, SERVICE TEMPLATE, VINTAGE) */
  themeLabel?: string;
  /** Place of supply (e.g. 09-UTTARPRADESH, 27-MAHARASHTRA) — matches sample format */
  placeOfSupply?: string;
  /** Due date (same format as date) */
  dueDate?: string;
}

function amountWords(n: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  if (n < 20) return ones[n] || (n < 10 ? ones[n] : "Ten");
  if (n < 100) return (tens[Math.floor(n / 10)] + " " + ones[n % 10]).trim();
  if (n < 1000) return (ones[Math.floor(n / 100)] + " Hundred " + amountWords(n % 100)).trim();
  if (n < 100000) return (amountWords(Math.floor(n / 1000)) + " Thousand " + amountWords(n % 1000)).trim();
  if (n < 10000000) return (amountWords(Math.floor(n / 100000)) + " Lakh " + amountWords(n % 100000)).trim();
  return "Rupees " + n.toFixed(0) + " Only";
}

// ─── 14+ Industry Demo Invoices ─────────────────────────────────────────────

/** 1. Kirana / Grocery Retail — A4 */
export const DEMO_KIRANA: DemoInvoiceData = {
  invoiceNo: "INV-2025-001",
  date: "17-Mar-2025",
  shopName: "Sharma Kirana Store",
  customerName: "Ramesh Kumar",
  supplierGstin: "09AABCS1234F1Z5",
  supplierAddress: "45 Main Bazar, Sadar Bazaar, Delhi 110006",
  recipientAddress: "H.No 12, Block A, Rohini, Delhi 110085",
  items: [
    { name: "Basmati Rice 5kg", qty: 2, unit: "pkt", rate: 450, discount: 0, amount: 900, hsnCode: "1006" },
    { name: "Toor Dal 1kg", qty: 3, unit: "pkt", rate: 130, discount: 5, amount: 370.5, hsnCode: "0713" },
    { name: "Sunflower Oil 1L", qty: 2, unit: "bottle", rate: 180, discount: 0, amount: 360, hsnCode: "1507" },
    { name: "Aata 10kg", qty: 1, unit: "bag", rate: 380, discount: 0, amount: 380, hsnCode: "1102" },
    { name: "Sugar 1kg", qty: 5, unit: "pkt", rate: 48, discount: 0, amount: 240, hsnCode: "1701" },
  ],
  subtotal: 2250.5,
  discountAmt: 112.53,
  cgst: 101.7,
  sgst: 101.7,
  total: 2339.37,
  amountInWords: "Two Thousand Three Hundred Thirty Nine Rupees Thirty Seven Paise Only",
  paymentMode: "UPI",
  notes: "Thank you! Visit again.",
  gstin: "07ABCDE1234F1Z5",
  pageSize: "A4",
  industry: "Kirana / Grocery",
  tags: ["B2C", "Retail"],
};

/** 2. Restaurant / F&B — Thermal 80mm */
export const DEMO_RESTAURANT: DemoInvoiceData = {
  invoiceNo: "BILL-0842",
  date: "17-Mar-2025",
  shopName: "Taj Dhaba & Restaurant",
  customerName: "Walk-in Customer",
  supplierGstin: "27AABCT5678K1Z2",
  supplierAddress: "Highway Road, Pune 411001",
  items: [
    { name: "Dal Makhani", qty: 2, unit: "plate", rate: 180, discount: 0, amount: 360, hsnCode: "1904" },
    { name: "Paneer Butter Masala", qty: 1, unit: "plate", rate: 220, discount: 0, amount: 220, hsnCode: "0406" },
    { name: "Tandoori Roti", qty: 4, unit: "pcs", rate: 25, discount: 0, amount: 100, hsnCode: "1905" },
    { name: "Lassi", qty: 2, unit: "glass", rate: 60, discount: 0, amount: 120, hsnCode: "0403" },
  ],
  subtotal: 800,
  discountAmt: 0,
  cgst: 36,
  sgst: 36,
  total: 872,
  amountInWords: "Eight Hundred Seventy Two Rupees Only",
  paymentMode: "Cash",
  notes: "Thank you for dining with us!",
  pageSize: "thermal-80mm",
  industry: "Restaurant / F&B",
  tags: ["B2C", "Walk-in"],
};

/** 3. Electronics B2B — A4 */
export const DEMO_ELECTRONICS: DemoInvoiceData = {
  invoiceNo: "INV/EL/2025-156",
  date: "16-Mar-2025",
  shopName: "TechMart Electronics Pvt Ltd",
  customerName: "Smart Solutions India",
  supplierGstin: "29AABCT9012M1Z5",
  supplierAddress: "Electronic City Phase 1, Bangalore 560100",
  recipientAddress: "IT Park, Sec 62, Noida 201301",
  items: [
    { name: "Laptop Dell Inspiron 15", qty: 5, unit: "pcs", rate: 52000, discount: 3, amount: 252200, hsnCode: "8471" },
    { name: "Wireless Mouse Logitech", qty: 10, unit: "pcs", rate: 650, discount: 0, amount: 6500, hsnCode: "8471" },
    { name: "USB-C Hub 7-in-1", qty: 5, unit: "pcs", rate: 1899, discount: 5, amount: 9015.25, hsnCode: "8473" },
  ],
  subtotal: 267715.25,
  discountAmt: 0,
  cgst: 0,
  sgst: 0,
  igst: 48288.75,
  total: 316004,
  amountInWords: "Three Lakh Sixteen Thousand Four Rupees Only",
  paymentMode: "Bank Transfer",
  gstin: "09AABCS5678K1Z2",
  pageSize: "A4",
  industry: "Electronics B2B",
  tags: ["B2B", "Credit"],
};

/** 4. Hardware / Construction — A4 */
export const DEMO_HARDWARE: DemoInvoiceData = {
  invoiceNo: "HW-2025-0892",
  date: "15-Mar-2025",
  shopName: "Bharat Hardware & Builders",
  customerName: "ABC Constructions",
  supplierGstin: "07AABCH3456F1Z5",
  supplierAddress: "Industrial Area, Faridabad 121003",
  recipientAddress: "Site Office, Gurugram 122001",
  items: [
    { name: "Portland Cement 50kg", qty: 100, unit: "bags", rate: 380, discount: 2, amount: 37240, hsnCode: "2523" },
    { name: "TMT Steel Bar 12mm", qty: 50, unit: "qty", rate: 62, discount: 0, amount: 3100, hsnCode: "7214" },
    { name: "River Sand 1 truck", qty: 2, unit: "truck", rate: 8500, discount: 0, amount: 17000, hsnCode: "2505" },
    { name: "Bricks Red 1000 pcs", qty: 20, unit: "lot", rate: 6500, discount: 1, amount: 128700, hsnCode: "6901" },
  ],
  subtotal: 186040,
  discountAmt: 3720.8,
  cgst: 8215.96,
  sgst: 8215.96,
  total: 189750.12,
  amountInWords: "One Lakh Eighty Nine Thousand Seven Hundred Fifty Rupees Twelve Paise Only",
  paymentMode: "Credit",
  gstin: "06AABCS7890K1Z2",
  notes: "Delivery as per PO. Payment within 30 days.",
  pageSize: "A4",
  industry: "Hardware / Construction",
};

/** 5. Clothing / Textiles — A4 */
export const DEMO_CLOTHING: DemoInvoiceData = {
  invoiceNo: "INV/TX/2025-234",
  date: "16-Mar-2025",
  shopName: "Fashion Hub Garments",
  customerName: "Style Retail Pvt Ltd",
  supplierGstin: "33AABCF1234F1Z5",
  supplierAddress: "T Nagar, Chennai 600017",
  recipientAddress: "MG Road, Bangalore 560001",
  items: [
    { name: "Men's Formal Shirt", qty: 50, unit: "pcs", rate: 899, discount: 10, amount: 40455, hsnCode: "6205" },
    { name: "Women's Saree Cotton", qty: 30, unit: "pcs", rate: 1299, discount: 5, amount: 37021.5, hsnCode: "6204" },
    { name: "Kids T-Shirt Pack 3", qty: 20, unit: "pack", rate: 599, discount: 0, amount: 11980, hsnCode: "6109" },
  ],
  subtotal: 89456.5,
  discountAmt: 0,
  cgst: 0,
  sgst: 0,
  igst: 16102.17,
  total: 105558.67,
  amountInWords: "One Lakh Five Thousand Five Hundred Fifty Eight Rupees Sixty Seven Paise Only",
  paymentMode: "UPI",
  gstin: "29AABCS3456K1Z2",
  pageSize: "A4",
  industry: "Clothing / Textiles",
};

/** 6. Pharmacy — Thermal 80mm */
export const DEMO_PHARMACY: DemoInvoiceData = {
  invoiceNo: "RX-4521",
  date: "17-Mar-2025",
  shopName: "MedPlus Pharmacy",
  customerName: "Suresh Patel",
  supplierGstin: "36AABCM5678K1Z2",
  supplierAddress: "Jubilee Hills, Hyderabad 500033",
  recipientAddress: "Flat 302, Banjara Hills, Hyderabad",
  items: [
    { name: "Paracetamol 650mg 15 tabs", qty: 2, unit: "strip", rate: 25, discount: 0, amount: 50, hsnCode: "3004" },
    { name: "Cetirizine 10mg 10 tabs", qty: 1, unit: "strip", rate: 35, discount: 0, amount: 35, hsnCode: "3004" },
    { name: "Dolo 650 Strip", qty: 1, unit: "strip", rate: 30, discount: 0, amount: 30, hsnCode: "3004" },
    { name: "Vitamin D3 60K 4 sachets", qty: 1, unit: "box", rate: 180, discount: 5, amount: 171, hsnCode: "3004" },
  ],
  subtotal: 286,
  discountAmt: 0,
  cgst: 12.87,
  sgst: 12.87,
  total: 311.74,
  amountInWords: "Three Hundred Eleven Rupees Seventy Four Paise Only",
  paymentMode: "UPI",
  gstin: "36AABCS9012K1Z2",
  notes: "Store in cool place. Use as directed by physician.",
  pageSize: "thermal-80mm",
  industry: "Pharmacy",
};

/** 7. Cosmetics / Beauty — A5 */
export const DEMO_COSMETICS: DemoInvoiceData = {
  invoiceNo: "INV/BT-2025-067",
  date: "15-Mar-2025",
  shopName: "Glow Beauty Parlour",
  customerName: "Priya Sharma",
  supplierGstin: "07AABCB7890F1Z5",
  supplierAddress: "Sector 18, Noida 201301",
  items: [
    { name: "Facial Cleanup", qty: 1, unit: "session", rate: 800, discount: 0, amount: 800, hsnCode: "9986" },
    { name: "Hair Spa", qty: 1, unit: "session", rate: 1200, discount: 10, amount: 1080, hsnCode: "9986" },
    { name: "Bleach Full Face", qty: 1, unit: "session", rate: 350, discount: 0, amount: 350, hsnCode: "9986" },
    { name: "Face Pack", qty: 1, unit: "session", rate: 250, discount: 0, amount: 250, hsnCode: "9986" },
  ],
  subtotal: 2480,
  discountAmt: 0,
  cgst: 223.2,
  sgst: 223.2,
  total: 2926.4,
  amountInWords: "Two Thousand Nine Hundred Twenty Six Rupees Forty Paise Only",
  paymentMode: "Card",
  notes: "Thank you for choosing Glow!",
  pageSize: "A5",
  industry: "Cosmetics / Beauty",
};

/** 8. Automobile Parts — A4 */
export const DEMO_AUTO_PARTS: DemoInvoiceData = {
  invoiceNo: "AUTO/2025-3421",
  date: "14-Mar-2025",
  shopName: "Speed Auto Parts & Services",
  customerName: "City Motors Pvt Ltd",
  supplierGstin: "27AABCA1234F1Z5",
  supplierAddress: "Auto Nagar, Pune 411018",
  recipientAddress: "Service Center, Mumbai 400001",
  items: [
    { name: "Engine Oil 5W30 4L", qty: 10, unit: "can", rate: 2400, discount: 5, amount: 22800, hsnCode: "2710" },
    { name: "Oil Filter", qty: 10, unit: "pcs", rate: 350, discount: 0, amount: 3500, hsnCode: "8421" },
    { name: "Air Filter", qty: 5, unit: "pcs", rate: 450, discount: 0, amount: 2250, hsnCode: "8421" },
    { name: "Brake Pads Set", qty: 2, unit: "set", rate: 2800, discount: 3, amount: 5432, hsnCode: "8708" },
  ],
  subtotal: 33982,
  discountAmt: 0,
  cgst: 0,
  sgst: 0,
  igst: 6116.76,
  total: 40098.76,
  amountInWords: "Forty Thousand Ninety Eight Rupees Seventy Six Paise Only",
  paymentMode: "Credit",
  gstin: "27AABCS5678K1Z2",
  notes: "Warranty as per manufacturer. 30 days credit.",
  pageSize: "A4",
  industry: "Automobile Parts",
};

/** 9. Stationery / Office — A5 */
export const DEMO_STATIONERY: DemoInvoiceData = {
  invoiceNo: "STN-2025-089",
  date: "17-Mar-2025",
  shopName: "Paper World Stationers",
  customerName: "Excel Academy",
  supplierGstin: "09AABCS2345F1Z5",
  supplierAddress: "Connaught Place, Delhi 110001",
  recipientAddress: "Sector 44, Gurugram 122003",
  items: [
    { name: "A4 Paper 500 sheets", qty: 20, unit: "ream", rate: 280, discount: 2, amount: 5488, hsnCode: "4802" },
    { name: "Blue Ball Pen", qty: 100, unit: "pcs", rate: 12, discount: 0, amount: 1200, hsnCode: "9608" },
    { name: "Stapler Heavy Duty", qty: 5, unit: "pcs", rate: 250, discount: 0, amount: 1250, hsnCode: "8305" },
    { name: "File Folders 100 pcs", qty: 2, unit: "pack", rate: 450, discount: 0, amount: 900, hsnCode: "4820" },
  ],
  subtotal: 8838,
  discountAmt: 176.76,
  cgst: 389.76,
  sgst: 389.76,
  total: 9440.76,
  amountInWords: "Nine Thousand Four Hundred Forty Rupees Seventy Six Paise Only",
  paymentMode: "UPI",
  gstin: "06AABCS6789K1Z2",
  pageSize: "A5",
  industry: "Stationery / Office",
};

/** 10. Jewellery — A4 */
export const DEMO_JEWELLERY: DemoInvoiceData = {
  invoiceNo: "JWL/2025-156",
  date: "16-Mar-2025",
  shopName: "Kohinoor Jewellers",
  customerName: "Mrs. Anjali Mehta",
  supplierGstin: "27AABCJ5678K1Z2",
  supplierAddress: "Jewelers Street, Pune 411002",
  recipientAddress: "Koregaon Park, Pune 411001",
  items: [
    { name: "22K Gold Bangle 10g", qty: 1, unit: "pcs", rate: 62500, discount: 0, amount: 62500, hsnCode: "7113" },
    { name: "Making Charges", qty: 1, unit: "pcs", rate: 2500, discount: 0, amount: 2500, hsnCode: "7113" },
    { name: "Silver Chain 15g", qty: 1, unit: "pcs", rate: 1200, discount: 0, amount: 1200, hsnCode: "7113" },
  ],
  subtotal: 66200,
  discountAmt: 0,
  cgst: 2979,
  sgst: 2979,
  total: 72158,
  amountInWords: "Seventy Two Thousand One Hundred Fifty Eight Rupees Only",
  paymentMode: "Card",
  gstin: "27AABCS1234K1Z2",
  notes: "Hallmark certified. Exchange within 7 days.",
  pageSize: "A4",
  industry: "Jewellery",
};

/** 11. Agriculture / Agri-inputs — A4 */
export const DEMO_AGRICULTURE: DemoInvoiceData = {
  invoiceNo: "AGR/2025-892",
  date: "15-Mar-2025",
  shopName: "Krishi Kendra Agri Solutions",
  customerName: "Ramesh Farmer",
  supplierGstin: "09AABCA3456F1Z5",
  supplierAddress: "Mandir Marg, Sonipat 131001",
  recipientAddress: "Village Chhapra, Sonipat",
  compositionScheme: true,
  items: [
    { name: "Urea 50kg", qty: 10, unit: "bags", rate: 266, discount: 0, amount: 2660, hsnCode: "3102" },
    { name: "DAP Fertilizer 50kg", qty: 5, unit: "bags", rate: 1350, discount: 2, amount: 6615, hsnCode: "3103" },
    { name: "Seeds Wheat 25kg", qty: 4, unit: "bags", rate: 850, discount: 0, amount: 3400, hsnCode: "1001" },
    { name: "Pesticide 1L", qty: 2, unit: "bottle", rate: 450, discount: 0, amount: 900, hsnCode: "3808" },
  ],
  subtotal: 13575,
  discountAmt: 271.5,
  cgst: 0,
  sgst: 0,
  total: 13303.5,
  amountInWords: "Thirteen Thousand Three Hundred Three Rupees Fifty Paise Only",
  paymentMode: "Cash",
  notes: "Composition scheme. Subsidy as per govt norms.",
  pageSize: "A4",
  industry: "Agriculture",
};

/** 12. E-commerce B2C — Thermal 80mm */
export const DEMO_ECOMMERCE: DemoInvoiceData = {
  invoiceNo: "OD-20250317-4521",
  date: "17-Mar-2025",
  shopName: "QuickCart India",
  customerName: "Amit Singh",
  supplierGstin: "27AABCE7890K1Z2",
  supplierAddress: "Warehouse 5, Mumbai 400069",
  recipientAddress: "B-12, Andheri West, Mumbai 400058",
  items: [
    { name: "Wireless Earbuds", qty: 1, unit: "pcs", rate: 1299, discount: 10, amount: 1169.1, hsnCode: "8518" },
    { name: "Phone Case", qty: 2, unit: "pcs", rate: 299, discount: 0, amount: 598, hsnCode: "3926" },
    { name: "Screen Guard", qty: 1, unit: "pcs", rate: 199, discount: 0, amount: 199, hsnCode: "7007" },
  ],
  subtotal: 1966.1,
  discountAmt: 0,
  cgst: 176.95,
  sgst: 176.95,
  total: 2319,
  amountInWords: "Two Thousand Three Hundred Nineteen Rupees Only",
  paymentMode: "UPI",
  gstin: "27AABCS4567K1Z2",
  notes: "Thank you for shopping! Track: quickcart.in/track/4521",
  pageSize: "thermal-80mm",
  industry: "E-commerce",
};

/** 13. Wholesale FMCG — A4 */
export const DEMO_WHOLESALE: DemoInvoiceData = {
  invoiceNo: "WH/2025-3421",
  date: "14-Mar-2025",
  shopName: "Mega Distributors Pvt Ltd",
  customerName: "City Mart Retail",
  supplierGstin: "07AABCW1234F1Z5",
  supplierAddress: "Wholesale Market, Delhi 110006",
  recipientAddress: "Retail Complex, Ghaziabad 201001",
  items: [
    { name: "Colgate 200g Carton 24", qty: 5, unit: "carton", rate: 960, discount: 3, amount: 4656, hsnCode: "3306" },
    { name: "Parle-G 100g Carton 48", qty: 10, unit: "carton", rate: 1080, discount: 2, amount: 10584, hsnCode: "1905" },
    { name: "Surf Excel 1kg Carton 12", qty: 3, unit: "carton", rate: 960, discount: 0, amount: 2880, hsnCode: "3402" },
    { name: "Dettol 500ml Carton 12", qty: 2, unit: "carton", rate: 2100, discount: 5, amount: 3990, hsnCode: "3004" },
  ],
  subtotal: 22110,
  discountAmt: 0,
  cgst: 0,
  sgst: 0,
  igst: 3980,
  total: 26090,
  amountInWords: "Twenty Six Thousand Ninety Rupees Only",
  paymentMode: "Credit",
  gstin: "09AABCS7890K1Z2",
  notes: "Minimum order ₹20,000. Credit 15 days.",
  pageSize: "A4",
  industry: "Wholesale FMCG",
};

/** 14. Services / Consulting — A4 */
export const DEMO_SERVICES: DemoInvoiceData = {
  invoiceNo: "SRV-2025-089",
  date: "17-Mar-2025",
  shopName: "TechConsult Solutions",
  customerName: "ABC Industries Ltd",
  supplierGstin: "29AABCS9012M1Z5",
  supplierAddress: "Koramangala, Bangalore 560034",
  recipientAddress: "Corporate Office, Mumbai 400001",
  items: [
    { name: "Software Consulting - March", qty: 40, unit: "hrs", rate: 2500, discount: 0, amount: 100000, hsnCode: "9983" },
    { name: "System Integration", qty: 1, unit: "project", rate: 50000, discount: 10, amount: 45000, hsnCode: "9983" },
    { name: "Training Sessions", qty: 2, unit: "day", rate: 15000, discount: 0, amount: 30000, hsnCode: "9983" },
  ],
  subtotal: 175000,
  discountAmt: 0,
  cgst: 0,
  sgst: 0,
  igst: 31500,
  total: 206500,
  amountInWords: "Two Lakh Six Thousand Five Hundred Rupees Only",
  paymentMode: "Bank Transfer",
  gstin: "27AABCS3456K1Z2",
  notes: "Payment within 30 days. TDS certificate to be issued.",
  pageSize: "A4",
  industry: "Services / Consulting",
};

/** 15. Purchase Order — Supplier to My Store */
export const DEMO_PURCHASE: DemoInvoiceData = {
  ...DEMO_KIRANA,
  invoiceNo: "PO-2025-042",
  shopName: "ABC Wholesale Traders",
  customerName: "Sharma Kirana Store",
  supplierAddress: "Wholesale Market, Azadpur, Delhi 110033",
  recipientAddress: "45 Main Bazar, Sadar Bazaar, Delhi 110006",
  items: [
    { name: "Fortune Oil 1L Carton 12", qty: 5, unit: "carton", rate: 1680, discount: 2, amount: 8232, hsnCode: "1507" },
    { name: "MDH Chole Masala 1kg", qty: 10, unit: "pkt", rate: 280, discount: 0, amount: 2800, hsnCode: "0910" },
    { name: "Tata Tea 1kg Carton 12", qty: 3, unit: "carton", rate: 2880, discount: 3, amount: 8380.8, hsnCode: "0902" },
  ],
  subtotal: 19412.8,
  discountAmt: 388.26,
  cgst: 856.1,
  sgst: 856.1,
  total: 20732.74,
  amountInWords: "Twenty Thousand Seven Hundred Thirty Two Rupees Seventy Four Paise Only",
  industry: "Purchase",
};

/** 16. Quotation / Proforma */
export const DEMO_QUOTATION: DemoInvoiceData = {
  ...DEMO_ELECTRONICS,
  invoiceNo: "QT-2025-089",
  notes: "Valid for 15 days. Prices subject to change. 50% advance for order confirmation.",
  industry: "Quotation",
};

// ─── Brand-style demos (Amazon, Tata, DMart, Nike, Instagram, Unilever, Service) ─ ─

/** Amazon-style e-commerce (MODERN) — matches sample invoice */
export const DEMO_AMAZON: DemoInvoiceData = {
  invoiceNo: "INV-1",
  date: "16-Jun-2023",
  shopName: "Amazon",
  customerName: "Ankit Agarwal",
  supplierGstin: "27AABCA1234F1Z5",
  supplierAddress: "Q-city, Hyderabad, Telangana",
  recipientAddress: "Babugani, Hasanganj, Lucknow, UTTARPRADESH, 226007",
  shipToAddress: "Babugani, Hasanganj, Lucknow, UTTARPRADESH, 226007",
  items: [
    { name: "Samsung Galaxy F23\nColor Aqua Green, Storage - 128 GB, Ram - 6 GB", qty: 1, unit: "pcs", rate: 14405.93, discount: 0, amount: 16999, hsnCode: "8517" },
    { name: "Samsung 45 Watt Travel Adapter\nEP-TAB45XINGIN, Color - Black", qty: 1, unit: "pcs", rate: 2117.8, discount: 0, amount: 2499, hsnCode: "8504" },
  ],
  subtotal: 16523.73,
  discountAmt: 0,
  igst: 2814.27,
  cgst: 0,
  sgst: 0,
  total: 19498,
  amountInWords: "Nineteen Thousand, Four Hundred And Ninety-Eight Rupees Only",
  paymentMode: "UPI",
  gstin: "09AABCS4567K1Z2",
  notes: "Thank you for shopping with Amazon.",
  pageSize: "A4",
  industry: "Amazon",
  logoPlaceholder: "amazon",
  tags: ["B2C", "E-commerce"],
  themeLabel: "MODERN",
  placeOfSupply: "09-UTTARPRADESH",
  dueDate: "16-Jun-2023",
  upiId: "amazon@paytm",
  bankName: "YES BANK",
  bankAccountNo: "66789990222445",
  bankIfsc: "YESB0004567",
  bankBranch: "KODIHALLI",
};

/** Tata-style corporate (VINTAGE) — matches sample invoice */
export const DEMO_TATA: DemoInvoiceData = {
  invoiceNo: "INV-1",
  date: "17-Jun-2023",
  shopName: "TATA MOTORS LIMITED",
  customerName: "Natarajan Chandrasekaran",
  supplierGstin: "27AAACT272791ZW",
  supplierAddress: "Nigodi Bhusari Road, Pimpri, Pune, MAHARASHTRA, 411018",
  recipientAddress: "Survey 115/1, SB Rd, Financial District, Gachibowli, Nanakramguda, Hyderabad, TELANGANA, 500032",
  shipToAddress: "Survey 115/1, SB Rd, Financial District, Gachibowli, Nanakramguda, Hyderabad, TELANGANA, 500032",
  items: [
    { name: "Tata Nexon", qty: 1, unit: "pcs", rate: 805000, discount: 0, amount: 949900, hsnCode: "87038010" },
    { name: "Car accessories Kit\n1. Item - Car cover\n2. Item - Cleaning spray", qty: 1, unit: "pcs", rate: 2117.8, discount: 0, amount: 2499, hsnCode: "87089900" },
  ],
  subtotal: 807117.8,
  discountAmt: 0,
  igst: 145281.2,
  cgst: 0,
  sgst: 0,
  total: 952399,
  amountInWords: "Nine Lakh, Fifty-Two Thousand, Three Hundred And Ninety-Nine Rupees Only",
  paymentMode: "Bank Transfer",
  gstin: "36AABCS7890K1Z2",
  notes: "Thank you for the Business",
  pageSize: "A4",
  industry: "Tata",
  logoPlaceholder: "tata",
  tags: ["B2B", "Automotive"],
  themeLabel: "VINTAGE",
  placeOfSupply: "36-TELANGANA",
  dueDate: "17-Jun-2023",
  upiId: "tata@paytm",
  bankName: "YES BANK",
  bankAccountNo: "66789999222446",
  bankIfsc: "YESB0H9567",
  bankBranch: "KODIHALLI",
};

/** DMart-style retail (MRP + DISCOUNT) — matches sample invoice */
export const DEMO_DMART: DemoInvoiceData = {
  invoiceNo: "INV-1",
  date: "16-Jun-2023",
  shopName: "D Mart",
  customerName: "Radhakishan Damani",
  supplierGstin: "27BDLEP3836R2UT",
  supplierAddress: "35/4, Datta Nagar Road Katraj Bypass Road, Opposite Trimurti Garden Ambegaon Budruk, Pune, MAHARASHTRA, 411046",
  recipientAddress: "Phase 3, Hinjewadi Rajiv Gandhi Infotech Park, Pune, MAHARASHTRA, 411057",
  shipToAddress: "Phase 3, Hinjewadi Rajiv Gandhi Infotech Park, Pune, MAHARASHTRA, 411057",
  items: [
    { name: "Pearlpet Plastic Bottles", qty: 6, unit: "KGS", rate: 99, discount: 0, amount: 594, hsnCode: "392330", mrp: 99 },
    { name: "Haldiram's Bhujia Sev", qty: 1, unit: "pcs", rate: 189, discount: 0, amount: 189, hsnCode: "1905", mrp: 189 },
    { name: "Premium Modjool Dates", qty: 2, unit: "KGS", rate: 1999, discount: 0, amount: 3998, hsnCode: "0804", mrp: 1999 },
    { name: "Comfort After Wash Fabric Conditioner", qty: 1, unit: "LTR", rate: 379, discount: 0, amount: 379, hsnCode: "3405", mrp: 379 },
  ],
  subtotal: 4849.05,
  discountAmt: 310.95,
  cgst: 145.47,
  sgst: 145.47,
  total: 5140,
  amountInWords: "Five Thousand, One Hundred And Forty Rupees Only",
  paymentMode: "UPI",
  gstin: "27AABCDM5678K1Z2",
  notes: "Thank you for the Business",
  pageSize: "A4",
  industry: "DMart",
  logoPlaceholder: "dmart",
  tags: ["B2C", "Retail"],
  themeLabel: "MRP + DISCOUNT",
  placeOfSupply: "27-MAHARASHTRA",
  dueDate: "16-Jun-2023",
  upiId: "dmart@paytm",
  bankName: "YES BANK",
  bankAccountNo: "66789999222445",
  bankIfsc: "YESBBN1567",
  bankBranch: "KODIHALLI",
};

/** Nike-style sportswear (ELEGANT) — matches sample invoice */
export const DEMO_NIKE: DemoInvoiceData = {
  invoiceNo: "INV-1",
  date: "16-Jun-2023",
  shopName: "Nike",
  customerName: "Saahil Iyer",
  supplierGstin: "27ABCCT2727O1ZX",
  supplierAddress: "Olympia Building, 66/1 Bagmane TechPark, Bengaluru, KARNATAKA, 580093",
  recipientAddress: "Jeevantara building, Sansad Maarg, Delhi, DELHI, 110001",
  shipToAddress: "Jeevantara building, Sansad Maarg, Delhi, DELHI, 110001",
  items: [
    { name: "Nike Air Force 1'07", qty: 1, unit: "pair", rate: 6799, discount: 0, amount: 6799, hsnCode: "640110" },
    { name: "Nike Dri-FIT Sport Clash Men's Training T-shirt", qty: 1, unit: "pcs", rate: 1499, discount: 0, amount: 1499, hsnCode: "61091000" },
  ],
  subtotal: 8258,
  discountAmt: 0,
  igst: 1483.84,
  cgst: 0,
  sgst: 0,
  total: 9792,
  amountInWords: "Nine Thousand, Seven Hundred And Ninety-Two Rupees Only",
  paymentMode: "UPI",
  gstin: "07ABCDE1234F1Z5",
  notes: "Just Do It.",
  pageSize: "A4",
  industry: "Nike",
  logoPlaceholder: "nike",
  tags: ["B2C", "Sportswear"],
  themeLabel: "ELEGANT",
  placeOfSupply: "07-DELHI",
  dueDate: "16-Jun-2023",
  upiId: "nike@paytm",
  bankName: "YES BANK",
  bankAccountNo: "86789999222445",
  bankIfsc: "YESB0004567",
  bankBranch: "KODIHALLI",
};

/** Instagram-style SERVICE TEMPLATE — matches sample invoice */
export const DEMO_INSTAGRAM: DemoInvoiceData = {
  invoiceNo: "INV-1",
  date: "16-Jun-2023",
  shopName: "Instagram",
  customerName: "Adam Mosseri",
  supplierGstin: "35ABCCS2942R1ZR",
  supplierAddress: "Block 3, Indira Nagar, Gachibowli, Hyderabad, TELANGANA, 600032",
  recipientAddress: "Survey 115/1, 158 Rd, Financial District, Gachibowli, Nanakaramguda, Hyderabad, TELANGANA, 500032",
  shipToAddress: "Survey 115/1, 158 Rd, Financial District, Gachibowli, Nanakaramguda, Hyderabad, TELANGANA, 500032",
  items: [
    { name: "Digital Marketing\nFacebook Ads for 1 Month - 5 Paid campaigns - 20 Ads\nInstagram Ad - Organic + Reels and Story Ads", qty: 1, unit: "lot", rate: 21186, discount: 0, amount: 21186, hsnCode: "45346" },
    { name: "Logo Designing", qty: 1, unit: "lot", rate: 5000, discount: 0, amount: 5000, hsnCode: "" },
    { name: "Professional fee", qty: 1, unit: "lot", rate: 1694.92, discount: 0, amount: 1694.92, hsnCode: "" },
  ],
  subtotal: 27880.92,
  discountAmt: 0,
  cgst: 2509.28,
  sgst: 2509.28,
  total: 32899,
  amountInWords: "Thirty-Two Thousand, Eight Hundred And Ninety-Nine Rupees Only",
  paymentMode: "UPI",
  gstin: "27ABCCS294281ZR",
  notes: "Thank you for the Business",
  pageSize: "A4",
  industry: "Instagram",
  logoPlaceholder: "instagram",
  tags: ["B2B", "Digital"],
  themeLabel: "SERVICE TEMPLATE",
  placeOfSupply: "36-TELANGANA",
  dueDate: "16-Jun-2023",
  upiId: "instagram@paytm",
  bankName: "YES BANK",
  bankAccountNo: "66799999222445",
  bankIfsc: "YESB0IN4567",
  bankBranch: "KOTHALI",
};

/** Unilever-style FMCG */
export const DEMO_UNILEVER: DemoInvoiceData = {
  invoiceNo: "UL/2025-3421",
  date: "14-Mar-2025",
  shopName: "Hindustan Unilever",
  customerName: "Mega Distributors Pvt Ltd",
  supplierGstin: "27AABCU1234F1Z5",
  supplierAddress: "Unilever House, Mumbai 400099",
  recipientAddress: "Wholesale Market, Delhi 110006",
  items: [
    { name: "Surf Excel 1kg Carton 12", qty: 10, unit: "carton", rate: 960, discount: 2, amount: 9408, hsnCode: "3402" },
    { name: "Dove Soap Carton 24", qty: 5, unit: "carton", rate: 1200, discount: 0, amount: 6000, hsnCode: "3401" },
    { name: "Lux Soap Carton 24", qty: 8, unit: "carton", rate: 720, discount: 1, amount: 5702.4, hsnCode: "3401" },
  ],
  subtotal: 21110.4,
  discountAmt: 0,
  cgst: 1899.94,
  sgst: 1899.94,
  total: 24910.28,
  amountInWords: "Twenty Four Thousand Nine Hundred Ten Rupees Twenty Eight Paise Only",
  paymentMode: "Credit",
  gstin: "06AABCS7890K1Z2",
  notes: "Delivery as per PO. Credit 15 days.",
  pageSize: "A4",
  industry: "Unilever",
  logoPlaceholder: "unilever",
  tags: ["B2B", "FMCG"],
  placeOfSupply: "07-DELHI",
  dueDate: "29-Mar-2025",
  upiId: "unilever@paytm",
  bankName: "YES BANK",
  bankAccountNo: "66789999222445",
  bankIfsc: "YESB0004567",
  bankBranch: "KODIHALLI",
};

/** Service template — compact Bill To / Ship To */
export const DEMO_SERVICE_BILL_SHIP: DemoInvoiceData = {
  invoiceNo: "SRV-2025-156",
  date: "17-Mar-2025",
  shopName: "Logistics Pro",
  customerName: "ABC Industries Ltd",
  supplierGstin: "29AABCS9012M1Z5",
  supplierAddress: "Koramangala, Bangalore 560034",
  recipientAddress: "Corporate Office, Mumbai 400001",
  shipToAddress: "Warehouse 5, Bhiwandi, Mumbai 421302",
  items: [
    { name: "Freight - Bangalore to Mumbai", qty: 1, unit: "trip", rate: 25000, discount: 0, amount: 25000, hsnCode: "9965" },
    { name: "Packaging & Handling", qty: 1, unit: "lot", rate: 5000, discount: 0, amount: 5000, hsnCode: "9985" },
  ],
  subtotal: 30000,
  discountAmt: 0,
  cgst: 2700,
  sgst: 2700,
  total: 35400,
  amountInWords: "Thirty Five Thousand Four Hundred Rupees Only",
  paymentMode: "Bank Transfer",
  gstin: "27AABCS3456K1Z2",
  notes: "Bill To: Corporate Office. Ship To: Warehouse. Delivery within 5 days.",
  pageSize: "A4",
  industry: "Service",
  logoPlaceholder: "service",
  tags: ["B2B", "Logistics"],
  themeLabel: "SERVICE",
  placeOfSupply: "27-MAHARASHTRA",
  dueDate: "24-Mar-2025",
  upiId: "logistics@paytm",
  bankName: "YES BANK",
  bankAccountNo: "66789999222445",
  bankIfsc: "YESB0004567",
  bankBranch: "KODIHALLI",
};

// ─── Exports ────────────────────────────────────────────────────────────────

/** All demo invoices — brand-style + industry */
export const DEMO_INVOICES: DemoInvoiceData[] = [
  DEMO_AMAZON,
  DEMO_TATA,
  DEMO_DMART,
  DEMO_NIKE,
  DEMO_INSTAGRAM,
  DEMO_UNILEVER,
  DEMO_SERVICE_BILL_SHIP,
  DEMO_KIRANA,
  DEMO_RESTAURANT,
  DEMO_ELECTRONICS,
  DEMO_HARDWARE,
  DEMO_CLOTHING,
  DEMO_PHARMACY,
  DEMO_COSMETICS,
  DEMO_AUTO_PARTS,
  DEMO_STATIONERY,
  DEMO_JEWELLERY,
  DEMO_AGRICULTURE,
  DEMO_ECOMMERCE,
  DEMO_WHOLESALE,
  DEMO_SERVICES,
];

/** Purchase & Quotation demos */
export const DEMO_PURCHASES: DemoInvoiceData[] = [
  DEMO_PURCHASE,
  { ...DEMO_ELECTRONICS, shopName: "TechMart Electronics", customerName: "My Store", invoiceNo: "PO-EL-089", industry: "Purchase" },
  { ...DEMO_HARDWARE, shopName: "Bharat Hardware", customerName: "My Store", invoiceNo: "PO-HW-042", industry: "Purchase" },
];

export const DEMO_QUOTATIONS: DemoInvoiceData[] = [
  DEMO_QUOTATION,
  { ...DEMO_SERVICES, invoiceNo: "QT-SRV-089", industry: "Quotation" },
  { ...DEMO_CLOTHING, invoiceNo: "QT-TX-156", industry: "Quotation" },
];
