/**
 * crm/parties/supplier-profile
 *
 * Feature: supplier / vendor party management from the CRM perspective.
 * Source of truth: purchases/vendors/supplier-profile.ts
 * Note: When full DDD separation is complete, suppliers become first-class CRM parties.
 */
export { listSuppliers, getSupplierById, createSupplier, } from "../../purchases/vendors/supplier-profile";
export type { CreateSupplierInput, SupplierRecord, } from "../../purchases/vendors/types";
//# sourceMappingURL=supplier-profile.d.ts.map