/**
 * ProductService — Unit Tests
 * All Prisma calls are patched on the live singleton — no real DB needed.
 * Framework: Node.js built-in test runner (node:test + assert/strict)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { productService } from '../modules/product/product.service';
import { prisma } from '../infrastructure/database';
import { patchMethod, restoreAll, makeProduct } from './helpers/fixtures';
import type { RestoreFn } from './helpers/fixtures';

// ── createProduct ──────────────────────────────────────────────────────────────

test('createProduct: creates product with valid data', async () => {
  const restores: RestoreFn[] = [];
  try {
    const mockProduct = makeProduct();
    restores.push(patchMethod(prisma.product as any, 'create', async () => mockProduct));

    const result = await productService.createProduct({ name: 'Butter', price: 50, stock: 100 });
    assert.equal(result.name, 'Butter');
    assert.equal(result.stock, 100);
  } finally {
    restoreAll(restores);
  }
});

test('createProduct: throws when name is empty', async () => {
  await assert.rejects(
    () => productService.createProduct({ name: '', price: 50, stock: 10 }),
    /name is required/i
  );
});

test('createProduct: throws when name is only whitespace', async () => {
  await assert.rejects(
    () => productService.createProduct({ name: '   ', price: 50, stock: 10 }),
    /name is required/i
  );
});

test('createProduct: throws when price is negative', async () => {
  await assert.rejects(
    () => productService.createProduct({ name: 'Milk', price: -10, stock: 5 }),
    /non-negative/i
  );
});

test('createProduct: allows zero price', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.product as any, 'create', async () => makeProduct({ price: { toString: () => '0' } })));
    const result = await productService.createProduct({ name: 'Sample', price: 0, stock: 10 });
    assert.ok(result !== null);
  } finally {
    restoreAll(restores);
  }
});

test('createProduct: throws when stock is negative', async () => {
  await assert.rejects(
    () => productService.createProduct({ name: 'Milk', price: 10, stock: -1 }),
    /non-negative integer/i
  );
});

test('createProduct: throws when stock is not an integer', async () => {
  await assert.rejects(
    () => productService.createProduct({ name: 'Milk', price: 10, stock: 1.5 }),
    /non-negative integer/i
  );
});

test('createProduct: sets default unit to "piece" when not provided', async () => {
  const restores: RestoreFn[] = [];
  try {
    const created: any[] = [];
    restores.push(patchMethod(prisma.product as any, 'create', async (args: any) => {
      created.push(args);
      return makeProduct();
    }));

    await productService.createProduct({ name: 'Butter', price: 50, stock: 10 });
    assert.equal(created[0]?.data?.unit, 'piece');
  } finally {
    restoreAll(restores);
  }
});

test('createProduct: respects provided unit', async () => {
  const restores: RestoreFn[] = [];
  try {
    const created: any[] = [];
    restores.push(patchMethod(prisma.product as any, 'create', async (args: any) => {
      created.push(args);
      return makeProduct({ unit: 'kg' });
    }));

    await productService.createProduct({ name: 'Rice', price: 60, stock: 50, unit: 'kg' });
    assert.equal(created[0]?.data?.unit, 'kg');
  } finally {
    restoreAll(restores);
  }
});

// ── getProductById ─────────────────────────────────────────────────────────────

test('getProductById: returns product when found', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.product as any, 'findUnique', async () => makeProduct()));

    const result = await productService.getProductById('prod-test-001');
    assert.ok(result !== null);
    assert.equal(result!.id, 'prod-test-001');
  } finally {
    restoreAll(restores);
  }
});

test('getProductById: returns null when not found', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.product as any, 'findUnique', async () => null));

    const result = await productService.getProductById('nonexistent');
    assert.equal(result, null);
  } finally {
    restoreAll(restores);
  }
});

// ── updateStock ────────────────────────────────────────────────────────────────

test('updateStock: adds quantity when operation is "add"', async () => {
  const restores: RestoreFn[] = [];
  try {
    const updated: any[] = [];
    restores.push(patchMethod(prisma.product as any, 'update', async (args: any) => {
      updated.push(args);
      return makeProduct({ stock: 110 });
    }));

    const result = await productService.updateStock('prod-001', 10, 'add');
    assert.equal(result.stock, 110);
    assert.ok(updated[0]?.data?.stock?.increment === 10);
  } finally {
    restoreAll(restores);
  }
});

test('updateStock: subtracts quantity when operation is "subtract"', async () => {
  const restores: RestoreFn[] = [];
  try {
    const updated: any[] = [];
    restores.push(patchMethod(prisma.product as any, 'update', async (args: any) => {
      updated.push(args);
      return makeProduct({ stock: 90 });
    }));

    const result = await productService.updateStock('prod-001', 10, 'subtract');
    assert.equal(result.stock, 90);
    assert.ok(updated[0]?.data?.stock?.decrement === 10);
  } finally {
    restoreAll(restores);
  }
});

// ── searchProducts ─────────────────────────────────────────────────────────────

test('searchProducts: returns matching products', async () => {
  const restores: RestoreFn[] = [];
  try {
    const products = [makeProduct({ name: 'Butter' }), makeProduct({ id: 'p2', name: 'Butter Milk' })];
    restores.push(patchMethod(prisma.product as any, 'findMany', async () => products));

    const results = await productService.searchProducts('Butter');
    assert.equal(results.length, 2);
  } finally {
    restoreAll(restores);
  }
});

test('searchProducts: returns empty array when no match', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.product as any, 'findMany', async () => []));

    const results = await productService.searchProducts('Zephyr');
    assert.equal(results.length, 0);
  } finally {
    restoreAll(restores);
  }
});

// ── getLowStockProducts ────────────────────────────────────────────────────────

test('getLowStockProducts: returns products with stock <= threshold', async () => {
  const restores: RestoreFn[] = [];
  try {
    const lowStock = [makeProduct({ stock: 2 }), makeProduct({ id: 'p2', stock: 4 })];
    restores.push(patchMethod(prisma.product as any, 'findMany', async () => lowStock));

    const results = await productService.getLowStockProducts(5);
    assert.equal(results.length, 2);
    assert.ok(results.every((p) => p.stock <= 5));
  } finally {
    restoreAll(restores);
  }
});

// ── getStock ──────────────────────────────────────────────────────────────────

test('getStock: returns stock count for matching product', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.product as any, 'findFirst', async () => ({ stock: 75 })));

    const stock = await productService.getStock('Butter');
    assert.equal(stock, 75);
  } finally {
    restoreAll(restores);
  }
});

test('getStock: returns 0 when product not found', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.product as any, 'findFirst', async () => null));

    const stock = await productService.getStock('Unknown Product');
    assert.equal(stock, 0);
  } finally {
    restoreAll(restores);
  }
});

// ── updatePrice ───────────────────────────────────────────────────────────────

test('updatePrice: updates product price and returns updated product', async () => {
  const restores: RestoreFn[] = [];
  try {
    restores.push(patchMethod(prisma.product as any, 'update', async () => makeProduct({ price: { toString: () => '75' } })));

    const result = await productService.updatePrice('prod-001', 75);
    assert.ok(result !== null);
  } finally {
    restoreAll(restores);
  }
});
