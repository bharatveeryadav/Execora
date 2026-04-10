"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerCommPrefs = exports.upsertCustomerCommPrefs = void 0;
/**
 * crm/communication/comm-preferences
 *
 * Feature: customer communication preferences — WhatsApp/email/SMS channel opt-in,
 * phone numbers, preferred language.
 * Owner: crm domain
 * Source of truth: crm/customer.ts (flat async functions)
 *
 * Write path: upsertCustomerCommPrefs
 * Read path:  getCustomerCommPrefs
 */
var customer_1 = require("../customer");
Object.defineProperty(exports, "upsertCustomerCommPrefs", { enumerable: true, get: function () { return customer_1.upsertCustomerCommPrefs; } });
Object.defineProperty(exports, "getCustomerCommPrefs", { enumerable: true, get: function () { return customer_1.getCustomerCommPrefs; } });
//# sourceMappingURL=comm-preferences.js.map