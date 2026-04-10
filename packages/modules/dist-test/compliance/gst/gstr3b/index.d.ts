/**
 * compliance/gst/gstr3b
 *
 * Feature: GSTR-3B monthly summary return.
 * Derives figures from gstr1Service data.  Full submission flow is ⏳.
 */
export * from "./contracts/dto";
export { gstr1Service } from "../../gst/gstr1";
export declare function generateGstr3B(tenantId: string, period: string): Promise<import("./contracts/dto").Gstr3BReport>;
//# sourceMappingURL=index.d.ts.map