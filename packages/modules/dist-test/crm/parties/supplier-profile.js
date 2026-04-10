"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupplier = exports.getSupplierById = exports.listSuppliers = void 0;
/**
 * crm/parties/supplier-profile
 *
 * Feature: supplier / vendor party management from the CRM perspective.
 * Source of truth: purchases/vendors/supplier-profile.ts
 * Note: When full DDD separation is complete, suppliers become first-class CRM parties.
 */
var supplier_profile_1 = require("../../purchases/vendors/supplier-profile");
Object.defineProperty(exports, "listSuppliers", { enumerable: true, get: function () { return supplier_profile_1.listSuppliers; } });
Object.defineProperty(exports, "getSupplierById", { enumerable: true, get: function () { return supplier_profile_1.getSupplierById; } });
Object.defineProperty(exports, "createSupplier", { enumerable: true, get: function () { return supplier_profile_1.createSupplier; } });
//# sourceMappingURL=supplier-profile.js.map