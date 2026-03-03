/**
 * GSTR-1 & P&L Report Service — Indian GST compliance
 *
 * GSTR-1 is the monthly/quarterly outward supply return filed with the
 * GST portal. This service produces the data in standard GSTR-1 format:
 *  - B2B: Invoices to GST-registered buyers (with buyer GSTIN)
 *  - B2CL: Inter-state invoices to unregistered buyers > ₹2.5L per invoice
 *  - B2CS: All other invoices to unregistered buyers (intra-state / small inter-state)
 *  - HSN: HSN-wise summary of outward supplies
 *
 * P&L Report:
 *  - Month-wise revenue, tax collected, discounts, payments received
 *  - Period comparison (current vs previous)
 *
 * References:
 *  - GST Council GSTR-1 format (Form GSTR-1)
 *  - CBIC HSN reporting threshold: ≥ ₹5Cr turnover → 6-digit HSN, otherwise 4-digit
 */

import { prisma } from '@execora/infrastructure';
import { logger } from '@execora/infrastructure';

// ── Indian state codes (GST portal standard) ─────────────────────────────────
export const INDIAN_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

// State name → state code reverse lookup (lowercase)
const STATE_NAME_TO_CODE: Record<string, string> = {};
for (const [code, name] of Object.entries(INDIAN_STATE_CODES)) {
  STATE_NAME_TO_CODE[name.toLowerCase()] = code;
}

/** Extract 2-digit state code from GSTIN (first 2 chars) */
function stateCodeFromGstin(gstin: string): string {
  return gstin.substring(0, 2);
}

/** Extract state name from GSTIN */
function stateNameFromGstin(gstin: string): string {
  const code = stateCodeFromGstin(gstin);
  return INDIAN_STATE_CODES[code] ?? 'Unknown';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Indian financial year string for a given date (e.g. "2025-26") */
export function getIndianFY(date: Date = new Date()): string {
  const year  = date.getFullYear();
  const month = date.getMonth() + 1; // 1=Jan
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

/** Get start and end Date for a given Indian FY string ("2025-26") */
export function indianFYRange(fy: string): { from: Date; to: Date } {
  const [startYear] = fy.split('-').map(Number);
  return {
    from: new Date(startYear, 3, 1),           // April 1
    to:   new Date(startYear + 1, 2, 31, 23, 59, 59, 999), // March 31
  };
}

// ── B2B entry ─────────────────────────────────────────────────────────────────

export interface Gstr1B2BEntry {
  receiverGstin:  string;
  receiverName:   string;
  invoiceNo:      string;
  invoiceDate:    string;  // DD/MM/YYYY
  invoiceValue:   number;
  placeOfSupply:  string;  // state code e.g. "07"
  reverseCharge:  'Y' | 'N';
  taxableValue:   number;
  igst:           number;
  cgst:           number;
  sgst:           number;
  cess:           number;
}

// ── B2CL entry (inter-state, value > 2.5L, unregistered) ─────────────────────

export interface Gstr1B2CLEntry {
  invoiceNo:     string;
  invoiceDate:   string;
  invoiceValue:  number;
  placeOfSupply: string;
  taxableValue:  number;
  igst:          number;
  cess:          number;
}

// ── B2CS entry (all other unregistered supplies) ──────────────────────────────

export interface Gstr1B2CSEntry {
  supplyType:    'Intra-State' | 'Inter-State';
  placeOfSupply: string;
  gstRate:       number;
  taxableValue:  number;
  igst:          number;
  cgst:          number;
  sgst:          number;
  cess:          number;
}

// ── HSN summary entry ─────────────────────────────────────────────────────────

export interface Gstr1HsnEntry {
  hsnCode:      string;
  description:  string;
  uqc:          string;  // Unit Quantity Code (NOS, KGS, LTR, etc.)
  totalQty:     number;
  totalValue:   number;
  taxableValue: number;
  igst:         number;
  cgst:         number;
  sgst:         number;
  cess:         number;
  gstRate:      number;
}

// ── Full GSTR-1 report ────────────────────────────────────────────────────────

export interface Gstr1Report {
  period:     { from: string; to: string };
  fy:         string;
  gstin:      string;
  legalName:  string;
  b2b:        Gstr1B2BEntry[];
  b2cl:       Gstr1B2CLEntry[];
  b2cs:       Gstr1B2CSEntry[];
  hsn:        Gstr1HsnEntry[];
  totals: {
    totalTaxableValue: number;
    totalIgst:         number;
    totalCgst:         number;
    totalSgst:         number;
    totalCess:         number;
    totalTaxValue:     number;
    totalInvoiceValue: number;
    invoiceCount:      number;
  };
}

// ── P&L types ─────────────────────────────────────────────────────────────────

export interface PnlMonthEntry {
  month:        string;  // "Apr 2025"
  invoiceCount: number;
  revenue:      number;
  taxCollected: number;
  discounts:    number;
  collected:    number;
  outstanding:  number;
  netRevenue:   number; // revenue - discounts
}

export interface PnlReport {
  period:      { from: string; to: string };
  months:      PnlMonthEntry[];
  comparison?: PnlComparisonEntry[];
  totals: {
    invoiceCount: number;
    revenue:      number;
    taxCollected: number;
    discounts:    number;
    collected:    number;
    outstanding:  number;
    netRevenue:   number;
    collectionRate: number; // %
  };
}

export interface PnlComparisonEntry {
  label:          string;
  currentValue:   number;
  previousValue:  number;
  changePercent:  number;
}

// ── Unit Quantity Code mapping ────────────────────────────────────────────────
// Maps product unit strings to GST portal UQC codes
function unitToUqc(unit: string): string {
  const u = unit.trim().toLowerCase();
  const map: Record<string, string> = {
    'kg': 'KGS', 'kgs': 'KGS', 'kilo': 'KGS', 'kilogram': 'KGS',
    'g': 'GMS', 'gm': 'GMS', 'gms': 'GMS', 'gram': 'GMS', 'grams': 'GMS',
    'l': 'LTR', 'ltr': 'LTR', 'litre': 'LTR', 'liter': 'LTR', 'liters': 'LTR',
    'ml': 'MLT', 'mlt': 'MLT',
    'piece': 'NOS', 'pieces': 'NOS', 'pcs': 'NOS', 'nos': 'NOS', 'no': 'NOS', 'pc': 'NOS',
    'packet': 'PAC', 'pack': 'PAC', 'pkt': 'PAC', 'pac': 'PAC',
    'box': 'BOX', 'boxes': 'BOX',
    'bottle': 'BTL', 'btl': 'BTL',
    'bag': 'BAG', 'bags': 'BAG',
    'dozen': 'DZN', 'dz': 'DZN',
    'meter': 'MTR', 'mtr': 'MTR', 'mt': 'MTR',
    'set': 'SET', 'sets': 'SET',
    'pair': 'PRS', 'pairs': 'PRS',
    'roll': 'ROL', 'rolls': 'ROL',
  };
  return map[u] ?? 'OTH';
}

// ─────────────────────────────────────────────────────────────────────────────

class Gstr1Service {
  /**
   * Generate GSTR-1 report for a given tenant and date range.
   * Returns structured B2B, B2CL, B2CS, and HSN data.
   */
  async getGstr1Report(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<Gstr1Report> {
    // Set time to include full day
    const fromDate = new Date(from); fromDate.setHours(0, 0, 0, 0);
    const toDate   = new Date(to);   toDate.setHours(23, 59, 59, 999);

    // Fetch tenant info for GSTIN and state
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { gstin: true, legalName: true, tradeName: true, state: true },
    });

    // Fetch all non-cancelled, non-draft invoices in the period
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId,
        status:     { notIn: ['cancelled', 'draft'] },
        invoiceDate: { gte: fromDate, lte: toDate },
      },
      include: {
        customer: { select: { name: true, id: true } },
        items: {
          select: {
            productName: true,
            hsnCode:     true,
            quantity:    true,
            unit:        true,
            unitPrice:   true,
            subtotal:    true,
            gstRate:     true,
            cgst:        true,
            sgst:        true,
            igst:        true,
            cess:        true,
            total:       true,
          },
        },
      },
      orderBy: { invoiceDate: 'asc' },
    });

    const b2b: Gstr1B2BEntry[]  = [];
    const b2cl: Gstr1B2CLEntry[] = [];

    // B2CS aggregated by (supplyType, placeOfSupply, gstRate)
    const b2csMap = new Map<string, Gstr1B2CSEntry>();

    // HSN aggregated by (hsnCode, gstRate)
    const hsnMap = new Map<string, Gstr1HsnEntry>();

    // Totals
    let totalTaxableValue  = 0;
    let totalIgst          = 0;
    let totalCgst          = 0;
    let totalSgst          = 0;
    let totalCess          = 0;
    let totalInvoiceValue  = 0;
    let invoiceCount       = 0;

    for (const inv of invoices) {
      const total          = round2(Number(inv.total));
      const taxableVal     = round2(Number(inv.subtotal) - Number(inv.discount ?? 0));
      const cgst           = round2(Number(inv.cgst));
      const sgst           = round2(Number(inv.sgst));
      const igst           = round2(Number(inv.igst));
      const cess           = round2(Number(inv.cess ?? 0));
      const reverseCharge  = inv.reverseCharge ? 'Y' : 'N';
      const invoiceDateStr = inv.invoiceDate.toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

      invoiceCount++;
      totalTaxableValue += taxableVal;
      totalIgst         += igst;
      totalCgst         += cgst;
      totalSgst         += sgst;
      totalCess         += cess;
      totalInvoiceValue += total;

      // ── HSN summary from line items ─────────────────────────────────────
      for (const item of inv.items) {
        const hsnCode    = item.hsnCode ?? '9999'; // 9999 = unclassified services
        const gstRate    = round2(Number(item.gstRate));
        const key        = `${hsnCode}::${gstRate}`;
        const itemQty    = round2(Number(item.quantity));
        const itemTaxable = round2(Number(item.subtotal));
        const itemTotal  = round2(Number(item.total));
        const itemCgst   = round2(Number(item.cgst));
        const itemSgst   = round2(Number(item.sgst));
        const itemIgst   = round2(Number(item.igst));
        const itemCess   = round2(Number(item.cess ?? 0));

        const existing = hsnMap.get(key);
        if (existing) {
          existing.totalQty    = round2(existing.totalQty    + itemQty);
          existing.totalValue  = round2(existing.totalValue  + itemTotal);
          existing.taxableValue = round2(existing.taxableValue + itemTaxable);
          existing.igst        = round2(existing.igst        + itemIgst);
          existing.cgst        = round2(existing.cgst        + itemCgst);
          existing.sgst        = round2(existing.sgst        + itemSgst);
          existing.cess        = round2(existing.cess        + itemCess);
        } else {
          hsnMap.set(key, {
            hsnCode,
            description: item.productName,
            uqc:         unitToUqc(item.unit),
            totalQty:    itemQty,
            totalValue:  itemTotal,
            taxableValue: itemTaxable,
            igst:        itemIgst,
            cgst:        itemCgst,
            sgst:        itemSgst,
            cess:        itemCess,
            gstRate,
          });
        }
      }

      // ── B2B / B2CL / B2CS classification ────────────────────────────────
      if (inv.buyerGstin) {
        // B2B — GST-registered buyer
        const posCode = inv.placeOfSupply ?? stateCodeFromGstin(inv.buyerGstin);
        b2b.push({
          receiverGstin:  inv.buyerGstin,
          receiverName:   inv.customer?.name ?? 'Unknown',
          invoiceNo:      inv.invoiceNo,
          invoiceDate:    invoiceDateStr,
          invoiceValue:   total,
          placeOfSupply:  posCode,
          reverseCharge,
          taxableValue:   taxableVal,
          igst,
          cgst,
          sgst,
          cess,
        });
      } else {
        // Unregistered buyer — check for B2CL (inter-state > ₹2.5L)
        const isInterstate = igst > 0; // if IGST was charged, it's inter-state
        const posCode = inv.placeOfSupply ?? '';

        if (isInterstate && total > 250_000) {
          // B2CL
          b2cl.push({
            invoiceNo:     inv.invoiceNo,
            invoiceDate:   invoiceDateStr,
            invoiceValue:  total,
            placeOfSupply: posCode,
            taxableValue:  taxableVal,
            igst,
            cess,
          });
        } else {
          // B2CS — aggregate by supply type + place of supply + gst rate
          // Aggregate per gst rate (items may have multiple rates)
          // For simplicity, we bucket at invoice level using effective rate
          const supplyType = isInterstate ? 'Inter-State' : 'Intra-State';
          // Aggregate per gst rate from items
          const itemRates = new Map<number, { taxable: number; igst: number; cgst: number; sgst: number; cess: number }>();
          for (const item of inv.items) {
            const r = round2(Number(item.gstRate));
            const existing2 = itemRates.get(r);
            if (existing2) {
              existing2.taxable = round2(existing2.taxable + Number(item.subtotal));
              existing2.igst    = round2(existing2.igst    + Number(item.igst));
              existing2.cgst    = round2(existing2.cgst    + Number(item.cgst));
              existing2.sgst    = round2(existing2.sgst    + Number(item.sgst));
              existing2.cess    = round2(existing2.cess    + Number(item.cess ?? 0));
            } else {
              itemRates.set(r, {
                taxable: round2(Number(item.subtotal)),
                igst:    round2(Number(item.igst)),
                cgst:    round2(Number(item.cgst)),
                sgst:    round2(Number(item.sgst)),
                cess:    round2(Number(item.cess ?? 0)),
              });
            }
          }

          for (const [rate, rateData] of itemRates.entries()) {
            const b2csKey = `${supplyType}::${posCode}::${rate}`;
            const existing3 = b2csMap.get(b2csKey);
            if (existing3) {
              existing3.taxableValue = round2(existing3.taxableValue + rateData.taxable);
              existing3.igst         = round2(existing3.igst         + rateData.igst);
              existing3.cgst         = round2(existing3.cgst         + rateData.cgst);
              existing3.sgst         = round2(existing3.sgst         + rateData.sgst);
              existing3.cess         = round2(existing3.cess         + rateData.cess);
            } else {
              b2csMap.set(b2csKey, {
                supplyType:    supplyType as 'Intra-State' | 'Inter-State',
                placeOfSupply: posCode,
                gstRate:       rate,
                taxableValue:  rateData.taxable,
                igst:          rateData.igst,
                cgst:          rateData.cgst,
                sgst:          rateData.sgst,
                cess:          rateData.cess,
              });
            }
          }
        }
      }
    }

    const gstin     = tenant?.gstin ?? '';
    const legalName = tenant?.legalName ?? tenant?.tradeName ?? '';

    logger.info(
      { tenantId, from: fromDate.toISOString(), to: toDate.toISOString(), invoiceCount },
      'GSTR-1 report generated',
    );

    return {
      period:    { from: fromDate.toISOString(), to: toDate.toISOString() },
      fy:        getIndianFY(fromDate),
      gstin,
      legalName,
      b2b,
      b2cl,
      b2cs: [...b2csMap.values()],
      hsn:  [...hsnMap.values()].sort((a, b) => a.hsnCode.localeCompare(b.hsnCode)),
      totals: {
        totalTaxableValue:  round2(totalTaxableValue),
        totalIgst:          round2(totalIgst),
        totalCgst:          round2(totalCgst),
        totalSgst:          round2(totalSgst),
        totalCess:          round2(totalCess),
        totalTaxValue:      round2(totalIgst + totalCgst + totalSgst + totalCess),
        totalInvoiceValue:  round2(totalInvoiceValue),
        invoiceCount,
      },
    };
  }

  /**
   * Generate P&L report for a given date range.
   * Optionally provide comparison period for period-over-period analysis.
   */
  async getPnlReport(
    tenantId: string,
    from: Date,
    to: Date,
    compareFrom?: Date,
    compareTo?: Date,
  ): Promise<PnlReport> {
    const fromDate = new Date(from); fromDate.setHours(0, 0, 0, 0);
    const toDate   = new Date(to);   toDate.setHours(23, 59, 59, 999);

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          tenantId,
          status:     { notIn: ['cancelled', 'draft'] },
          invoiceDate: { gte: fromDate, lte: toDate },
        },
        select: {
          invoiceNo:   true,
          invoiceDate: true,
          total:       true,
          tax:         true,
          discount:    true,
          paidAmount:  true,
          status:      true,
        },
        orderBy: { invoiceDate: 'asc' },
      }),
      prisma.payment.findMany({
        where: {
          tenantId,
          receivedAt: { gte: fromDate, lte: toDate },
        },
        select: { amount: true, receivedAt: true },
      }),
    ]);

    // Build month-wise map
    const monthMap = new Map<string, PnlMonthEntry>();

    for (const inv of invoices) {
      const d      = inv.invoiceDate;
      const key    = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label  = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
      const rev    = round2(Number(inv.total));
      const tax    = round2(Number(inv.tax));
      const disc   = round2(Number(inv.discount ?? 0));
      const paid   = round2(Number(inv.paidAmount ?? 0));
      const outst  = round2(Math.max(0, rev - paid));

      const existing = monthMap.get(key);
      if (existing) {
        existing.invoiceCount++;
        existing.revenue      = round2(existing.revenue      + rev);
        existing.taxCollected = round2(existing.taxCollected + tax);
        existing.discounts    = round2(existing.discounts    + disc);
        existing.collected    = round2(existing.collected    + paid);
        existing.outstanding  = round2(existing.outstanding  + outst);
        existing.netRevenue   = round2(existing.netRevenue   + rev - disc);
      } else {
        monthMap.set(key, {
          month:        label,
          invoiceCount: 1,
          revenue:      rev,
          taxCollected: tax,
          discounts:    disc,
          collected:    paid,
          outstanding:  outst,
          netRevenue:   round2(rev - disc),
        });
      }
    }

    // Also add payment amounts that came in this period (may exceed invoiced)
    // (paidAmount on invoice already captures this for the matching invoices,
    //  but payments on older invoices would be missed — we note this as a data consideration)

    const months = [...monthMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);

    const totals = months.reduce(
      (acc, m) => ({
        invoiceCount: acc.invoiceCount + m.invoiceCount,
        revenue:      round2(acc.revenue      + m.revenue),
        taxCollected: round2(acc.taxCollected + m.taxCollected),
        discounts:    round2(acc.discounts    + m.discounts),
        collected:    round2(acc.collected    + m.collected),
        outstanding:  round2(acc.outstanding  + m.outstanding),
        netRevenue:   round2(acc.netRevenue   + m.netRevenue),
      }),
      { invoiceCount: 0, revenue: 0, taxCollected: 0, discounts: 0, collected: 0, outstanding: 0, netRevenue: 0 },
    );

    const collectionRate = totals.revenue > 0
      ? round2((totals.collected / totals.revenue) * 100)
      : 0;

    // Optional comparison period
    let comparison: PnlComparisonEntry[] | undefined;
    if (compareFrom && compareTo) {
      const prevReport = await this.getPnlReport(tenantId, compareFrom, compareTo);
      const curr = { ...totals, collectionRate };
      const prev = prevReport.totals;
      comparison = [
        { label: 'Revenue',       currentValue: curr.revenue,      previousValue: prev.revenue,      changePercent: pctChange(curr.revenue, prev.revenue) },
        { label: 'Collected',     currentValue: curr.collected,    previousValue: prev.collected,    changePercent: pctChange(curr.collected, prev.collected) },
        { label: 'Tax Collected', currentValue: curr.taxCollected, previousValue: prev.taxCollected, changePercent: pctChange(curr.taxCollected, prev.taxCollected) },
        { label: 'Discounts',     currentValue: curr.discounts,    previousValue: prev.discounts,    changePercent: pctChange(curr.discounts, prev.discounts) },
        { label: 'Outstanding',   currentValue: curr.outstanding,  previousValue: prev.outstanding,  changePercent: pctChange(curr.outstanding, prev.outstanding) },
      ];
    }

    logger.info(
      { tenantId, from: fromDate.toISOString(), to: toDate.toISOString(), months: months.length },
      'P&L report generated',
    );

    return {
      period:  { from: fromDate.toISOString(), to: toDate.toISOString() },
      months,
      comparison,
      totals:  { ...totals, collectionRate },
    };
  }
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return round2(((current - previous) / previous) * 100);
}

export const gstr1Service = new Gstr1Service();
