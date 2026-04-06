"use strict";
/**
 * ProductService — Unit Tests
 * All Prisma calls are patched on the live singleton — no real DB needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const product_service_1 = require("../modules/product/product.service");
const core_1 = require("@execora/core");
const fixtures_1 = require("./helpers/fixtures");
// ── createProduct ──────────────────────────────────────────────────────────────
(0, node_test_1.default)('createProduct: creates product with valid data', async () => {
    const restores = [];
    try {
        const mockProduct = (0, fixtures_1.makeProduct)();
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'create', async () => mockProduct));
        const result = await product_service_1.productService.createProduct({ name: 'Butter', price: 50, stock: 100 });
        strict_1.default.equal(result.name, 'Butter');
        strict_1.default.equal(result.stock, 100);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('createProduct: throws when name is empty', async () => {
    await strict_1.default.rejects(() => product_service_1.productService.createProduct({ name: '', price: 50, stock: 10 }), /name is required/i);
});
(0, node_test_1.default)('createProduct: throws when name is only whitespace', async () => {
    await strict_1.default.rejects(() => product_service_1.productService.createProduct({ name: '   ', price: 50, stock: 10 }), /name is required/i);
});
(0, node_test_1.default)('createProduct: throws when price is negative', async () => {
    await strict_1.default.rejects(() => product_service_1.productService.createProduct({ name: 'Milk', price: -10, stock: 5 }), /non-negative/i);
});
(0, node_test_1.default)('createProduct: allows zero price', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'create', async () => (0, fixtures_1.makeProduct)({ price: { toString: () => '0' } })));
        const result = await product_service_1.productService.createProduct({ name: 'Sample', price: 0, stock: 10 });
        strict_1.default.ok(result !== null);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('createProduct: throws when stock is negative', async () => {
    await strict_1.default.rejects(() => product_service_1.productService.createProduct({ name: 'Milk', price: 10, stock: -1 }), /non-negative integer/i);
});
(0, node_test_1.default)('createProduct: throws when stock is not an integer', async () => {
    await strict_1.default.rejects(() => product_service_1.productService.createProduct({ name: 'Milk', price: 10, stock: 1.5 }), /non-negative integer/i);
});
(0, node_test_1.default)('createProduct: sets default unit to "piece" when not provided', async () => {
    const restores = [];
    try {
        const created = [];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'create', async (args) => {
            created.push(args);
            return (0, fixtures_1.makeProduct)();
        }));
        await product_service_1.productService.createProduct({ name: 'Butter', price: 50, stock: 10 });
        strict_1.default.equal(created[0]?.data?.unit, 'piece');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('createProduct: respects provided unit', async () => {
    const restores = [];
    try {
        const created = [];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'create', async (args) => {
            created.push(args);
            return (0, fixtures_1.makeProduct)({ unit: 'kg' });
        }));
        await product_service_1.productService.createProduct({ name: 'Rice', price: 60, stock: 50, unit: 'kg' });
        strict_1.default.equal(created[0]?.data?.unit, 'kg');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── getProductById ─────────────────────────────────────────────────────────────
(0, node_test_1.default)('getProductById: returns product when found', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'findFirst', async () => (0, fixtures_1.makeProduct)()));
        const result = await product_service_1.productService.getProductById('prod-test-001');
        strict_1.default.ok(result !== null);
        strict_1.default.equal(result.id, 'prod-test-001');
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('getProductById: returns null when not found', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'findFirst', async () => null));
        const result = await product_service_1.productService.getProductById('nonexistent');
        strict_1.default.equal(result, null);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── updateStock ────────────────────────────────────────────────────────────────
(0, node_test_1.default)('updateStock: adds quantity when operation is "add"', async () => {
    const restores = [];
    try {
        const updated = [];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'update', async (args) => {
            updated.push(args);
            return (0, fixtures_1.makeProduct)({ stock: 110 });
        }));
        const result = await product_service_1.productService.updateStock('prod-001', 10, 'add');
        strict_1.default.equal(result.stock, 110);
        strict_1.default.ok(updated[0]?.data?.stock?.increment === 10);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('updateStock: subtracts quantity when operation is "subtract"', async () => {
    const restores = [];
    try {
        const updated = [];
        // subtract path calls findFirst first to check stock availability
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'findFirst', async () => (0, fixtures_1.makeProduct)({ stock: 100 })));
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'update', async (args) => {
            updated.push(args);
            return (0, fixtures_1.makeProduct)({ stock: 90 });
        }));
        const result = await product_service_1.productService.updateStock('prod-001', 10, 'subtract');
        strict_1.default.equal(result.stock, 90);
        strict_1.default.ok(updated[0]?.data?.stock?.decrement === 10);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── searchProducts ─────────────────────────────────────────────────────────────
(0, node_test_1.default)('searchProducts: returns matching products', async () => {
    const restores = [];
    try {
        const products = [(0, fixtures_1.makeProduct)({ name: 'Butter' }), (0, fixtures_1.makeProduct)({ id: 'p2', name: 'Butter Milk' })];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'findMany', async () => products));
        const results = await product_service_1.productService.searchProducts('Butter');
        strict_1.default.equal(results.length, 2);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('searchProducts: returns empty array when no match', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'findMany', async () => []));
        const results = await product_service_1.productService.searchProducts('Zephyr');
        strict_1.default.equal(results.length, 0);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── getLowStockProducts ────────────────────────────────────────────────────────
(0, node_test_1.default)('getLowStockProducts: returns products with stock <= threshold', async () => {
    const restores = [];
    try {
        const rawRows = [
            { id: 'p1', name: 'Item A', category: 'cat', description: null, price: '100', unit: 'pcs', stock: 2, min_stock: 5, is_active: true, created_at: new Date(), updated_at: new Date() },
            { id: 'p2', name: 'Item B', category: 'cat', description: null, price: '200', unit: 'kg', stock: 4, min_stock: 5, is_active: true, created_at: new Date(), updated_at: new Date() },
        ];
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma, '$queryRaw', async () => rawRows));
        const results = await product_service_1.productService.getLowStockProducts();
        strict_1.default.equal(results.length, 2);
        strict_1.default.ok(results.every((p) => p.stock <= 5));
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── getStock ──────────────────────────────────────────────────────────────────
(0, node_test_1.default)('getStock: returns stock count for matching product', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'findFirst', async () => ({ stock: 75 })));
        const stock = await product_service_1.productService.getStock('Butter');
        strict_1.default.equal(stock, 75);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
(0, node_test_1.default)('getStock: returns 0 when product not found', async () => {
    const restores = [];
    try {
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'findFirst', async () => null));
        const stock = await product_service_1.productService.getStock('Unknown Product');
        strict_1.default.equal(stock, 0);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
// ── updatePrice ───────────────────────────────────────────────────────────────
(0, node_test_1.default)('updatePrice: updates product price and returns updated product', async () => {
    const restores = [];
    try {
        // updatePrice calls findFirst to verify the product exists, then update
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'findFirst', async () => (0, fixtures_1.makeProduct)()));
        restores.push((0, fixtures_1.patchMethod)(core_1.prisma.product, 'update', async () => (0, fixtures_1.makeProduct)({ price: { toString: () => '75' } })));
        const result = await product_service_1.productService.updatePrice('prod-001', 75);
        strict_1.default.ok(result !== null);
    }
    finally {
        (0, fixtures_1.restoreAll)(restores);
    }
});
//# sourceMappingURL=product.service.test.js.map