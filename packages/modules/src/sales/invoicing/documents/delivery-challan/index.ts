/**
 * sales/invoicing/documents/delivery-challan
 *
 * Feature: delivery challan — goods dispatch document without tax (loan/approval/job work).
 */
export interface DeliveryChallan {
  id: string;
  tenantId: string;
  customerId: string;
  items: Array<{ productId: string; qty: number }>;
  purpose: "sale-return" | "job-work" | "approval" | "loan" | "other";
  dispatchedAt?: string;
  status: "draft" | "dispatched" | "returned" | "converted";
  createdAt: string;
}

export async function createDeliveryChallan(
  _tenantId: string,
  _input: Omit<DeliveryChallan, "id" | "createdAt" | "status">,
): Promise<DeliveryChallan> {
  throw new Error("Not implemented");
}

export async function getDeliveryChallan(
  _id: string,
): Promise<DeliveryChallan | null> {
  return null;
}
