/**
 * GST Calculation Service — Indian GST compliance for Execora
 *
 * Rules implemented:
 *  - Intra-state supply  → CGST = SGST = gstRate / 2   (default for kirana)
 *  - Inter-state supply  → IGST = gstRate
 *  - GST-exempt products → 0 tax regardless of rate
 *  - Supply type is determined by comparing tenant state with customer state.
 *    Falls back to INTRASTATE when either state is unknown (safe for kirana stores
 *    that only sell locally).
 *
 * Common Indian GST slabs: 0%, 5%, 12%, 18%, 28%
 */

export type SupplyType = 'INTRASTATE' | 'INTERSTATE';

export interface GstLineItem {
  productName:  string;
  hsnCode:      string | null;
  quantity:     number;
  unitPrice:    number;      // price BEFORE tax (exclusive pricing)
  gstRate:      number;      // percentage, e.g. 5 or 18
  cessRate:     number;      // additional CESS %, usually 0
  isGstExempt:  boolean;

  // ── Calculated ──
  subtotal:     number;      // unitPrice × quantity
  cgst:         number;
  sgst:         number;
  igst:         number;
  cess:         number;
  totalTax:     number;
  total:        number;      // subtotal + totalTax
}

export interface GstInvoiceTotals {
  subtotal:    number;
  totalCgst:   number;
  totalSgst:   number;
  totalIgst:   number;
  totalCess:   number;
  totalTax:    number;
  grandTotal:  number;
  supplyType:  SupplyType;
}

class GstService {
  /**
   * Determine supply type.
   * Returns INTRASTATE unless both states are known AND different.
   */
  determineSupplyType(tenantState?: string | null, customerState?: string | null): SupplyType {
    if (!tenantState || !customerState) return 'INTRASTATE';
    return tenantState.trim().toLowerCase() === customerState.trim().toLowerCase()
      ? 'INTRASTATE'
      : 'INTERSTATE';
  }

  /**
   * Calculate GST for a single line item.
   * All monetary values rounded to 2 decimal places.
   */
  calculateLineItem(
    item: {
      productName:  string;
      hsnCode:      string | null;
      quantity:     number;
      unitPrice:    number;
      gstRate:      number;
      cessRate:     number;
      isGstExempt:  boolean;
    },
    supplyType: SupplyType = 'INTRASTATE'
  ): GstLineItem {
    const subtotal = round2(item.unitPrice * item.quantity);

    if (item.isGstExempt || item.gstRate === 0) {
      return {
        ...item,
        subtotal,
        cgst:     0,
        sgst:     0,
        igst:     0,
        cess:     0,
        totalTax: 0,
        total:    subtotal,
      };
    }

    const gstAmount  = round2(subtotal * item.gstRate  / 100);
    const cessAmount = round2(subtotal * item.cessRate / 100);

    let cgst = 0, sgst = 0, igst = 0;

    if (supplyType === 'INTERSTATE') {
      igst = gstAmount;
    } else {
      cgst = round2(gstAmount / 2);
      sgst = round2(gstAmount / 2);
    }

    const totalTax = cgst + sgst + igst + cessAmount;

    return {
      ...item,
      subtotal,
      cgst,
      sgst,
      igst,
      cess:     cessAmount,
      totalTax,
      total:    round2(subtotal + totalTax),
    };
  }

  /**
   * Calculate GST totals for all line items in an invoice.
   */
  calculateInvoiceTotals(
    lineItems: GstLineItem[]
  ): GstInvoiceTotals {
    const supplyType = lineItems.length > 0
      ? (lineItems[0].igst > 0 ? 'INTERSTATE' : 'INTRASTATE')
      : 'INTRASTATE';

    const totals = lineItems.reduce(
      (acc, item) => ({
        subtotal:   round2(acc.subtotal   + item.subtotal),
        totalCgst:  round2(acc.totalCgst  + item.cgst),
        totalSgst:  round2(acc.totalSgst  + item.sgst),
        totalIgst:  round2(acc.totalIgst  + item.igst),
        totalCess:  round2(acc.totalCess  + item.cess),
        grandTotal: round2(acc.grandTotal + item.total),
      }),
      { subtotal: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalCess: 0, grandTotal: 0 }
    );

    return {
      ...totals,
      totalTax: round2(totals.totalCgst + totals.totalSgst + totals.totalIgst + totals.totalCess),
      supplyType,
    };
  }

  /**
   * Format GST rate as a human-readable string.
   * e.g.  0 → "Exempt",  5 → "5%",  18 → "18%"
   */
  formatRate(rate: number, isExempt: boolean): string {
    if (isExempt || rate === 0) return 'Exempt';
    return `${rate}%`;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const gstService = new GstService();

// ── Common Indian GST slabs ──────────────────────────────────────────────────
export const GST_SLABS = [0, 5, 12, 18, 28] as const;

// ── HSN code → GST rate mapping for common kirana products ──────────────────
// Source: GST Council rate schedules (as of 2025)
export const KIRANA_GST_RATES: Record<string, { gstRate: number; description: string }> = {
  // Grains & flour — 0% (unbranded/unpackaged)
  '1001': { gstRate: 0,  description: 'Wheat and meslin' },
  '1006': { gstRate: 0,  description: 'Rice' },
  '1102': { gstRate: 0,  description: 'Cereal flour (atta, maida, besan)' },
  '1103': { gstRate: 0,  description: 'Suji / semolina' },
  '1104': { gstRate: 0,  description: 'Poha / flattened grains' },
  // Pulses — 0%
  '0713': { gstRate: 0,  description: 'Dried leguminous vegetables (dal, rajma, chana)' },
  // Sugar & sweeteners
  '1701': { gstRate: 5,  description: 'Cane/beet sugar (cheeni, shakkar)' },
  '1702': { gstRate: 5,  description: 'Jaggery (gur / khandsari)' },
  // Salt — 0%
  '2501': { gstRate: 0,  description: 'Salt (iodised / rock salt)' },
  // Oils — 5%
  '1511': { gstRate: 5,  description: 'Palm/coconut oil' },
  '1512': { gstRate: 5,  description: 'Sunflower/safflower oil' },
  '1514': { gstRate: 5,  description: 'Mustard/rapeseed oil' },
  '1507': { gstRate: 5,  description: 'Soyabean oil' },
  '1516': { gstRate: 5,  description: 'Vanaspati / hydrogenated fat' },
  // Ghee / butter — 12%
  '0405': { gstRate: 12, description: 'Butter, desi ghee, dairy spreads' },
  // Dairy — 5% for packaged; 0% for fresh/loose
  '0401': { gstRate: 0,  description: 'Milk, cream (fresh, not concentrated)' },
  '0403': { gstRate: 5,  description: 'Curd / yoghurt / dahi (packaged)' },
  '0406': { gstRate: 5,  description: 'Paneer / cottage cheese' },
  // Eggs — 0%
  '0407': { gstRate: 0,  description: 'Eggs (fresh)' },
  // Spices — 5%
  '0902': { gstRate: 5,  description: 'Tea / chai patti' },
  '0901': { gstRate: 5,  description: 'Coffee (not roasted or decaffeinated)' },
  '0904': { gstRate: 5,  description: 'Pepper (kali mirch)' },
  '0907': { gstRate: 5,  description: 'Cloves (lavang)' },
  '0908': { gstRate: 5,  description: 'Cardamom (elaichi)' },
  '0906': { gstRate: 5,  description: 'Cinnamon (dalchini)' },
  '0909': { gstRate: 5,  description: 'Seeds: jeera, ajwain, saunf, dhaniya' },
  '0910': { gstRate: 5,  description: 'Mixed spices / garam masala' },
  '0803': { gstRate: 0,  description: 'Dates (khajoor)' },
  // Biscuits, snacks, packaged food — 18% (branded)
  '1905': { gstRate: 18, description: 'Bread, biscuits, wafers, pastry (packaged/branded)' },
  '2106': { gstRate: 12, description: 'Namkeen, mixture, bhujia (packaged)' },
  '1902': { gstRate: 18, description: 'Pasta, noodles (Maggi), vermicelli' },
  // Cold drinks / beverages — 28% + CESS
  '2202': { gstRate: 28, description: 'Aerated water / cold drinks / soda' },
  '2201': { gstRate: 18, description: 'Packaged drinking water > 20L: 18%; ≤20L: 12%' },
  // Personal care / cleaning — 18%
  '3401': { gstRate: 18, description: 'Soap (bathing / washing / sabun)' },
  '3305': { gstRate: 18, description: 'Shampoo, hair oil' },
  '3306': { gstRate: 18, description: 'Toothpaste, oral hygiene' },
  '3304': { gstRate: 18, description: 'Skin cream, cosmetics (Fair & Lovely etc.)' },
  '3402': { gstRate: 18, description: 'Detergent, washing powder' },
  '3808': { gstRate: 18, description: 'Phenyl, floor cleaner, mosquito repellent' },
  // Matches — 12%
  '3605': { gstRate: 12, description: 'Matches / matchbox' },
  // Incense / agarbatti — 12%
  '3307': { gstRate: 12, description: 'Incense sticks (agarbatti)' },
  // Kerosene — 5%
  '2710': { gstRate: 5,  description: 'Petroleum products incl. kerosene' },
  // Dry fruits / nuts — 5%
  '0806': { gstRate: 5,  description: 'Grapes / raisins (kismis)' },
  '0801': { gstRate: 5,  description: 'Coconuts / nariyal' },
  '0802': { gstRate: 5,  description: 'Nuts — almonds, peanuts (badam, mungfali)' },
  '1207': { gstRate: 5,  description: 'Oil seeds — til (sesame), etc.' },
};
