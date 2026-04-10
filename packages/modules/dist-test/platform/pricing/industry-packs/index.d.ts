/**
 * platform/pricing/industry-packs
 *
 * Feature: industry-specific feature packs — retail, pharma, restaurant, wholesale.
 */
export interface IndustryPack {
    id: string;
    name: string;
    industry: "retail" | "pharma" | "restaurant" | "wholesale" | "manufacturing" | "services";
    extraFeatures: string[];
    additionalMonthlyPrice: number;
}
export declare function listIndustryPacks(): Promise<IndustryPack[]>;
export declare function getTenantsActivePacks(_tenantId: string): Promise<IndustryPack[]>;
//# sourceMappingURL=index.d.ts.map