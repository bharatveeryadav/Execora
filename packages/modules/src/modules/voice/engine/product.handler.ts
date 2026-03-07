/**
 * Product intent handlers.
 * Covers: UPDATE_STOCK
 */
import { productService } from "../../product/product.service";
import type { ExecutionResult } from "@execora/types";

// ── UPDATE_STOCK ─────────────────────────────────────────────────────────────

/**
 * Handle inbound stock receipt voiced as:
 *   "50 kilo aata aaya", "100 Maggi stock mein add karo", "cheeni 2 bori aayi"
 *
 * entities:
 *   product  {string}  — product name (Roman/English, from LLM)
 *   quantity {number}  — how many units/kg/pcs arrived
 *   unit     {string?} — kg, pcs, litre, bori, dozen, etc. (informational only)
 */
export async function executeUpdateStock(
  entities: Record<string, any>,
): Promise<ExecutionResult> {
  const productQuery: string | undefined =
    entities.product || entities.productName || entities.name;
  const quantity = Number(entities.quantity);
  const unit: string | undefined = entities.unit;

  if (!productQuery?.trim()) {
    return {
      success: false,
      message: "Kaunsa product aaya? Product ka naam batao.",
      error: "MISSING_PRODUCT",
    };
  }

  if (!isFinite(quantity) || quantity <= 0) {
    return {
      success: false,
      message: `${productQuery} ka kitna stock aaya? Quantity batao.`,
      error: "MISSING_QUANTITY",
    };
  }

  // Find product by name (case-insensitive partial match)
  const matches = await productService.searchProducts(productQuery);
  if (matches.length === 0) {
    return {
      success: false,
      message: `'${productQuery}' product inventory mein nahi mila. Pehle product add karo.`,
      error: "PRODUCT_NOT_FOUND",
    };
  }

  // Pick the closest match — prefer exact (case-insensitive) first, else first result
  const product =
    matches.find((p) => p.name.toLowerCase() === productQuery.toLowerCase()) ??
    matches[0];

  const stockBefore = Number(product.stock);
  const updated = await productService.updateStock(product.id, quantity, "add");
  const stockAfter = Number(updated.stock);

  const unitLabel = unit ? ` ${unit}` : "";
  return {
    success: true,
    message: `✅ ${product.name} mein ${quantity}${unitLabel} add ho gaya. Ab total stock: ${stockAfter} (pehle tha: ${stockBefore}).`,
    data: {
      productId: product.id,
      productName: product.name,
      added: quantity,
      unit: unit || null,
      stockBefore,
      stockAfter,
    },
  };
}
