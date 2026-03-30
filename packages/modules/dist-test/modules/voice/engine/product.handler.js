"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeUpdateStock = executeUpdateStock;
/**
 * Product intent handlers.
 * Covers: UPDATE_STOCK
 */
const product_service_1 = require("../../product/product.service");
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
async function executeUpdateStock(entities) {
    const productQuery = entities.product || entities.productName || entities.name;
    const quantity = Number(entities.quantity);
    const unit = entities.unit;
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
    const matches = await product_service_1.productService.searchProducts(productQuery);
    if (matches.length === 0) {
        return {
            success: false,
            message: `'${productQuery}' product inventory mein nahi mila. Pehle product add karo.`,
            error: "PRODUCT_NOT_FOUND",
        };
    }
    // Pick the closest match — prefer exact (case-insensitive) first, else first result
    const product = matches.find((p) => p.name.toLowerCase() === productQuery.toLowerCase()) ??
        matches[0];
    const stockBefore = Number(product.stock);
    const updated = await product_service_1.productService.updateStock(product.id, quantity, "add");
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
//# sourceMappingURL=product.handler.js.map