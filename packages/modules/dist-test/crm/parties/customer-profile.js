"use strict";
/**
 * CRM / Parties — customer operations.
 * Re-exports from the canonical flat domain file (crm/customer.ts).
 * Kept for backwards-compatibility with any existing imports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerCommPrefs = exports.upsertCustomerCommPrefs = exports.getTotalPending = exports.listOverdueCustomers = exports.listCustomers = exports.searchCustomers = exports.getCustomerBalance = exports.getCustomerById = exports.deleteCustomer = exports.updateCustomerBalance = exports.updateCustomer = exports.createCustomer = void 0;
var customer_1 = require("../customer");
Object.defineProperty(exports, "createCustomer", { enumerable: true, get: function () { return customer_1.createCustomer; } });
Object.defineProperty(exports, "updateCustomer", { enumerable: true, get: function () { return customer_1.updateCustomer; } });
Object.defineProperty(exports, "updateCustomerBalance", { enumerable: true, get: function () { return customer_1.updateCustomerBalance; } });
Object.defineProperty(exports, "deleteCustomer", { enumerable: true, get: function () { return customer_1.deleteCustomer; } });
Object.defineProperty(exports, "getCustomerById", { enumerable: true, get: function () { return customer_1.getCustomerById; } });
Object.defineProperty(exports, "getCustomerBalance", { enumerable: true, get: function () { return customer_1.getCustomerBalance; } });
Object.defineProperty(exports, "searchCustomers", { enumerable: true, get: function () { return customer_1.searchCustomers; } });
Object.defineProperty(exports, "listCustomers", { enumerable: true, get: function () { return customer_1.listCustomers; } });
Object.defineProperty(exports, "listOverdueCustomers", { enumerable: true, get: function () { return customer_1.listOverdueCustomers; } });
Object.defineProperty(exports, "getTotalPending", { enumerable: true, get: function () { return customer_1.getTotalPending; } });
Object.defineProperty(exports, "upsertCustomerCommPrefs", { enumerable: true, get: function () { return customer_1.upsertCustomerCommPrefs; } });
Object.defineProperty(exports, "getCustomerCommPrefs", { enumerable: true, get: function () { return customer_1.getCustomerCommPrefs; } });
//# sourceMappingURL=customer-profile.js.map