export interface resolveChannelPriceInput {
  tenantId: string;
}

export async function resolveChannelPrice(_input: resolveChannelPriceInput): Promise<{ ok: boolean }> {
  return { ok: false };
}
