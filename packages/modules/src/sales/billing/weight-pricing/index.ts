export interface calculateWeightPriceInput {
  tenantId: string;
}

export async function calculateWeightPrice(_input: calculateWeightPriceInput): Promise<{ ok: boolean }> {
  return { ok: false };
}
