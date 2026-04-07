/**
 * finance/reconciliation/unmatched-review
 *
 * Feature: manual review of unmatched reconciliation items.
 */
export interface UnmatchedItem {
  id: string;
  tenantId: string;
  source: "bank" | "ledger";
  amount: number;
  date: string;
  description: string;
  status: "pending" | "ignored" | "resolved";
  resolvedAt?: string;
  resolvedBy?: string;
}

export async function listUnmatchedItems(
  _tenantId: string,
): Promise<UnmatchedItem[]> {
  return [];
}

export async function markItemIgnored(_itemId: string): Promise<void> {}

export async function resolveUnmatchedItem(
  _itemId: string,
  _resolutionNote: string,
): Promise<void> {}
