#!/usr/bin/env node

/**
 * Phase 2 CI guardrail — forbidden-import boundary check
 *
 * Routes in packages/api/src/api/routes/ must NOT import from the legacy internal
 * service paths (packages/modules/src/modules/**), only from the public barrel
 * or extracted domain module paths.
 *
 * Any violation exits with code 1 so CI fails fast.
 *
 * Extracted modules currently wired (routes must use these instead):
 *   sales/invoicing/create-invoice  → invoice routes ✓
 *   crm/parties/customer-profile    → customer routes ✓
 *   inventory/stock/item-catalog    → product routes ✓
 */

import {
    readdir,
    readFile
} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const routesDir = path.join(repoRoot, 'packages/api/src/api/routes');

// Pattern: import anything from the legacy internal modules path
// e.g. '@execora/modules/src/modules/...' or relative '../../modules/...'
const FORBIDDEN_PATTERNS = [
    // Absolute sub-path imports into legacy internals
    /@execora\/modules\/src\/modules\//,
    /@execora\/modules\/src\/providers\//,
    // Relative imports crossing into packages/modules internal paths
    /from ['"].*packages\/modules\/src\/modules\//,
    /from ['"].*packages\/modules\/src\/providers\//,
];

// Route files for extracted modules must NOT reference the legacy service instance directly
// (they should call the extracted adapters instead)
const EXTRACTED_ROUTES = {
    'invoice.routes.ts': {
        required: ['createInvoiceCommand'],
        forbidden: ['invoiceService.createInvoice'],
    },
    'customer.routes.ts': {
        required: ['createCustomerCommand'],
        forbidden: ['customerService.'],
    },
    'product.routes.ts': {
        required: ['createProductCommand'],
        forbidden: ['productService.'],
    },
};

async function main() {
    const files = (await readdir(routesDir)).filter((f) => f.endsWith('.routes.ts'));
    const violations = [];

    for (const file of files) {
        const fullPath = path.join(routesDir, file);
        const source = await readFile(fullPath, 'utf-8');

        // Check for forbidden import patterns
        for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(source)) {
                violations.push(`${file}: forbidden import matching ${pattern}`);
            }
        }

        // Check extracted route constraints
        const constraints = EXTRACTED_ROUTES[file];
        if (constraints) {
            for (const required of constraints.required ?? []) {
                if (!source.includes(required)) {
                    violations.push(`${file}: must use extracted adapter "${required}"`);
                }
            }
            for (const forbidden of constraints.forbidden ?? []) {
                if (source.includes(forbidden)) {
                    violations.push(`${file}: must not call legacy service directly ("${forbidden}")`);
                }
            }
        }
    }

    if (violations.length > 0) {
        console.error('[import-boundary] FAIL — boundary violations found:');
        violations.forEach((v) => console.error(`  ✗ ${v}`));
        process.exit(1);
    }

    console.log(`[import-boundary] OK — ${files.length} route files checked, 0 violations`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});