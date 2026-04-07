/**
 * platform/pricing/industry-packs
 *
 * Feature: industry-specific feature packs — retail, pharma, restaurant, wholesale.
 */
export interface IndustryPack {
  id: string;
  name: string;
  industry:
    | "retail"
    | "pharma"
    | "restaurant"
    | "wholesale"
    | "manufacturing"
    | "services";
  extraFeatures: string[];
  additionalMonthlyPrice: number;
}

export async function listIndustryPacks(): Promise<IndustryPack[]> {
  return [];
}

export async function getTenantsActivePacks(
  _tenantId: string,
): Promise<IndustryPack[]> {
  return [];
}
